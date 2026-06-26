from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, field_validator
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import random
import string
import csv
import io
import httpx
import mimetypes
from pathlib import Path


def _normalize_env_list(value: str) -> list[str]:
    return [item.strip().strip('"').strip("'") for item in value.split(',') if item.strip()]

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

def _normalize_env_list(value: str) -> list[str]:
    return [item.strip().strip('"').strip("'") for item in value.split(',') if item.strip()]

raw_cors = os.environ.get('CORS_ORIGINS', ','.join(DEFAULT_CORS_ORIGINS))
CORS_ORIGINS = _normalize_env_list(raw_cors)
if len(CORS_ORIGINS) == 1 and CORS_ORIGINS[0] == '*':
    CORS_ORIGINS = DEFAULT_CORS_ORIGINS.copy()

COOKIE_SAMESITE = os.environ.get('COOKIE_SAMESITE', 'none').strip().strip('"').strip("'").lower()
if COOKIE_SAMESITE not in {'lax', 'strict', 'none'}:
    COOKIE_SAMESITE = 'none'

COOKIE_SECURE_ENV = os.environ.get('COOKIE_SECURE')
if COOKIE_SECURE_ENV is None:
    COOKIE_SECURE = None
else:
    COOKIE_SECURE = str(COOKIE_SECURE_ENV).strip().strip('"').strip("'").lower() == 'true'

# If running over HTTPS, use secure cookies. For local HTTP dev, disable secure so browsers can store cookies.
def _cookie_secure_for_request(request: Request) -> bool:
    if COOKIE_SECURE is not None:
        return COOKIE_SECURE
    return request.url.scheme == 'https'

# Sessions stored in MongoDB 'sessions' collection
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# Permanent system owner — cannot be removed or lose admin access
OWNER_EMAIL = "harishragavkumars@gmail.com"

# Default approved admin emails — seeded on startup
DEFAULT_APPROVED_ADMINS = [
    OWNER_EMAIL,
    "harish@gmail.com",
    "cr1@gmail.com",
    "cr2@gmail.com",
]

VALID_RESOURCE_CATEGORIES = [
    'Notes',
    'PYQs',
    'Important Questions',
    'Assignments',
    'Lab Manuals',
    'Practical Files',
    'PPTs',
    'Books',
    'Syllabus',
    'Question Bank',
    'Others',
]

ALLOWED_RESOURCE_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip'
}

PREVIEWABLE_MIME_TYPES = {
    'application/pdf',
    'image/png',
    'image/jpeg'
}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===========================
# Pydantic Models
# ===========================

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class GoogleSessionRequest(BaseModel):
    session_id: str

class StudentLogin(BaseModel):
    roll_number: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

class ClassCreate(BaseModel):
    name: str
    code: str
    periods_per_day: int

    @field_validator('periods_per_day')
    @classmethod
    def validate_periods(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Periods per day must be between 1 and 10')
        return v

class StudentAdd(BaseModel):
    name: str
    roll_number: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

class JoinClassRequest(BaseModel):
    join_code: str
    name: str
    roll_number: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

    @field_validator('join_code')
    @classmethod
    def uppercase_code(cls, v):
        return v.strip().upper()

class AttendanceCreate(BaseModel):
    class_id: str
    date: str
    period_number: int
    records: List[dict]

    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class AttendanceEdit(BaseModel):
    class_id: str
    date: str
    period_number: int
    records: List[dict]

    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

class ClassRename(BaseModel):
    name: str

class ResourceSubjectCreate(BaseModel):
    name: str

class ResourceSubjectRename(BaseModel):
    name: str

class ResourceUploadMeta(BaseModel):
    subject_id: str
    category: Literal[
        'Notes', 'PYQs', 'Important Questions', 'Assignments',
        'Lab Manuals', 'Practical Files', 'PPTs', 'Books', 'Syllabus',
        'Question Bank', 'Others'
    ]
    displayName: Optional[str] = None

class ResourceRename(BaseModel):
    displayName: str

class AnnouncementCreate(BaseModel):
    class_id: str
    title: str
    message: str

class JoinLinkUpdate(BaseModel):
    action: str  # "enable", "disable", "regenerate"

class StudentEdit(BaseModel):
    name: str
    roll_number: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

# ===========================
# Helper Functions
# ===========================

def generate_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def ensure_unique_join_code():
    while True:
        code = generate_join_code()
        existing = await db.classes.find_one({"join_code": code}, {"_id": 0})
        if not existing:
            return code

async def get_current_admin(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session or session["role"] != "admin":
        raise HTTPException(status_code=401, detail="Admin authentication required")
    admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
    if not admin:
        await db.sessions.delete_one({"session_id": session["session_id"]})
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

async def get_current_student(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session or session["role"] != "student":
        raise HTTPException(status_code=401, detail="Student authentication required")
    student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
    if not student:
        await db.sessions.delete_one({"session_id": session["session_id"]})
        raise HTTPException(status_code=401, detail="Student not found")
    return student


async def _get_admin_class(class_id: str, admin_id: str) -> dict | None:
    return await db.classes.find_one({"id": class_id, "admin_id": admin_id}, {"_id": 0})

def _get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip('.')

def _sanitize_filename(filename: str) -> str:
    return Path(filename).name

async def _ensure_resource_storage_dir():
    storage_dir = ROOT_DIR / 'resource_storage'
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir

async def _validate_resource_category(category: str) -> bool:
    return category in VALID_RESOURCE_CATEGORIES

async def _get_resource_subject(subject_id: str, admin_id: Optional[str] = None) -> dict | None:
    query = {"id": subject_id}
    # Global resources are editable by any authenticated admin; subjects are shared
    return await db.resource_subjects.find_one(query, {"_id": 0})

async def _get_resource(resource_id: str, admin_id: Optional[str] = None) -> dict | None:
    query = {"id": resource_id}
    if admin_id:
        query["admin_id"] = admin_id
    return await db.resources.find_one(query, {"_id": 0})

async def _build_resource_response(resource: dict) -> dict:
    subject = await db.resource_subjects.find_one({"id": resource["subject_id"]}, {"_id": 0, "name": 1})
    return {
        "id": resource["id"],
        "filename": resource["filename"],
        "displayName": resource.get("displayName") or resource["filename"],
        "subjectId": resource["subject_id"],
        "subjectName": subject["name"] if subject else "Unknown",
        "category": resource["category"],
        "fileType": resource["fileType"],
        "mimeType": resource["mimeType"],
        "fileSize": resource["fileSize"],
        "uploadedBy": resource["uploadedBy"],
        "uploadedAt": resource["uploadedAt"],
        "lastUpdated": resource["lastUpdated"],
        "downloadCount": resource.get("downloadCount", 0),
        "previewable": resource["mimeType"] in PREVIEWABLE_MIME_TYPES,
    }

async def _get_admin_student(student_id: str, admin_id: str) -> dict | None:
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        return None
    cls = await db.classes.find_one({"id": student["class_id"], "admin_id": admin_id}, {"_id": 0})
    if not cls:
        return None
    return student

async def _get_valid_session(request: Request) -> dict | None:
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    session = await db.sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return None
    if session.get("expires_at"):
        expires = session["expires_at"]
        now = datetime.now(timezone.utc)
        # Handle both naive and aware datetimes from MongoDB
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            await db.sessions.delete_one({"session_id": session_id})
            return None
    return session

async def _create_student_notification(
    student_id: str,
    class_id: str,
    title: str,
    message: str,
    type: str = 'info',
    link: Optional[str] = None,
):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "student_id": student_id,
        "class_id": class_id,
        "title": title,
        "message": message,
        "type": type,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

async def _create_attendance_notifications(records: list[dict], class_name: str, edit_mode: bool = False):
    notifications = []
    for record in records:
        status = record.get("status")
        period = record.get("period_number")
        date = record.get("date")
        if status not in {"Present", "Absent", "OD"}:
            continue

        if edit_mode:
            title = "Attendance updated"
            message = f"Your attendance for {class_name} on {date}, period {period} was updated to {status}."
        else:
            title = "Attendance recorded"
            if status == "Absent":
                title = "Marked absent"
            elif status == "OD":
                title = "Marked on duty"
            message = f"Your attendance for {class_name} on {date}, period {period} is {status}."

        notifications.append({
            "id": str(uuid.uuid4()),
            "student_id": record["student_id"],
            "class_id": record["class_id"],
            "title": title,
            "message": message,
            "type": "info",
            "link": None,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if notifications:
        await db.notifications.insert_many(notifications)

async def _create_announcement_notifications(class_id: str, title: str, message: str):
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    if not students:
        return

    announcement_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    announcement_doc = {
        "id": announcement_id,
        "class_id": class_id,
        "title": title,
        "message": message,
        "type": "announcement",
        "created_at": created_at,
    }
    await db.announcements.insert_one(announcement_doc)

    notifications = []
    for student in students:
        notifications.append({
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "class_id": class_id,
            "title": title,
            "message": message,
            "type": "announcement",
            "link": None,
            "read": False,
            "created_at": created_at,
        })

    if notifications:
        await db.notifications.insert_many(notifications)

# ===========================
# Seed Admin on Startup
# ===========================

@app.on_event("startup")
async def startup():
    # Seed approved admin emails
    for email in DEFAULT_APPROVED_ADMINS:
        existing = await db.approved_admins.find_one({"email": email}, {"_id": 0})
        if not existing:
            await db.approved_admins.insert_one({
                "email": email,
                "is_owner": email == OWNER_EMAIL,
                "added_at": datetime.now(timezone.utc).isoformat()
            })
    # Ensure owner is always present and permanently flagged as owner
    await db.approved_admins.update_one(
        {"email": OWNER_EMAIL},
        {"$set": {"email": OWNER_EMAIL, "is_owner": True},
         "$setOnInsert": {"added_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    logger.info(f"Approved admin emails seeded: {len(DEFAULT_APPROVED_ADMINS)}; owner={OWNER_EMAIL}")

    # Session indexes
    await db.sessions.create_index("session_id", unique=True)
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)
    # Approved admins index
    await db.approved_admins.create_index("email", unique=True)
    # Admins index
    await db.admins.create_index("email", unique=True)
    await db.admins.create_index("id", unique=True)
    # Resource subject indexes
    await db.resource_subjects.create_index("id", unique=True)
    await db.resource_subjects.create_index([("admin_id", 1), ("name", 1)], unique=True)
    # Resource indexes
    await db.resources.create_index("id", unique=True)
    await db.resources.create_index([("subject_id", 1), ("category", 1)])
    logger.info("Indexes ensured")

# ===========================
# Auth Endpoints
# ===========================

@api_router.post("/auth/google-session")
async def google_session(request: Request, req: GoogleSessionRequest, response: Response):
    """Exchange Emergent Auth session_id for a local admin session"""
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": req.session_id},
                timeout=10.0
            )
            if res.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google session")
            google_data = res.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to verify Google session")

    email = google_data.get("email", "").lower()
    name = google_data.get("name", "")
    picture = google_data.get("picture", "")

    print("GOOGLE EMAIL:", email)
    print("OWNER EMAIL:", OWNER_EMAIL)

    # Owner always passes; otherwise check approved admin list
    is_owner = email == OWNER_EMAIL
    if not is_owner:
        approved = await db.approved_admins.find_one({"email": email}, {"_id": 0})
        if not approved:
            return APIResponse(
                success=False,
                message="Access Denied. Your email is not approved for admin access."
            ).model_dump()

    # Upsert admin record atomically (race-safe; email has a unique index)
    admin_id = str(uuid.uuid4())
    result = await db.admins.find_one_and_update(
        {"email": email},
        {
            "$set": {"name": name, "picture": picture, "role": "admin"},
            "$setOnInsert": {
                "id": admin_id,
                "email": email,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0},
    )
    admin_id = result["id"]

    # Create persistent session
    session_id = str(uuid.uuid4())
    await db.sessions.insert_one({
        "session_id": session_id,
        "role": "admin",
        "user_id": admin_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=_cookie_secure_for_request(request),
        path="/",
        max_age=7 * 86400
    )
    return APIResponse(
        success=True,
        message="Login successful",
        data={
            "id": admin_id,
            "name": name,
            "email": email,
            "picture": picture,
            "role": "admin",
            "is_owner": is_owner
        }
    ).model_dump()

@api_router.post("/auth/student-login")
async def student_login(request: Request, login_data: StudentLogin, response: Response):
    candidates = await db.students.find({"roll_number": login_data.roll_number}, {"_id": 0}).to_list(100)
    if not candidates:
        raise HTTPException(status_code=401, detail="Roll number not found. Please register first.")

    if len(candidates) == 1:
        student = candidates[0]
    else:
        # Same roll number exists in multiple student records (e.g. the student was
        # added to more than one class / a duplicate class). Resolve to the record
        # that actually owns attendance so the dashboard reflects real data, instead
        # of an arbitrary natural-order pick that may point to an empty record.
        ranked = []
        for c in candidates:
            count = await db.attendance.count_documents({"student_id": c["id"]})
            ranked.append((count, c.get("added_at", ""), c))
        ranked.sort(key=lambda t: (t[0], t[1]), reverse=True)
        student = ranked[0][2]

    class_doc = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})

    session_id = str(uuid.uuid4())
    await db.sessions.insert_one({
        "session_id": session_id,
        "role": "student",
        "user_id": student["id"],
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
    })
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=_cookie_secure_for_request(request),
        path="/",
        max_age=86400
    )
    return APIResponse(
        success=True,
        message="Login successful",
        data={
            "id": student["id"],
            "name": student["name"],
            "roll_number": student["roll_number"],
            "class_id": student["class_id"],
            "class_name": class_doc["name"] if class_doc else "Unknown",
            "periods_per_day": class_doc.get("periods_per_day", 0) if class_doc else 0,
            "role": "student"
        }
    ).model_dump()

@api_router.get("/auth/me")
async def get_me(request: Request):
    session = await _get_valid_session(request)
    print("AUTH ME SESSION:", session)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if session["role"] == "admin":
        admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
        if not admin:
            await db.sessions.delete_one({"session_id": session["session_id"]})
            raise HTTPException(status_code=401, detail="Admin not found")
        return APIResponse(
            success=True,
            message="Authenticated",
            data={
                "id": admin["id"],
                "name": admin["name"],
                "email": admin["email"],
                "picture": admin.get("picture", ""),
                "role": "admin",
                "is_owner": admin["email"] == OWNER_EMAIL
            }
        ).model_dump()

    if session["role"] == "student":
        student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
        if not student:
            await db.sessions.delete_one({"session_id": session["session_id"]})
            raise HTTPException(status_code=401, detail="Student not found")
        class_doc = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})
        return APIResponse(
            success=True,
            message="Authenticated",
            data={
                "id": student["id"],
                "name": student["name"],
                "roll_number": student["roll_number"],
                "class_id": student["class_id"],
                "class_name": class_doc["name"] if class_doc else "Unknown",
                "periods_per_day": class_doc.get("periods_per_day", 0) if class_doc else 0,
                "role": "student"
            }
        ).model_dump()

    raise HTTPException(status_code=401, detail="Not authenticated")

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        await db.sessions.delete_one({"session_id": session_id})
    response.delete_cookie("session_id", samesite=COOKIE_SAMESITE, secure=_cookie_secure_for_request(request), path="/")
    return APIResponse(success=True, message="Logged out").model_dump()

# ===========================
# Approved Admin Emails
# ===========================

@api_router.get("/auth/approved-admins")
async def list_approved_admins(request: Request):
    current = await get_current_admin(request)
    admins = await db.approved_admins.find({}, {"_id": 0}).to_list(1000)
    for a in admins:
        a["is_owner"] = a.get("email") == OWNER_EMAIL
    # Sort owner first, then alphabetically
    admins.sort(key=lambda a: (not a["is_owner"], a.get("email", "")))
    return APIResponse(
        success=True,
        message="Approved admins",
        data={"emails": admins, "owner_email": OWNER_EMAIL, "current_email": current.get("email")}
    ).model_dump()

@api_router.post("/auth/approved-admins")
async def add_approved_admin(request: Request):
    await get_current_admin(request)
    body = await request.json()
    email = body.get("email", "").strip().lower()
    if not email:
        return APIResponse(success=False, message="Email is required").model_dump()
    existing = await db.approved_admins.find_one({"email": email}, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Email already approved").model_dump()
    await db.approved_admins.insert_one({
        "email": email,
        "is_owner": email == OWNER_EMAIL,
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    return APIResponse(success=True, message=f"{email} approved").model_dump()

@api_router.delete("/auth/approved-admins/{email}")
async def remove_approved_admin(email: str, request: Request):
    await get_current_admin(request)
    email = email.lower()
    # Owner is permanently protected and can never be removed
    if email == OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The owner account is protected and cannot be removed.")
    result = await db.approved_admins.delete_one({"email": email})
    if result.deleted_count == 0:
        return APIResponse(success=False, message="Email not found").model_dump()
    return APIResponse(success=True, message=f"{email} removed").model_dump()

# ===========================
# Class Endpoints (Admin Protected)
# ===========================

@api_router.post("/classes")
async def create_class(class_data: ClassCreate, request: Request):
    admin = await get_current_admin(request)
    existing = await db.classes.find_one({"code": class_data.code}, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Class code already exists").model_dump()

    join_code = await ensure_unique_join_code()
    class_doc = {
        "id": str(uuid.uuid4()),
        "name": class_data.name,
        "code": class_data.code,
        "periods_per_day": class_data.periods_per_day,
        "join_code": join_code,
        "join_enabled": True,
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.classes.insert_one(class_doc)

    return APIResponse(
        success=True,
        message="Class created successfully",
        data={
            "id": class_doc["id"],
            "name": class_doc["name"],
            "code": class_doc["code"],
            "periods_per_day": class_doc["periods_per_day"],
            "join_code": join_code,
            "join_enabled": True,
            "admin_id": admin["id"],
            "created_at": class_doc["created_at"]
        }
    ).model_dump()

@api_router.get("/classes")
async def list_classes(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"]}, {"_id": 0}).to_list(1000)
    # Add student count for each class
    for cls in classes:
        count = await db.students.count_documents({"class_id": cls["id"]})
        cls["student_count"] = count
    return APIResponse(success=True, message="Classes retrieved", data={"classes": classes}).model_dump()

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, request: Request):
    admin = await get_current_admin(request)
    result = await db.classes.delete_one({"id": class_id, "admin_id": admin["id"]})
    if result.deleted_count == 0:
        return APIResponse(success=False, message="Class not found").model_dump()
    await db.students.delete_many({"class_id": class_id})
    await db.attendance.delete_many({"class_id": class_id})
    return APIResponse(success=True, message="Class deleted").model_dump()

# ===========================
# Resource Management Endpoints
# ===========================

class ResourceSubjectCreate(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def normalize_name(cls, v):
        return v.strip()

class ResourceSubjectRename(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def normalize_name(cls, v):
        return v.strip()

class ResourceRename(BaseModel):
    displayName: str

    @field_validator('displayName')
    @classmethod
    def normalize_display_name(cls, v):
        return v.strip()

@api_router.post("/resources/subjects")
async def create_resource_subject(subject: ResourceSubjectCreate, request: Request):
    await get_current_admin(request)
    if not subject.name:
        return APIResponse(success=False, message="Subject name is required").model_dump()
    existing = await db.resource_subjects.find_one({"name": subject.name}, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Subject already exists").model_dump()
    subject_doc = {
        "id": str(uuid.uuid4()),
        "name": subject.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.resource_subjects.insert_one(subject_doc)
    return APIResponse(success=True, message="Subject created", data={"subject": subject_doc}).model_dump()

@api_router.get("/resources/subjects")
async def list_resource_subjects(request: Request):
    await _get_valid_session(request)
    subjects = await db.resource_subjects.find({}, {"_id": 0}).to_list(1000)
    for subj in subjects:
        subj["categories"] = VALID_RESOURCE_CATEGORIES
        subj["resource_count"] = await db.resources.count_documents({"subject_id": subj["id"]})
    subjects.sort(key=lambda x: x["name"])
    return APIResponse(success=True, message="Resource subjects retrieved", data={"subjects": subjects}).model_dump()

@api_router.put("/resources/subjects/{subject_id}/rename")
async def rename_resource_subject(subject_id: str, body: ResourceSubjectRename, request: Request):
    await get_current_admin(request)
    if not body.name:
        return APIResponse(success=False, message="Subject name is required").model_dump()
    subject = await db.resource_subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        return APIResponse(success=False, message="Subject not found").model_dump()
    duplicate = await db.resource_subjects.find_one({"name": body.name, "id": {"$ne": subject_id}}, {"_id": 0})
    if duplicate:
        return APIResponse(success=False, message="Another subject with this name already exists").model_dump()
    await db.resource_subjects.update_one({"id": subject_id}, {"$set": {"name": body.name, "updated_at": datetime.now(timezone.utc).isoformat()}})
    await db.resources.update_many({"subject_id": subject_id}, {"$set": {"subject_name": body.name}})
    return APIResponse(success=True, message="Subject renamed").model_dump()

@api_router.delete("/resources/subjects/{subject_id}")
async def delete_resource_subject(subject_id: str, request: Request):
    await get_current_admin(request)
    result = await db.resource_subjects.delete_one({"id": subject_id})
    if result.deleted_count == 0:
        return APIResponse(success=False, message="Subject not found").model_dump()
    resources = await db.resources.find({"subject_id": subject_id}, {"_id": 0}).to_list(1000)
    for resource in resources:
        file_path = Path(resource.get("file_path", ""))
        if file_path.exists():
            file_path.unlink()
    await db.resources.delete_many({"subject_id": subject_id})
    return APIResponse(success=True, message="Subject deleted").model_dump()

@api_router.get("/resources/categories")
async def list_resource_categories(request: Request):
    await _get_valid_session(request)
    return APIResponse(success=True, message="Resource categories retrieved", data={"categories": VALID_RESOURCE_CATEGORIES}).model_dump()

@api_router.get("/resources")
async def list_resources(request: Request, subject_id: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None):
    await _get_valid_session(request)
    query = {}
    if subject_id:
        query["subject_id"] = subject_id
    if category:
        query["category"] = category
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"displayName": regex},
            {"filename": regex},
            {"category": regex},
            {"subject_name": regex},
        ]
    resources = await db.resources.find(query, {"_id": 0}).to_list(1000)
    return APIResponse(success=True, message="Resources retrieved", data={"resources": [await _build_resource_response(r) for r in resources]}).model_dump()

@api_router.get("/resources/{resource_id}")
async def get_resource_metadata(resource_id: str, request: Request):
    await _get_valid_session(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return APIResponse(success=True, message="Resource retrieved", data={"resource": await _build_resource_response(resource)}).model_dump()

@api_router.get("/resources/{resource_id}/download")
async def download_resource(resource_id: str, request: Request):
    await _get_valid_session(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    file_path = Path(resource.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Resource file not found")
    await db.resources.update_one({"id": resource_id}, {"$inc": {"downloadCount": 1}})
    return FileResponse(
        path=file_path,
        media_type=resource.get("mimeType", "application/octet-stream"),
        filename=resource.get("filename"),
        headers={"Content-Disposition": f'attachment; filename="{resource.get("filename")}"'}
    )

@api_router.get("/resources/{resource_id}/preview")
async def preview_resource(resource_id: str, request: Request):
    await _get_valid_session(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.get("mimeType") not in PREVIEWABLE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Preview not supported for this file type")
    file_path = Path(resource.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Resource file not found")
    return FileResponse(
        path=file_path,
        media_type=resource.get("mimeType", "application/octet-stream"),
        filename=resource.get("filename"),
        headers={"Content-Disposition": f'inline; filename="{resource.get("filename")}"'}
    )

@api_router.post("/resources/subjects/{subject_id}/resources")
async def upload_resource(request: Request, subject_id: str, category: str = Form(...), displayName: Optional[str] = Form(None), file: UploadFile = File(...)):
    admin = await get_current_admin(request)
    if not await _validate_resource_category(category):
        return APIResponse(success=False, message="Invalid resource category").model_dump()
    subject = await db.resource_subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        return APIResponse(success=False, message="Subject not found").model_dump()
    filename = _sanitize_filename(file.filename)
    ext = _get_file_extension(filename)
    if ext not in ALLOWED_RESOURCE_EXTENSIONS:
        return APIResponse(success=False, message="Unsupported file type").model_dump()
    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    resource_id = str(uuid.uuid4())
    storage_dir = await _ensure_resource_storage_dir()
    subject_dir = storage_dir / subject_id
    subject_dir.mkdir(parents=True, exist_ok=True)
    disk_name = f"{resource_id}.{ext}"
    disk_path = subject_dir / disk_name
    contents = await file.read()
    with open(disk_path, "wb") as f:
        f.write(contents)
    resource_doc = {
        "id": resource_id,
        "filename": filename,
        "displayName": displayName.strip() if displayName and displayName.strip() else filename,
        "subject_id": subject_id,
        "subject_name": subject["name"],
        "category": category,
        "fileType": ext,
        "mimeType": mime_type,
        "fileSize": len(contents),
        "uploadedBy": admin.get("email", admin.get("name", "admin")),
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "downloadCount": 0,
        "file_path": str(disk_path),
    }
    await db.resources.insert_one(resource_doc)
    return APIResponse(success=True, message="Resource uploaded", data={"resource": await _build_resource_response(resource_doc)}).model_dump()

@api_router.put("/resources/{resource_id}/replace")
async def replace_resource(request: Request, resource_id: str, file: UploadFile = File(...)):
    await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    filename = _sanitize_filename(file.filename)
    ext = _get_file_extension(filename)
    if ext not in ALLOWED_RESOURCE_EXTENSIONS:
        return APIResponse(success=False, message="Unsupported file type").model_dump()
    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    storage_dir = await _ensure_resource_storage_dir()
    subject_dir = Path(resource.get("file_path", "")).parent
    subject_dir.mkdir(parents=True, exist_ok=True)
    disk_name = f"{resource_id}.{ext}"
    disk_path = subject_dir / disk_name
    old_file_path = Path(resource.get("file_path", ""))
    contents = await file.read()
    if old_file_path.exists() and old_file_path != disk_path:
        old_file_path.unlink()
    with open(disk_path, "wb") as f:
        f.write(contents)
    display_name = resource.get("displayName") or resource.get("filename")
    if display_name == resource.get("filename"):
        display_name = filename
    await db.resources.update_one(
        {"id": resource_id},
        {
            "$set": {
                "filename": filename,
                "displayName": display_name,
                "fileType": ext,
                "mimeType": mime_type,
                "fileSize": len(contents),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "file_path": str(disk_path),
            }
        }
    )
    updated = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    return APIResponse(success=True, message="Resource replaced", data={"resource": await _build_resource_response(updated)}).model_dump()

@api_router.put("/resources/{resource_id}/rename")
async def rename_resource(resource_id: str, data: ResourceRename, request: Request):
    await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    if not data.displayName:
        return APIResponse(success=False, message="Display name is required").model_dump()
    await db.resources.update_one(
        {"id": resource_id},
        {"$set": {"displayName": data.displayName, "lastUpdated": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    return APIResponse(success=True, message="Resource renamed", data={"resource": await _build_resource_response(updated)}).model_dump()

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, request: Request):
    await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    file_path = Path(resource.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
    await db.resources.delete_one({"id": resource_id})
    return APIResponse(success=True, message="Resource deleted").model_dump()

@api_router.post("/announcements")
async def publish_announcement(announcement: AnnouncementCreate, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(announcement.class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()

    await _create_announcement_notifications(
        announcement.class_id,
        announcement.title,
        announcement.message,
    )

    return APIResponse(success=True, message="Announcement published").model_dump()

@api_router.put("/classes/{class_id}/rename")
async def rename_class(class_id: str, data: ClassRename, request: Request):
    admin = await get_current_admin(request)
    result = await db.classes.update_one(
        {"id": class_id, "admin_id": admin["id"]},
        {"$set": {"name": data.name}}
    )
    if result.matched_count == 0:
        return APIResponse(success=False, message="Class not found").model_dump()
    return APIResponse(success=True, message="Class renamed").model_dump()

@api_router.put("/classes/{class_id}/join-link")
async def update_join_link(class_id: str, data: JoinLinkUpdate, request: Request):
    admin = await get_current_admin(request)
    cls = await _get_admin_class(class_id, admin["id"])
    if not cls:
        return APIResponse(success=False, message="Class not found").model_dump()

    if data.action == "disable":
        await db.classes.update_one({"id": class_id, "admin_id": admin["id"]}, {"$set": {"join_enabled": False}})
        return APIResponse(success=True, message="Join link disabled").model_dump()
    elif data.action == "enable":
        update = {"join_enabled": True}
        if not cls.get("join_code"):
            update["join_code"] = await ensure_unique_join_code()
        await db.classes.update_one({"id": class_id, "admin_id": admin["id"]}, {"$set": update})
        updated = await db.classes.find_one({"id": class_id, "admin_id": admin["id"]}, {"_id": 0})
        return APIResponse(success=True, message="Join link enabled", data={"join_code": updated["join_code"]}).model_dump()
    elif data.action == "regenerate":
        new_code = await ensure_unique_join_code()
        await db.classes.update_one({"id": class_id, "admin_id": admin["id"]}, {"$set": {"join_code": new_code, "join_enabled": True}})
        return APIResponse(success=True, message="Join link regenerated", data={"join_code": new_code}).model_dump()
    else:
        return APIResponse(success=False, message="Invalid action").model_dump()

# ===========================
# Student Endpoints (Admin Protected)
# ===========================

@api_router.post("/classes/{class_id}/students")
async def add_student(class_id: str, student: StudentAdd, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()

    existing = await db.students.find_one({
        "class_id": class_id,
        "roll_number": student.roll_number
    }, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Student with this roll number already exists in this class").model_dump()

    student_doc = {
        "id": str(uuid.uuid4()),
        "class_id": class_id,
        "name": student.name,
        "roll_number": student.roll_number,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.students.insert_one(student_doc)

    return APIResponse(
        success=True,
        message="Student added",
        data={
            "id": student_doc["id"],
            "class_id": student_doc["class_id"],
            "name": student_doc["name"],
            "roll_number": student_doc["roll_number"],
            "added_at": student_doc["added_at"]
        }
    ).model_dump()

@api_router.get("/classes/{class_id}/students")
async def list_students(class_id: str, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    return APIResponse(success=True, message="Students retrieved", data={"students": students}).model_dump()

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, request: Request):
    admin = await get_current_admin(request)
    student = await _get_admin_student(student_id, admin["id"])
    if not student:
        return APIResponse(success=False, message="Student not found").model_dump()
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        return APIResponse(success=False, message="Student not found").model_dump()
    await db.attendance.delete_many({"student_id": student_id})
    return APIResponse(success=True, message="Student deleted").model_dump()

@api_router.put("/students/{student_id}")
async def edit_student(student_id: str, data: StudentEdit, request: Request):
    admin = await get_current_admin(request)
    student = await _get_admin_student(student_id, admin["id"])
    if not student:
        return APIResponse(success=False, message="Student not found").model_dump()
    # Check duplicate roll number in same class (excluding self)
    if data.roll_number != student["roll_number"]:
        dup = await db.students.find_one({
            "class_id": student["class_id"],
            "roll_number": data.roll_number,
            "id": {"$ne": student_id}
        }, {"_id": 0})
        if dup:
            return APIResponse(success=False, message="Roll number already exists in this class").model_dump()
    await db.students.update_one(
        {"id": student_id},
        {"$set": {"name": data.name, "roll_number": data.roll_number}}
    )
    return APIResponse(success=True, message="Student updated").model_dump()

# ===========================
# Join Class (Public)
# ===========================

@api_router.get("/classes/join-info/{join_code}")
async def get_join_info(join_code: str):
    class_doc = await db.classes.find_one({"join_code": join_code.upper()}, {"_id": 0})
    if not class_doc:
        return APIResponse(success=False, message="Invalid join code").model_dump()
    if class_doc.get("join_enabled") is False:
        return APIResponse(success=False, message="Join link is currently disabled for this class").model_dump()
    return APIResponse(
        success=True,
        message="Class found",
        data={
            "class_id": class_doc["id"],
            "class_name": class_doc["name"],
            "class_code": class_doc["code"]
        }
    ).model_dump()

@api_router.post("/classes/join")
async def join_class(req: JoinClassRequest):
    class_doc = await db.classes.find_one({"join_code": req.join_code}, {"_id": 0})
    if not class_doc:
        return APIResponse(success=False, message="Invalid join code").model_dump()
    if class_doc.get("join_enabled") is False:
        return APIResponse(success=False, message="Join link is currently disabled for this class").model_dump()

    existing = await db.students.find_one({
        "class_id": class_doc["id"],
        "roll_number": req.roll_number
    }, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Roll number already exists in this class").model_dump()

    student_doc = {
        "id": str(uuid.uuid4()),
        "class_id": class_doc["id"],
        "name": req.name,
        "roll_number": req.roll_number,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.students.insert_one(student_doc)

    return APIResponse(
        success=True,
        message="Successfully joined class",
        data={
            "class_name": class_doc["name"],
            "student_name": req.name,
            "roll_number": req.roll_number
        }
    ).model_dump()

# ===========================
# Attendance Endpoints
# ===========================

@api_router.post("/attendance")
async def mark_attendance(attendance: AttendanceCreate, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(attendance.class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()

    # Check if attendance already marked for this class/date/period
    existing = await db.attendance.find_one({
        "class_id": attendance.class_id,
        "date": attendance.date,
        "period_number": attendance.period_number
    }, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Attendance already marked for this period. Use edit instead.").model_dump()

    if attendance.records:
        student_ids = [record["student_id"] for record in attendance.records]
        valid_students = await db.students.find({
            "id": {"$in": student_ids},
            "class_id": attendance.class_id
        }, {"_id": 0}).to_list(1000)
        if len(valid_students) != len(student_ids):
            return APIResponse(success=False, message="Invalid student records for this class").model_dump()

    records_to_insert = []
    for record in attendance.records:
        records_to_insert.append({
            "id": str(uuid.uuid4()),
            "class_id": attendance.class_id,
            "student_id": record["student_id"],
            "date": attendance.date,
            "period_number": attendance.period_number,
            "status": record["status"],
            "marked_at": datetime.now(timezone.utc).isoformat()
        })

    if records_to_insert:
        await db.attendance.insert_many(records_to_insert)
        await _create_attendance_notifications(records_to_insert, class_doc["name"], edit_mode=False)

    return APIResponse(
        success=True,
        message=f"Attendance marked for period {attendance.period_number}",
        data={"count": len(records_to_insert)}
    ).model_dump()

@api_router.put("/attendance")
async def edit_attendance(attendance: AttendanceEdit, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(attendance.class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()

    # Delete existing records for this class/date/period
    await db.attendance.delete_many({
        "class_id": attendance.class_id,
        "date": attendance.date,
        "period_number": attendance.period_number
    })

    if attendance.records:
        student_ids = [record["student_id"] for record in attendance.records]
        valid_students = await db.students.find({
            "id": {"$in": student_ids},
            "class_id": attendance.class_id
        }, {"_id": 0}).to_list(1000)
        if len(valid_students) != len(student_ids):
            return APIResponse(success=False, message="Invalid student records for this class").model_dump()

    # Insert updated records
    records_to_insert = []
    for record in attendance.records:
        records_to_insert.append({
            "id": str(uuid.uuid4()),
            "class_id": attendance.class_id,
            "student_id": record["student_id"],
            "date": attendance.date,
            "period_number": attendance.period_number,
            "status": record["status"],
            "marked_at": datetime.now(timezone.utc).isoformat()
        })

    if records_to_insert:
        await db.attendance.insert_many(records_to_insert)
        await _create_attendance_notifications(records_to_insert, class_doc["name"], edit_mode=True)

    return APIResponse(
        success=True,
        message=f"Attendance updated for period {attendance.period_number}",
        data={"count": len(records_to_insert)}
    ).model_dump()

@api_router.get("/student/notifications")
async def list_student_notifications(request: Request):
    student = await get_current_student(request)
    notifications = await db.notifications.find({"student_id": student["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    unread_count = sum(1 for note in notifications if not note.get("read"))
    return APIResponse(
        success=True,
        message="Student notifications",
        data={"notifications": notifications, "unread_count": unread_count}
    ).model_dump()

@api_router.put("/student/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    student = await get_current_student(request)
    result = await db.notifications.update_one(
        {"id": notification_id, "student_id": student["id"]},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return APIResponse(success=True, message="Notification marked as read").model_dump()

@api_router.put("/student/notifications/read-all")
async def mark_all_notifications_read(request: Request):
    student = await get_current_student(request)
    await db.notifications.update_many(
        {"student_id": student["id"], "read": False},
        {"$set": {"read": True}}
    )
    return APIResponse(success=True, message="All notifications marked as read").model_dump()

@api_router.get("/attendance/check")
async def check_attendance(class_id: str, date: str, period_number: int, request: Request):
    """Check if attendance exists for a given class/date/period and return records"""
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    records = await db.attendance.find({
        "class_id": class_id,
        "date": date,
        "period_number": period_number
    }, {"_id": 0}).to_list(1000)
    return APIResponse(
        success=True,
        message="Check complete",
        data={"exists": len(records) > 0, "records": records}
    ).model_dump()

@api_router.get("/attendance/class/{class_id}")
async def get_class_attendance(class_id: str, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(10000)
    return APIResponse(success=True, message="Attendance retrieved", data={"attendance": records}).model_dump()

@api_router.get("/attendance/report/{class_id}")
async def get_attendance_report(class_id: str, request: Request):
    """Get per-student attendance summary with percentages"""
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(10000)

    student_map = {}
    for s in students:
        student_map[s["id"]] = {"name": s["name"], "roll_number": s["roll_number"], "present": 0, "absent": 0, "od": 0, "total": 0}
    for r in records:
        if r["student_id"] in student_map:
            student_map[r["student_id"]]["total"] += 1
            if r["status"] == "Present":
                student_map[r["student_id"]]["present"] += 1
            elif r["status"] == "Absent":
                student_map[r["student_id"]]["absent"] += 1
            elif r["status"] == "OD":
                student_map[r["student_id"]]["od"] += 1

    summaries = []
    for sid, s in student_map.items():
        attended = s["present"] + s["od"]
        raw_pct = (attended / s["total"]) * 100 if s["total"] > 0 else 0.0
        pct = round(raw_pct, 2)
        summaries.append({**s, "attended": attended, "percentage": pct, "is_eligible": raw_pct >= 75.0})
    summaries.sort(key=lambda x: x["roll_number"])

    return APIResponse(success=True, message="Report generated", data={"report": summaries}).model_dump()

@api_router.get("/attendance/export/{class_id}")
async def export_attendance_csv(class_id: str, request: Request):
    """Export attendance report as CSV"""
    admin = await get_current_admin(request)
    cls = await _get_admin_class(class_id, admin["id"])
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(10000)

    student_map = {}
    for s in students:
        student_map[s["id"]] = {"name": s["name"], "roll_number": s["roll_number"], "present": 0, "absent": 0, "od": 0, "total": 0}
    for r in records:
        if r["student_id"] in student_map:
            student_map[r["student_id"]]["total"] += 1
            if r["status"] == "Present":
                student_map[r["student_id"]]["present"] += 1
            elif r["status"] == "Absent":
                student_map[r["student_id"]]["absent"] += 1
            elif r["status"] == "OD":
                student_map[r["student_id"]]["od"] += 1

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll Number", "Name", "Present", "Absent", "OD", "Total Periods", "Attended (Present+OD)", "Percentage", "Status"])
    for sid, s in sorted(student_map.items(), key=lambda x: x[1]["roll_number"]):
        attended = s["present"] + s["od"]
        raw_pct = (attended / s["total"]) * 100 if s["total"] > 0 else 0.0
        pct = round(raw_pct, 2)
        status = "Eligible" if raw_pct >= 75.0 else "Shortage"
        writer.writerow([s["roll_number"], s["name"], s["present"], s["absent"], s["od"], s["total"], attended, f"{pct}%", status])

    output.seek(0)
    filename = f"attendance_{cls['code']}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ===========================
# Student Dashboard Endpoint
# ===========================

@api_router.get("/student/dashboard")
async def student_dashboard(request: Request):
    student = await get_current_student(request)
    print("STUDENT DASHBOARD SESSION:", student)
    class_doc = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get all attendance records for this student
    records = await db.attendance.find({
        "student_id": student["id"],
        "class_id": student["class_id"]
    }, {"_id": 0}).to_list(10000)

    total_periods = len(records)
    present_count = sum(1 for r in records if r["status"] in ("Present", "OD"))
    absent_count = sum(1 for r in records if r["status"] == "Absent")
    od_count = sum(1 for r in records if r["status"] == "OD")

    # Raw percentage for threshold logic — never round before comparing
    raw_percentage = (present_count / total_periods) * 100 if total_periods > 0 else 0.0
    # Display percentage — 2 decimal places for transparency
    percentage = round(raw_percentage, 2)
    is_eligible = raw_percentage >= 75.0

    # Calculate periods needed to reach 75%
    # We need: (present_count + x) / (total_periods + x) >= 0.75
    # => 0.25 * x >= 0.75 * total_periods - present_count
    # => x >= (0.75 * total_periods - present_count) / 0.25
    if is_eligible:
        periods_needed = 0
    else:
        needed = (0.75 * total_periods - present_count) / 0.25
        periods_needed = max(0, int(needed) + (1 if needed != int(needed) else 0))

    # Today's attendance
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_records = [r for r in records if r["date"] == today]

    # Classmates
    classmates = await db.students.find({"class_id": student["class_id"]}, {"_id": 0}).to_list(1000)
    classmates_list = [{"name": c["name"], "roll_number": c["roll_number"]} for c in classmates]

    # Sort records by date desc, period desc
    records.sort(key=lambda r: (r["date"], r["period_number"]), reverse=True)

    return APIResponse(
        success=True,
        message="Dashboard data",
        data={
            "student": {
                "id": student["id"],
                "name": student["name"],
                "roll_number": student["roll_number"],
            },
            "class": {
                "id": class_doc["id"],
                "name": class_doc["name"],
                "code": class_doc["code"],
                "periods_per_day": class_doc.get("periods_per_day", 0),
            },
            "attendance": {
                "total_periods": total_periods,
                "present_count": present_count,
                "absent_count": absent_count,
                "od_count": od_count,
                "percentage": percentage,
                "is_eligible": is_eligible,
                "periods_needed_for_75": periods_needed,
            },
            "today": today_records,
            "history": records,
            "classmates": classmates_list,
        }
    ).model_dump()

# ===========================
# Admin Dashboard Stats
# ===========================

@api_router.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"]}, {"_id": 0}).to_list(1000)

    total_students = 0
    for cls in classes:
        count = await db.students.count_documents({"class_id": cls["id"]})
        total_students += count

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    class_ids = [c["id"] for c in classes]
    today_records = await db.attendance.find({
        "class_id": {"$in": class_ids},
        "date": today
    }, {"_id": 0}).to_list(10000)

    total_today = len(today_records)
    present_today = sum(1 for r in today_records if r["status"] in ("Present", "OD"))
    today_pct = round((present_today / total_today) * 100) if total_today > 0 else 0

    return APIResponse(
        success=True,
        message="Dashboard stats",
        data={
            "total_classes": len(classes),
            "total_students": total_students,
            "today_attendance_pct": today_pct,
            "today_records_count": total_today,
        }
    ).model_dump()

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

