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
import asyncio
import logging
import uuid
import random
import string
import csv
import io
import httpx
import secrets  # secure random choice for password generation
import mimetypes
import smtplib
from email.message import EmailMessage
from pathlib import Path
from passlib.context import CryptContext
from zoneinfo import ZoneInfo
import time
from collections import defaultdict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class _InMemoryRateLimiter:
    """Simple sliding-window in-process rate limiter (not cluster-safe)."""
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self._history: dict[str, list] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        window = self._history[key]
        # Evict old timestamps
        self._history[key] = [t for t in window if now - t < self.window_seconds]
        if len(self._history[key]) >= self.requests_limit:
            return False
        self._history[key].append(now)
        return True

_auth_limiter  = _InMemoryRateLimiter(requests_limit=5,  window_seconds=60)
_join_limiter  = _InMemoryRateLimiter(requests_limit=10, window_seconds=60)
_report_limiter = _InMemoryRateLimiter(requests_limit=3, window_seconds=60)


def _normalize_env_list(value: str) -> list[str]:
    return [item.strip().strip('"').strip("'") for item in value.split(',') if item.strip()]

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]



raw_cors = os.environ.get('CORS_ORIGINS', ','.join(DEFAULT_CORS_ORIGINS))
CORS_ORIGINS = _normalize_env_list(raw_cors)
if '*' in CORS_ORIGINS:
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
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# Permanent system owner — cannot be removed or lose admin access
# OWNER_EMAIL can be overridden by environment variable so the hardcoded address
# is not baked into production deployments.
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "harishragavkumars@gmail.com")
SUPER_ADMIN_EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", OWNER_EMAIL)

# Default approved admin emails — seeded on startup.
# Can be overridden by a comma-separated APPROVED_ADMINS env var.
_raw_approved = os.environ.get("APPROVED_ADMINS", "")
if _raw_approved:
    DEFAULT_APPROVED_ADMINS = _normalize_env_list(_raw_approved)
else:
    DEFAULT_APPROVED_ADMINS = [
        OWNER_EMAIL,
        "harish@gmail.com",
        "cr1@gmail.com",
        "cr2@gmail.com",
    ]
if OWNER_EMAIL not in DEFAULT_APPROVED_ADMINS:
    DEFAULT_APPROVED_ADMINS.insert(0, OWNER_EMAIL)

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

RESOURCE_FILE_TYPES = {
    "pdf": {"mimeTypes": {"application/pdf"}, "preview": "pdf"},
    "jpg": {"mimeTypes": {"image/jpeg"}, "preview": "image"},
    "jpeg": {"mimeTypes": {"image/jpeg"}, "preview": "image"},
    "png": {"mimeTypes": {"image/png"}, "preview": "image"},
    "webp": {"mimeTypes": {"image/webp"}, "preview": "image"},
    "txt": {"mimeTypes": {"text/plain"}, "preview": "text"},
}
ALLOWED_RESOURCE_EXTENSIONS = set(RESOURCE_FILE_TYPES.keys())
ALLOWED_RESOURCE_MIME_TYPES = {
    mime_type
    for config in RESOURCE_FILE_TYPES.values()
    for mime_type in config["mimeTypes"]
}
PREVIEWABLE_MIME_TYPES = ALLOWED_RESOURCE_MIME_TYPES
RESOURCE_UNSUPPORTED_MESSAGE = "This file type is not supported in Attendify V1. Please upload a PDF, image, or TXT file."

VALID_DAY_ORDERS = [1, 2, 3, 4, 5, 6]
DAY_ORDER_SETTING_KEY = "active_day_order"
ACADEMIC_TIMEZONE = os.environ.get("ACADEMIC_TIMEZONE", "Asia/Kolkata")
VALID_ATTENDANCE_STATUSES = {"Present", "Absent", "OD"}
ATTENDANCE_PRESENT_STATUSES = {"Present", "OD"}

ALLOWED_TIMETABLE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_TIMETABLE_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_TIMETABLE_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


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

class GoogleAdminLoginRequest(BaseModel):
    credential: str  # Google ID token (JWT) from GSI


class StudentLogin(BaseModel):
    roll_number: str
    password: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ClassCreate(BaseModel):
    name: str
    code: str
    periods_per_day: int
    department: str = ""
    year: str = ""
    section: str = ""
    semester: str = ""
    academic_year: str = ""
    max_students: int = 100

    @field_validator('periods_per_day')
    @classmethod
    def validate_periods(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Periods per day must be between 1 and 10')
        return v

    @field_validator('max_students')
    @classmethod
    def validate_max_students(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Maximum students must be between 1 and 100')
        return v

class ClassUpdate(BaseModel):
    name: str
    department: str = ""
    year: str = ""
    section: str = ""
    semester: str = ""
    academic_year: str = ""
    max_students: int = 100

    @field_validator('max_students')
    @classmethod
    def validate_max_students(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Maximum students must be between 1 and 100')
        return v

class StudentAdd(BaseModel):
    name: str
    roll_number: str
    password: Optional[str] = None  # If None, defaults to roll_number

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

class JoinClassRequest(BaseModel):
    join_code: str
    name: str
    roll_number: str
    password: str

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
    description: str

class AnnouncementUpdate(BaseModel):
    title: str
    description: str



class JoinLinkUpdate(BaseModel):
    action: str  # "enable", "disable", "regenerate"

class StudentEdit(BaseModel):
    name: str
    roll_number: str

    @field_validator('roll_number')
    @classmethod
    def uppercase_roll(cls, v):
        return v.strip().upper()

VALID_ACADEMIC_UPDATE_TYPES = [
    'TEST', 'STUDY', 'TASK', 'INSTRUCTION', 'PURCHASE', 'MISSED_CLASS', 'REMINDER',
]

class AcademicUpdateCreate(BaseModel):
    class_id: str
    type: Literal['TEST', 'STUDY', 'TASK', 'INSTRUCTION', 'PURCHASE', 'MISSED_CLASS', 'REMINDER']
    subject: str
    title: str
    description: str
    due_date: Optional[str] = None
    resources: Optional[List[str]] = None

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Due date must be in YYYY-MM-DD format')
        return v

class AcademicUpdateEdit(BaseModel):
    type: Literal['TEST', 'STUDY', 'TASK', 'INSTRUCTION', 'PURCHASE', 'MISSED_CLASS', 'REMINDER']
    subject: str
    title: str
    description: str
    due_date: Optional[str] = None
    resources: Optional[List[str]] = None

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Due date must be in YYYY-MM-DD format')
        return v

class ReportCreate(BaseModel):
    type: Literal['bug', 'feature_request', 'problem', 'suggestion']
    page: str = ""
    title: str
    description: str

class ReportStatusUpdate(BaseModel):
    status: Literal['open', 'reviewing', 'resolved']

class DayOrderUpdate(BaseModel):
    day_order: int

class OnboardingSettingsUpdate(BaseModel):
    enableOnboarding: bool
    onboardingMode: Literal['first_login_only', 'every_login']

# ===========================
# Analytics Constants & Models
# ===========================

# Allowlist of valid event names. Add new events here as Attendify grows.
VALID_ANALYTICS_EVENTS = {
    "login",
    "dashboard_viewed",
    "attendance_viewed",
    "attendance_history_viewed",
    "timetable_viewed",
    "resources_viewed",
    "resource_opened",
    "announcements_viewed",
    "classmates_viewed",
    "profile_viewed",
}

class AnalyticsEventCreate(BaseModel):
    event: str
    metadata: Optional[dict] = None

# ===========================
# Helper Functions
# ===========================


def active_class_filter():
    return {"deleted": {"$ne": True}}


def generate_join_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def _get_onboarding_settings():
    settings = await db.settings.find_one({"key": "onboarding"}, {"_id": 0})
    if not settings:
        return {"enableOnboarding": True, "onboardingMode": "first_login_only"}
    return {
        "enableOnboarding": settings.get("enableOnboarding", True),
        "onboardingMode": settings.get("onboardingMode", "first_login_only"),
    }

async def ensure_unique_join_code():
    while True:
        code = generate_join_code()
        existing = await db.classes.find_one({"join_code": code, **active_class_filter()}, {"_id": 0})
        if not existing:
            return code

async def get_current_admin(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session or session["role"] != "admin":
        raise HTTPException(status_code=401, detail="Admin authentication required")
    admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
    if not admin:
        await db.sessions.delete_one({"auth_token": session["auth_token"]})
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

async def get_current_student(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session or session["role"] != "student":
        raise HTTPException(status_code=401, detail="Student authentication required")
    student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
    if not student:
        await db.sessions.delete_one({"auth_token": session["auth_token"]})
        raise HTTPException(status_code=401, detail="Student not found")
    # Enforce password change before any other student action
    if student.get("must_change_password", False):
        path = request.url.path
        _password_exempt = ("/auth/me", "/auth/student-change-password", "/auth/logout")
        if not any(path.endswith(ep) for ep in _password_exempt):
            raise HTTPException(status_code=403, detail="Password change required before continuing.")
    return student


async def _get_admin_class(class_id: str, admin_id: str) -> dict | None:
    return await db.classes.find_one({"id": class_id, "admin_id": admin_id, **active_class_filter()}, {"_id": 0})

def _get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip('.')

def _sanitize_filename(filename: str) -> str:
    return Path(filename).name

def _resource_mime_for_validation(filename: str, uploaded_mime_type: Optional[str]) -> str:
    guessed_mime_type = mimetypes.guess_type(filename)[0]
    if uploaded_mime_type and uploaded_mime_type != "application/octet-stream":
        return uploaded_mime_type
    return guessed_mime_type or uploaded_mime_type or "application/octet-stream"

async def _ensure_resource_storage_dir():
    storage_dir = ROOT_DIR / 'resource_storage'
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir

async def _ensure_timetable_storage_dir():
    storage_dir = ROOT_DIR / 'timetable_storage'
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

async def _get_accessible_resource(request: Request, resource_id: str) -> dict:
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")

    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    resource_class_id = resource.get("class_id")

    if session["role"] == "student":
        student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
        if not student:
            raise HTTPException(status_code=401, detail="Student not found")
        if resource_class_id and resource_class_id != student.get("class_id"):
            raise HTTPException(status_code=403, detail="Resource is not available for your class")
        return resource

    if session["role"] == "admin":
        admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        if resource_class_id:
            class_doc = await _get_admin_class(resource_class_id, admin["id"])
            if not class_doc:
                raise HTTPException(status_code=403, detail="Resource is not available for your classes")
        return resource

    raise HTTPException(status_code=401, detail="Authentication required")

async def _resource_list_query_for_request(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")

    if session["role"] == "student":
        student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
        if not student:
            raise HTTPException(status_code=401, detail="Student not found")
        return {"$or": [{"class_id": student["class_id"]}, {"class_id": {"$exists": False}}, {"class_id": None}]}

    if session["role"] == "admin":
        admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0, "id": 1}).to_list(1000)
        class_ids = [item["id"] for item in classes]
        return {"$or": [{"class_id": {"$in": class_ids}}, {"class_id": {"$exists": False}}, {"class_id": None}]}

    raise HTTPException(status_code=401, detail="Authentication required")

def _academic_now() -> datetime:
    try:
        return datetime.now(ZoneInfo(ACADEMIC_TIMEZONE))
    except Exception:
        return datetime.now(timezone.utc)

def _academic_today() -> str:
    return _academic_now().date().isoformat()

def _setting_active_date(setting: dict) -> Optional[str]:
    active_date = setting.get("active_date")
    if active_date:
        return active_date

    updated_at = setting.get("updated_at")
    if not updated_at:
        return None

    try:
        parsed = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(ZoneInfo(ACADEMIC_TIMEZONE)).date().isoformat()
    except Exception:
        return None

async def _get_day_order_setting() -> dict:
    setting = await db.settings.find_one({"key": DAY_ORDER_SETTING_KEY}, {"_id": 0})
    if not setting:
        return {
            "day_order": None,
            "label": None,
            "updated_at": None,
            "updated_by": None,
            "active_date": None,
            "timezone": ACADEMIC_TIMEZONE,
            "expired": False,
        }

    active_date = _setting_active_date(setting)
    if active_date != _academic_today():
        return {
            "day_order": None,
            "label": None,
            "updated_at": setting.get("updated_at"),
            "updated_by": setting.get("updated_by"),
            "active_date": active_date,
            "timezone": setting.get("timezone") or ACADEMIC_TIMEZONE,
            "expired": bool(setting.get("day_order")),
        }

    day_order = setting.get("day_order")
    return {
        "day_order": day_order,
        "label": f"Day {day_order}" if day_order else None,
        "updated_at": setting.get("updated_at"),
        "updated_by": setting.get("updated_by"),
        "active_date": active_date,
        "timezone": setting.get("timezone") or ACADEMIC_TIMEZONE,
        "expired": False,
    }

async def _set_day_order_setting(day_order: int, admin_id: str) -> dict:
    if day_order not in VALID_DAY_ORDERS:
        raise HTTPException(status_code=400, detail="Day Order must be between 1 and 6")
    now = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {"key": DAY_ORDER_SETTING_KEY},
        {
            "$set": {
                "key": DAY_ORDER_SETTING_KEY,
                "day_order": day_order,
                "updated_at": now,
                "updated_by": admin_id,
                "active_date": _academic_today(),
                "timezone": ACADEMIC_TIMEZONE,
                "mode": "manual",
            }
        },
        upsert=True,
    )
    return await _get_day_order_setting()

def _validate_attendance_payload(date_value: str, period_number: int, records: list[dict]) -> None:
    try:
        datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be in YYYY-MM-DD format")
    if period_number < 1:
        raise HTTPException(status_code=400, detail="Period number is required")
    if not records:
        raise HTTPException(status_code=400, detail="Attendance records are required")
    seen_students = set()
    for record in records:
        student_id = record.get("student_id")
        status = record.get("status")
        if not student_id:
            raise HTTPException(status_code=400, detail="Every attendance record must include a student")
        if student_id in seen_students:
            raise HTTPException(status_code=400, detail="Duplicate student attendance records are not allowed")
        seen_students.add(student_id)
        if status not in VALID_ATTENDANCE_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid attendance status")

def _attendance_status_label(percentage: float) -> str:
    if percentage >= 75:
        return "Safe"
    if percentage >= 65:
        return "Warning"
    return "Critical"

def _build_attendance_summary(records: list[dict], today: Optional[str] = None) -> dict:
    today = today or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    normalized_records = sorted(records, key=lambda r: (r.get("date", ""), r.get("period_number", 0)), reverse=True)
    total_periods = len(normalized_records)
    present_count = sum(1 for record in normalized_records if record.get("status") in ATTENDANCE_PRESENT_STATUSES)
    absent_count = sum(1 for record in normalized_records if record.get("status") == "Absent")
    od_count = sum(1 for record in normalized_records if record.get("status") == "OD")
    raw_percentage = min(100.0, max(0.0, (present_count / total_periods) * 100 if total_periods else 0.0))
    percentage = round(raw_percentage, 2)

    today_records = sorted(
        [record for record in normalized_records if record.get("date") == today],
        key=lambda r: r.get("period_number", 0),
    )
    return {
        "total_periods": total_periods,
        "present_count": present_count,
        "total_working_hours": total_periods,
        "working_hours_attended": present_count,
        "absent_count": absent_count,
        "od_count": od_count,
        "attended": present_count,
        "percentage": percentage,
        "status": _attendance_status_label(percentage),
        "is_eligible": raw_percentage >= 75.0,
        "last_updated": max((record.get("marked_at") for record in normalized_records if record.get("marked_at")), default=None),
        "today_records": today_records,
        "history": normalized_records,
    }

async def _get_student_attendance_summary(student_id: str, class_id: str, today: Optional[str] = None) -> dict:
    records = await db.attendance.find({"student_id": student_id, "class_id": class_id}, {"_id": 0}).to_list(None)
    return _build_attendance_summary(records, today=today)

async def _attendance_summaries_for_students(class_id: str, student_ids: list[str]) -> dict:
    if not student_ids:
        return {}
    records = await db.attendance.find(
        {"class_id": class_id, "student_id": {"$in": student_ids}},
        {"_id": 0}
    ).to_list(None)
    grouped = {student_id: [] for student_id in student_ids}
    for record in records:
        if record["student_id"] in grouped:
            grouped[record["student_id"]].append(record)
    return {student_id: _build_attendance_summary(items) for student_id, items in grouped.items()}

async def _record_attendance_change_events(
    class_id: str,
    student_ids: list[str],
    previous_summaries: dict,
    reason_by_student: dict,
) -> None:
    current_summaries = await _attendance_summaries_for_students(class_id, student_ids)
    now = datetime.now(timezone.utc).isoformat()
    events = []
    for student_id in student_ids:
        previous = previous_summaries.get(student_id, {}).get("percentage", 0.0)
        current = current_summaries.get(student_id, {}).get("percentage", 0.0)
        delta = round(current - previous, 2)
        if delta == 0:
            continue
        events.append({
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "class_id": class_id,
            "previous_percentage": previous,
            "current_percentage": current,
            "delta": delta,
            "direction": "up" if delta > 0 else "down",
            "reason": reason_by_student.get(student_id) or ("Attendance increased." if delta > 0 else "Attendance decreased."),
            "created_at": now,
            "delivered": False,
        })
    if events:
        await db.attendance_change_events.insert_many(events)

async def _consume_latest_attendance_change(student_id: str) -> dict | None:
    event = await db.attendance_change_events.find_one(
        {"student_id": student_id, "delivered": {"$ne": True}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not event:
        return None
    await db.attendance_change_events.update_many(
        {"student_id": student_id, "delivered": {"$ne": True}},
        {"$set": {"delivered": True, "delivered_at": datetime.now(timezone.utc).isoformat()}}
    )
    return event

async def _get_admin_student(student_id: str, admin_id: str) -> dict | None:
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        return None
    cls = await db.classes.find_one({"id": student["class_id"], "admin_id": admin_id, **active_class_filter()}, {"_id": 0})
    if not cls:
        return None
    return student

async def _get_valid_session(request: Request) -> dict | None:
    auth_token = request.cookies.get("auth_token")
    if not auth_token:
        return None
    session = await db.sessions.find_one({"auth_token": auth_token}, {"_id": 0})
    if not session:
        return None
    if session.get("expires_at"):
        expires = session["expires_at"]
        now = datetime.now(timezone.utc)
        # Handle both naive and aware datetimes from MongoDB
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            await db.sessions.delete_one({"auth_token": auth_token})
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

async def _notify_class_students(
    class_id: str,
    title: str,
    message: str,
    type: str = 'info',
    link: Optional[str] = None,
):
    students = await db.students.find({"class_id": class_id}, {"id": 1}).to_list(10000)
    if not students:
        return
    now = datetime.now(timezone.utc).isoformat()
    notifications = []
    for student in students:
        notifications.append({
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "class_id": class_id,
            "title": title,
            "message": message,
            "type": type,
            "link": link,
            "read": False,
            "created_at": now,
        })
    await db.notifications.insert_many(notifications)

async def _notify_all_students(
    title: str,
    message: str,
    type: str = 'info',
    link: Optional[str] = None,
    batch_size: int = 500,
):
    """Stream-insert notifications for every student in batches to avoid OOM on large datasets."""
    now = datetime.now(timezone.utc).isoformat()
    batch: list = []
    async for student in db.students.find({}, {"id": 1, "class_id": 1}):
        batch.append({
            "id": str(uuid.uuid4()),
            "student_id": student["id"],
            "class_id": student.get("class_id"),
            "title": title,
            "message": message,
            "type": type,
            "link": link,
            "read": False,
            "created_at": now,
        })
        if len(batch) >= batch_size:
            await db.notifications.insert_many(batch)
            batch = []
            await asyncio.sleep(0)  # yield event loop
    if batch:
        await db.notifications.insert_many(batch)



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

async def _get_report_actor(request: Request) -> dict:
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")

    if session["role"] == "student":
        student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
        if not student:
            raise HTTPException(status_code=401, detail="Student not found")
        return {
            "id": student["id"],
            "name": student.get("name", ""),
            "role": "student",
        }

    if session["role"] == "admin":
        admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return {
            "id": admin["id"],
            "name": admin.get("name", ""),
            "role": admin.get("role", "admin"),
        }

    raise HTTPException(status_code=401, detail="Authentication required")

def _send_report_email(report: dict) -> None:
    try:
        smtp_host = os.environ.get("SMTP_HOST", "")
        if not smtp_host:
            raise RuntimeError("SMTP_HOST not configured")

        msg = EmailMessage()
        msg["Subject"] = f"Attendify Report: {report['title']}"
        msg["From"] = os.environ.get("SMTP_FROM", SUPER_ADMIN_EMAIL)
        msg["To"] = SUPER_ADMIN_EMAIL
        msg.set_content(
            "\n".join([
                f"User: {report['user_name']} ({report['user_id']})",
                f"Role: {report['user_role']}",
                f"Type: {report['type']}",
                f"Page: {report.get('page', '')}",
                f"Title: {report['title']}",
                f"Description: {report['description']}",
                f"Time: {report['created_at']}",
            ])
        )

        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
            if use_tls:
                smtp.starttls()
            if smtp_user:
                smtp.login(smtp_user, smtp_password)
            smtp.send_message(msg)
    except Exception as exc:
        logger.warning(f"Report email notification failed: {exc}")

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
    await db.sessions.create_index("auth_token", unique=True)
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)
    # Approved admins index
    await db.approved_admins.create_index("email", unique=True)
    # Admins index
    await db.admins.create_index("email", unique=True)
    await db.admins.create_index("id", unique=True)
    # Students indexes
    await db.students.create_index("id", unique=True)
    await db.students.create_index([("class_id", 1), ("roll_number", 1)], unique=True)
    # Classes index
    await db.classes.create_index(
        [("department", 1), ("year", 1), ("section", 1), ("semester", 1)],
        unique=True,
        sparse=True,
        name="classes_unique_composite"
    )
    # Resource subject indexes
    await db.resource_subjects.create_index("id", unique=True)
    await db.resource_subjects.create_index([("admin_id", 1), ("name", 1)], unique=True)
    # Resource indexes
    await db.resources.create_index("id", unique=True)
    await db.resources.create_index([("subject_id", 1), ("category", 1)])
    # Notification indexes
    await db.notifications.create_index("id", unique=True)
    await db.notifications.create_index([("student_id", 1), ("created_at", -1)])
    # Academic updates indexes
    await db.academic_updates.create_index("id", unique=True)
    await db.academic_updates.create_index([("class_id", 1), ("type", 1), ("created_at", -1)])

    # Deduplicate attendance collection to prevent migration failures
    try:
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "class_id": "$class_id",
                        "student_id": "$student_id",
                        "date": "$date",
                        "period_number": "$period_number"
                    },
                    "count": {"$sum": 1},
                    "ids": {"$push": "$_id"}
                }
            },
            {
                "$match": {
                    "count": {"$gt": 1}
                }
            }
        ]
        duplicates = await db.attendance.aggregate(pipeline).to_list(10000)
        for dup in duplicates:
            ids_to_delete = dup["ids"][1:]
            if ids_to_delete:
                await db.attendance.delete_many({"_id": {"$in": ids_to_delete}})
                logger.info(f"Deduplicated attendance: kept first, deleted {len(ids_to_delete)} duplicate records for {dup['_id']}")
    except Exception as e:
        logger.error(f"Error deduplicating attendance data on startup: {e}")

    # Attendance unique composite index
    await db.attendance.create_index(
        [("class_id", 1), ("student_id", 1), ("date", 1), ("period_number", 1)],
        unique=True,
        name="attendance_unique_composite"
    )

    # Analytics indexes — no TTL, events are kept permanently for historical analysis
    await db.analytics_events.create_index([("user_id", 1)])
    await db.analytics_events.create_index([("event", 1)])
    await db.analytics_events.create_index([("timestamp", -1)])
    await db.analytics_events.create_index([("user_id", 1), ("timestamp", -1)], name="analytics_user_time")
    await db.analytics_events.create_index([("event", 1), ("timestamp", -1)], name="analytics_event_time")

    logger.info("Indexes ensured")


# ===========================
# Auth Endpoints
# ===========================

@api_router.post("/auth/google-admin")
async def google_admin_login(request: Request, req: GoogleAdminLoginRequest, response: Response):
    """Google OAuth Admin Login — verifies Google ID token, checks approved email, creates session."""
    ip = (request.client.host if request.client else "unknown")
    if not _auth_limiter.is_allowed(ip):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    # 1. Verify the Google ID token with Google's tokeninfo endpoint
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                GOOGLE_TOKEN_INFO_URL,
                params={"id_token": req.credential},
                timeout=10,
            )
        if resp.status_code != 200:
            return APIResponse(success=False, message="Invalid Google token. Please try signing in again.").model_dump()
        token_data = resp.json()
    except Exception:
        return APIResponse(success=False, message="Could not verify Google token. Check your connection.").model_dump()

    # 2. Validate audience
    if not GOOGLE_CLIENT_ID:
        return APIResponse(success=False, message="Google Client ID is not configured on the server. Contact administrator.").model_dump()
    if token_data.get("aud") != GOOGLE_CLIENT_ID:
        return APIResponse(success=False, message="Token audience mismatch. Ensure the correct Google Client ID is configured.").model_dump()

    # 3. Extract user info from token
    email = token_data.get("email", "").lower().strip()
    name = token_data.get("name") or token_data.get("email", "").split("@")[0]
    picture = token_data.get("picture", "")

    if not email:
        return APIResponse(success=False, message="Could not retrieve email from Google account.").model_dump()

    if not token_data.get("email_verified"):
        return APIResponse(success=False, message="Google email is not verified.").model_dump()

    # 4. Check if the email is an approved admin
    is_owner = email == OWNER_EMAIL
    if not is_owner:
        approved = await db.approved_admins.find_one({"email": email}, {"_id": 0})
        if not approved:
            return APIResponse(
                success=False,
                message="Access Denied. Your Google account email is not approved for admin access."
            ).model_dump()

    # 5. Get or create admin record
    admin_id = str(uuid.uuid4())
    result = await db.admins.find_one_and_update(
        {"email": email},
        {
            "$set": {"name": name, "picture": picture, "role": "super_admin" if is_owner else "admin"},
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
    name = result.get("name", "")

    # 6. Create persistent session
    auth_token = str(uuid.uuid4())
    await db.sessions.insert_one({
        "auth_token": auth_token,
        "role": "admin",
        "user_id": admin_id,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    response.set_cookie(
        key="auth_token",
        value=auth_token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=_cookie_secure_for_request(request),
        path="/",
        max_age=7 * 86400
    )

    # Track admin login event (fire-and-forget — never blocks login)
    async def _track_admin_login():
        try:
            await db.analytics_events.insert_one({
                "user_id": admin_id,
                "user_role": "super_admin" if is_owner else "admin",
                "event": "login",
                "timestamp": datetime.now(timezone.utc),
                "metadata": {},
            })
        except Exception:
            pass
    asyncio.create_task(_track_admin_login())

    return APIResponse(
        success=True,
        message="Login successful",
        data={
            "id": admin_id,
            "name": name,
            "email": email,
            "picture": picture,
            "role": "super_admin" if is_owner else "admin",
            "is_owner": is_owner
        }
    ).model_dump()



@api_router.post("/auth/student-login")
async def student_login(request: Request, login_data: StudentLogin, response: Response):
    ip = (request.client.host if request.client else "unknown")
    if not _auth_limiter.is_allowed(ip):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    candidates = await db.students.find({"roll_number": login_data.roll_number}, {"_id": 0}).to_list(100)
    if not candidates:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Verify password against all matching records; pick the first that matches
    student = None
    for c in candidates:
        stored_hash = c.get("password_hash", "")
        if stored_hash and pwd_context.verify(login_data.password, stored_hash):
            student = c
            break

    if not student:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    class_doc = await db.classes.find_one({"id": student["class_id"], **active_class_filter()}, {"_id": 0})

    auth_token = str(uuid.uuid4())
    await db.sessions.insert_one({
        "auth_token": auth_token,
        "role": "student",
        "user_id": student["id"],
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
    })
    response.set_cookie(
        key="auth_token",
        value=auth_token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=_cookie_secure_for_request(request),
        path="/",
        max_age=86400
    )

    # Track student login event (fire-and-forget — never blocks login)
    _student_id_for_analytics = student["id"]
    async def _track_student_login():
        try:
            await db.analytics_events.insert_one({
                "user_id": _student_id_for_analytics,
                "user_role": "student",
                "event": "login",
                "timestamp": datetime.now(timezone.utc),
                "metadata": {},
            })
        except Exception:
            pass
    asyncio.create_task(_track_student_login())

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
            "role": "student",
            "must_change_password": student.get("must_change_password", False),
            "hasCompletedOnboarding": student.get("hasCompletedOnboarding", False)
        }
    ).model_dump()

@api_router.post("/auth/student-change-password")
async def student_change_password(request: Request, data: ChangePasswordRequest):
    """Allow an authenticated student to change their own password."""
    student = await get_current_student(request)
    stored_hash = student.get("password_hash", "")
    if not stored_hash or not pwd_context.verify(data.current_password, stored_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    if len(data.new_password) < 6:
        return APIResponse(success=False, message="New password must be at least 6 characters.").model_dump()
    new_hash = pwd_context.hash(data.new_password)
    await db.students.update_one(
        {"id": student["id"]},
        {"$set": {
            "password_hash": new_hash, 
            "must_change_password": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return APIResponse(success=True, message="Password changed successfully.").model_dump()

@api_router.post("/student/onboarding-complete")
async def complete_student_onboarding(request: Request):
    student = await get_current_student(request)
    await db.students.update_one(
        {"id": student["id"]},
        {"$set": {
            "hasCompletedOnboarding": True,
            "onboarding_completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return APIResponse(
        success=True,
        message="Onboarding completed",
        data={"hasCompletedOnboarding": True}
    ).model_dump()

@api_router.get("/auth/me")
async def get_me(request: Request):
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if session["role"] == "admin":
        admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
        if not admin:
            await db.sessions.delete_one({"auth_token": session["auth_token"]})
            raise HTTPException(status_code=401, detail="Admin not found")
        return APIResponse(
            success=True,
            message="Authenticated",
            data={
                "id": admin["id"],
                "name": admin["name"],
                "email": admin["email"],
                "picture": admin.get("picture", ""),
                "role": admin.get("role", "admin"),
                "is_owner": admin["email"] == OWNER_EMAIL
            }
        ).model_dump()

    if session["role"] == "student":
        student = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
        if not student:
            await db.sessions.delete_one({"auth_token": session["auth_token"]})
            raise HTTPException(status_code=401, detail="Student not found")
        class_doc = await db.classes.find_one({"id": student["class_id"], **active_class_filter()}, {"_id": 0})
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
                "role": "student",
                "must_change_password": student.get("must_change_password", False),
                "hasCompletedOnboarding": student.get("hasCompletedOnboarding", False)
            }
        ).model_dump()

    raise HTTPException(status_code=401, detail="Not authenticated")

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    auth_token = request.cookies.get("auth_token")
    if auth_token:
        await db.sessions.delete_one({"auth_token": auth_token})
    response.delete_cookie("auth_token", samesite=COOKIE_SAMESITE, secure=_cookie_secure_for_request(request), path="/")
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
# Admin Profile & Actions
# ===========================


@api_router.post("/admin/students/{student_id}/reset-password")
async def reset_student_password(student_id: str, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")

    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        return APIResponse(success=False, message="Student not found").model_dump()
    
    cls = await _get_admin_class(student["class_id"], admin["id"])
    if not cls:
        return APIResponse(success=False, message="Student not found in your classes").model_dump()

    new_hash = pwd_context.hash(student["roll_number"])
    await db.students.update_one(
        {"id": student_id},
        {"$set": {
            "password_hash": new_hash,
            "must_change_password": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return APIResponse(success=True, message="Student password reset successfully").model_dump()


# ===========================
# Class Endpoints (Admin Protected)
# ===========================

@api_router.post("/classes")
async def create_class(class_data: ClassCreate, request: Request):
    admin = await get_current_admin(request)
    existing = await db.classes.find_one({"code": class_data.code, **active_class_filter()}, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Class code already exists").model_dump()

    existing_dup = await db.classes.find_one({
        "department": class_data.department,
        "year": class_data.year,
        "section": class_data.section,
        "semester": class_data.semester,
        "admin_id": admin["id"],
        **active_class_filter()
    })
    
    if existing_dup:
        raise HTTPException(
            status_code=409,
            detail="A class with these details already exists."
        )

    join_code = await ensure_unique_join_code()
    class_doc = {
        "id": str(uuid.uuid4()),
        "name": class_data.name,
        "code": class_data.code,
        "periods_per_day": class_data.periods_per_day,
        "department": class_data.department,
        "year": class_data.year,
        "section": class_data.section,
        "semester": class_data.semester,
        "academic_year": class_data.academic_year,
        "max_students": class_data.max_students,
        "join_code": join_code,
        "join_enabled": True,
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"],
        "deleted": False,
        "deleted_at": None,
        "deleted_by": None
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
            "department": class_doc["department"],
            "year": class_doc["year"],
            "section": class_doc["section"],
            "semester": class_doc["semester"],
            "academic_year": class_doc["academic_year"],
            "max_students": class_doc["max_students"],
            "join_code": join_code,
            "join_enabled": True,
            "admin_id": admin["id"],
            "created_at": class_doc["created_at"]
        }
    ).model_dump()

@api_router.get("/classes")
async def list_classes(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0}).to_list(1000)
    is_super_admin = admin.get("role") == "super_admin"

    class_ids = [cls["id"] for cls in classes]

    student_counts = {}
    async for doc in db.students.aggregate([
        {"$match": {"class_id": {"$in": class_ids}}},
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]):
        student_counts[doc["_id"]] = doc["count"]

    attendance_counts = {}
    async for doc in db.attendance.aggregate([
        {"$match": {"class_id": {"$in": class_ids}}},
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]):
        attendance_counts[doc["_id"]] = doc["count"]

    resource_counts = {}
    async for doc in db.resources.aggregate([
        {"$match": {"class_id": {"$in": class_ids}}},
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]):
        resource_counts[doc["_id"]] = doc["count"]

    announcement_counts = {}
    async for doc in db.announcements.aggregate([
        {"$match": {"class_id": {"$in": class_ids}}},
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]):
        announcement_counts[doc["_id"]] = doc["count"]

    notification_counts = {}
    async for doc in db.notifications.aggregate([
        {"$match": {"class_id": {"$in": class_ids}}},
        {"$group": {"_id": "$class_id", "count": {"$sum": 1}}}
    ]):
        notification_counts[doc["_id"]] = doc["count"]

    for cls in classes:
        s = student_counts.get(cls["id"], 0)
        a = attendance_counts.get(cls["id"], 0)
        r = resource_counts.get(cls["id"], 0)
        an = announcement_counts.get(cls["id"], 0)
        n = notification_counts.get(cls["id"], 0)

        cls["student_count"] = s
        cls["attendance_count"] = a
        cls["resource_count"] = r
        cls["announcement_count"] = an
        cls["notification_count"] = n

        is_empty = (s == 0 and a == 0 and r == 0 and an == 0 and n == 0)

        if is_super_admin:
            cls["can_delete"] = True
            cls["delete_reason"] = "super_admin"
        else:
            cls["can_delete"] = is_empty
            cls["delete_reason"] = "empty_class" if is_empty else "none"

    return APIResponse(success=True, message="Classes retrieved", data={"classes": classes}).model_dump()

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, request: Request):
    admin = await get_current_admin(request)
    is_super_admin = admin.get("role") == "super_admin"

    # Fetch the class document
    cls = await db.classes.find_one({"id": class_id, "admin_id": admin["id"], **active_class_filter()})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    # Prevent deleting the last active class (applies to all roles)
    active_count = await db.classes.count_documents({"admin_id": admin["id"], "deleted": {"$ne": True}})
    if active_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last active class.")

    # --- Permission checks for regular admins ---
    if not is_super_admin:
        s_count  = await db.students.count_documents({"class_id": class_id})
        a_count  = await db.attendance.count_documents({"class_id": class_id})
        r_count  = await db.resources.count_documents({"class_id": class_id})
        an_count = await db.announcements.count_documents({"class_id": class_id})
        n_count  = await db.notifications.count_documents({"class_id": class_id})

        is_empty = (s_count == 0 and a_count == 0 and r_count == 0
                    and an_count == 0 and n_count == 0)

        if not is_empty:
            raise HTTPException(
                status_code=403,
                detail="Only the super admin can delete classes containing data."
            )

        deletion_reason = "empty_class"
    else:
        deletion_reason = "super_admin"

    # Perform soft delete
    await db.classes.update_one(
        {"id": class_id, "admin_id": admin["id"]},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_by": admin["id"]
        }}
    )

    # Write audit log
    await db.audit_logs.insert_one({
        "action": "class_deleted",
        "class_id": class_id,
        "class_name": cls.get("name", "Unknown"),
        "performed_by": admin["id"],
        "performed_by_role": admin.get("role", "admin"),
        "reason": deletion_reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "delete_type": "soft_delete",
        "data_preserved": True
    })

    return APIResponse(success=True, message="Class moved to trash successfully.").model_dump()

@api_router.get("/classes/trash")
async def get_class_trash(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"], "deleted": True}, {"_id": 0}).to_list(1000)
    return APIResponse(success=True, message="Trash retrieved", data={"classes": classes}).model_dump()

@api_router.put("/classes/{class_id}/restore")
async def restore_class(class_id: str, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")
        
    result = await db.classes.update_one(
        {"id": class_id, "admin_id": admin["id"]},
        {"$set": {
            "deleted": False,
            "deleted_at": None,
            "deleted_by": None
        }}
    )
    if result.modified_count == 0:
        return APIResponse(success=False, message="Class not found or not in trash").model_dump()
        
    class_doc = await db.classes.find_one({"id": class_id})
    await db.audit_logs.insert_one({
        "action": "class_restored",
        "class_id": class_id,
        "class_name": class_doc.get("name") if class_doc else "Unknown",
        "performed_by": admin["id"],
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    return APIResponse(success=True, message="Class restored successfully.").model_dump()

@api_router.delete("/classes/{class_id}/permanent")
async def permanent_delete_class(class_id: str, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")
        
    s_count = await db.students.count_documents({"class_id": class_id})
    a_count = await db.attendance.count_documents({"class_id": class_id})
    r_count = await db.resources.count_documents({"class_id": class_id})
    an_count = await db.announcements.count_documents({"class_id": class_id})
    n_count = await db.notifications.count_documents({"class_id": class_id})
    
    if any([s_count > 0, a_count > 0, r_count > 0, an_count > 0, n_count > 0]):
        raise HTTPException(status_code=400, detail="Cannot permanently delete a class containing related data.")
        
    result = await db.classes.delete_one({"id": class_id, "admin_id": admin["id"]})
    if result.deleted_count == 0:
        return APIResponse(success=False, message="Class not found").model_dump()
        
    return APIResponse(success=True, message="Class permanently deleted").model_dump()

# ===========================
# Timetable Endpoints
# ===========================

def _timetable_response(timetable: dict) -> dict:
    return {
        "timetable_id": timetable["timetable_id"],
        "class_id": timetable["class_id"],
        "filename": timetable.get("filename"),
        "uploaded_by": timetable["uploaded_by"],
        "uploaded_at": timetable["uploaded_at"],
        "updated_at": timetable["updated_at"],
        "version": timetable["version"],
        "image_url": f"/api/timetables/{timetable['class_id']}/image",
    }

@api_router.get("/timetables")
async def list_timetables(request: Request, class_id: Optional[str] = None):
    admin = await get_current_admin(request)
    day_order = await _get_day_order_setting()
    classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0, "id": 1, "name": 1, "code": 1}).to_list(1000)
    allowed = {item["id"]: item for item in classes}
    if class_id and class_id not in allowed:
        raise HTTPException(status_code=404, detail="Class not found")
    query = {"class_id": class_id} if class_id else {"class_id": {"$in": list(allowed)}}
    timetables = await db.timetables.find(query, {"_id": 0}).to_list(1000)
    timetable_map = {item["class_id"]: _timetable_response(item) for item in timetables}
    data = [{"class": cls, "timetable": timetable_map.get(cid)} for cid, cls in allowed.items() if not class_id or cid == class_id]
    return APIResponse(success=True, message="Timetables retrieved", data={"items": data, "day_order": day_order}).model_dump()

@api_router.post("/timetables/{class_id}")
async def upload_timetable(class_id: str, request: Request, file: UploadFile = File(...)):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    filename = _sanitize_filename(file.filename or "timetable")
    extension = _get_file_extension(filename)
    mime_type = file.content_type or mimetypes.guess_type(filename)[0]
    if extension not in ALLOWED_TIMETABLE_EXTENSIONS or mime_type not in ALLOWED_TIMETABLE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are supported")
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The selected image is empty")
    if len(contents) > MAX_TIMETABLE_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Timetable image must be 10 MB or smaller")

    existing = await db.timetables.find_one({"class_id": class_id}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    timetable_id = existing["timetable_id"] if existing else str(uuid.uuid4())
    version = existing.get("version", 0) + 1 if existing else 1
    storage_dir = await _ensure_timetable_storage_dir()
    class_dir = storage_dir / class_id
    class_dir.mkdir(parents=True, exist_ok=True)
    disk_path = class_dir / f"{timetable_id}_v{version}.{extension}"
    with open(disk_path, "wb") as stored_file:
        stored_file.write(contents)

    timetable_doc = {
        "timetable_id": timetable_id,
        "class_id": class_id,
        "image_path": str(disk_path),
        "filename": filename,
        "mime_type": mime_type,
        "uploaded_by": admin["id"],
        "uploaded_at": existing["uploaded_at"] if existing else now,
        "updated_at": now,
        "version": version,
    }
    await db.timetables.replace_one({"class_id": class_id}, timetable_doc, upsert=True)
    await db.timetable_history.insert_one({
        "history_id": str(uuid.uuid4()), "timetable_id": timetable_id, "class_id": class_id,
        "action_type": "updated" if existing else "uploaded", "performed_by": admin["id"],
        "performed_at": now, "previous_file": existing.get("filename") if existing else None,
        "current_file": filename, "version": version,
    })
    if existing:
        old_path = Path(existing.get("image_path", ""))
        if old_path.exists() and old_path != disk_path:
            old_path.unlink()
    action = "updated" if existing else "uploaded"
    await _notify_class_students(
        class_id, f"Timetable {action}", f"🕒 {'Timetable updated.' if existing else 'New timetable uploaded.'}",
        "timetable", "/student/dashboard",
    )
    return APIResponse(success=True, message=f"Timetable {action}", data={"timetable": _timetable_response(timetable_doc)}).model_dump()

@api_router.get("/timetables/{class_id}/image")
async def view_timetable_image(class_id: str, request: Request):
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    if session["role"] == "admin":
        if not await _get_admin_class(class_id, session["user_id"]):
            raise HTTPException(status_code=403, detail="You cannot view this timetable")
    elif session["role"] == "student":
        student = await get_current_student(request)
        if student["class_id"] != class_id:
            raise HTTPException(status_code=403, detail="You cannot view this timetable")
    else:
        raise HTTPException(status_code=403, detail="You cannot view this timetable")
    timetable = await db.timetables.find_one({"class_id": class_id}, {"_id": 0})
    if not timetable:
        raise HTTPException(status_code=404, detail="No timetable uploaded yet")
    image_path = Path(timetable["image_path"])
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Timetable image not found")
    return FileResponse(
        image_path, 
        media_type=timetable.get("mime_type", "image/jpeg"), 
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "private, no-cache, no-store, must-revalidate"
        }
    )

@api_router.get("/timetables/{class_id}/history")
async def timetable_history(class_id: str, request: Request):
    admin = await get_current_admin(request)
    if not await _get_admin_class(class_id, admin["id"]):
        raise HTTPException(status_code=404, detail="Class not found")
    history = await db.timetable_history.find({"class_id": class_id}, {"_id": 0}).sort("performed_at", -1).to_list(1000)
    return APIResponse(success=True, message="Timetable history", data={"history": history}).model_dump()

@api_router.delete("/timetables/{class_id}")
async def delete_timetable(class_id: str, request: Request):
    admin = await get_current_admin(request)
    if not await _get_admin_class(class_id, admin["id"]):
        raise HTTPException(status_code=404, detail="Class not found")
    timetable = await db.timetables.find_one({"class_id": class_id}, {"_id": 0})
    if not timetable:
        raise HTTPException(status_code=404, detail="No timetable uploaded yet")
    now = datetime.now(timezone.utc).isoformat()
    await db.timetable_history.insert_one({
        "history_id": str(uuid.uuid4()), "timetable_id": timetable["timetable_id"], "class_id": class_id,
        "action_type": "deleted", "performed_by": admin["id"], "performed_at": now,
        "previous_file": timetable.get("filename"), "current_file": None, "version": timetable["version"],
    })
    await db.timetables.delete_one({"class_id": class_id})
    image_path = Path(timetable.get("image_path", ""))
    if image_path.exists():
        image_path.unlink()
    await _notify_class_students(class_id, "Timetable deleted", "🕒 Timetable deleted.", "timetable", "/student/dashboard")
    return APIResponse(success=True, message="Timetable deleted").model_dump()

@api_router.get("/student/timetable")
async def student_timetable(request: Request):
    student = await get_current_student(request)
    timetable = await db.timetables.find_one({"class_id": student["class_id"]}, {"_id": 0})
    return APIResponse(
        success=True,
        message="Student timetable",
        data={
            "timetable": _timetable_response(timetable) if timetable else None,
            "day_order": await _get_day_order_setting(),
        }
    ).model_dump()

@api_router.get("/settings/day-order")
async def get_day_order(request: Request):
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    return APIResponse(
        success=True,
        message="Current day order",
        data={"day_order": await _get_day_order_setting(), "valid_day_orders": VALID_DAY_ORDERS}
    ).model_dump()

@api_router.put("/settings/day-order")
async def update_day_order(body: DayOrderUpdate, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")
    day_order = await _set_day_order_setting(body.day_order, admin["id"])
    return APIResponse(
        success=True,
        message=f"Today's Day Order set to Day {body.day_order}",
        data={"day_order": day_order, "valid_day_orders": VALID_DAY_ORDERS}
    ).model_dump()

@api_router.get("/settings/onboarding")
async def get_onboarding_settings(request: Request):
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    return APIResponse(
        success=True,
        message="Onboarding settings",
        data=await _get_onboarding_settings()
    ).model_dump()

@api_router.put("/settings/onboarding")
async def update_onboarding_settings(body: OnboardingSettingsUpdate, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")
    settings = {
        "key": "onboarding",
        "enableOnboarding": body.enableOnboarding,
        "onboardingMode": body.onboardingMode,
        "updated_by": admin["id"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.settings.update_one(
        {"key": "onboarding"},
        {"$set": settings},
        upsert=True
    )
    return APIResponse(
        success=True,
        message="Onboarding settings updated",
        data={"enableOnboarding": body.enableOnboarding, "onboardingMode": body.onboardingMode}
    ).model_dump()

@api_router.post("/settings/onboarding/reset-students")
async def reset_student_onboarding(request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")
    result = await db.students.update_many(
        {},
        {"$set": {
            "hasCompletedOnboarding": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return APIResponse(
        success=True,
        message="Student onboarding reset",
        data={"matched": result.matched_count, "modified": result.modified_count}
    ).model_dump()

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
    admin = await get_current_admin(request)
    if not subject.name:
        return APIResponse(success=False, message="Subject name is required").model_dump()
    existing = await db.resource_subjects.find_one({"name": subject.name}, {"_id": 0})
    if existing:
        return APIResponse(success=False, message="Subject already exists").model_dump()
    subject_doc = {
        "id": str(uuid.uuid4()),
        "name": subject.name,
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.resource_subjects.insert_one(subject_doc)
    return APIResponse(success=True, message="Subject created", data={"subject": subject_doc}).model_dump()

@api_router.get("/resources/subjects")
async def list_resource_subjects(request: Request):
    access_query = await _resource_list_query_for_request(request)
    subjects = await db.resource_subjects.find({}, {"_id": 0}).to_list(1000)
    for subj in subjects:
        subj["categories"] = VALID_RESOURCE_CATEGORIES
        subj["resource_count"] = await db.resources.count_documents({"$and": [{"subject_id": subj["id"]}, access_query]})
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
    access_query = await _resource_list_query_for_request(request)
    filters = []
    if subject_id:
        filters.append({"subject_id": subject_id})
    if category:
        filters.append({"category": category})
    if search:
        regex = {"$regex": search, "$options": "i"}
        filters.append({"$or": [
            {"displayName": regex},
            {"filename": regex},
            {"category": regex},
            {"subject_name": regex},
        ]})
    query = {"$and": [access_query, *filters]} if filters else access_query
    resources = await db.resources.find(query, {"_id": 0}).to_list(1000)
    return APIResponse(success=True, message="Resources retrieved", data={"resources": [await _build_resource_response(r) for r in resources]}).model_dump()

@api_router.get("/resources/{resource_id}")
async def get_resource_metadata(resource_id: str, request: Request):
    resource = await _get_accessible_resource(request, resource_id)
    return APIResponse(success=True, message="Resource retrieved", data={"resource": await _build_resource_response(resource)}).model_dump()

@api_router.get("/resources/{resource_id}/download")
async def download_resource(resource_id: str, request: Request):
    resource = await _get_accessible_resource(request, resource_id)
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
    resource = await _get_accessible_resource(request, resource_id)
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
        return APIResponse(success=False, message=RESOURCE_UNSUPPORTED_MESSAGE).model_dump()
    mime_type = _resource_mime_for_validation(filename, file.content_type)
    if mime_type not in RESOURCE_FILE_TYPES[ext]["mimeTypes"]:
        return APIResponse(success=False, message=RESOURCE_UNSUPPORTED_MESSAGE).model_dump()
    resource_id = str(uuid.uuid4())
    storage_dir = await _ensure_resource_storage_dir()
    subject_dir = storage_dir / subject_id
    subject_dir.mkdir(parents=True, exist_ok=True)
    disk_name = f"{resource_id}.{ext}"
    disk_path = subject_dir / disk_name
    
    # Stream the uploaded file in chunks to validate size without exhausting memory
    chunk_size = 1024 * 1024  # 1 MB chunks
    size = 0
    try:
        with open(disk_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                size += len(chunk)
                if size > 50 * 1024 * 1024:
                    f.close()
                    if disk_path.exists():
                        disk_path.unlink()
                    return APIResponse(success=False, message="Resource file must be 50 MB or smaller").model_dump()
                f.write(chunk)
    except Exception as e:
        if disk_path.exists():
            disk_path.unlink()
        raise e

    resource_doc = {
        "id": resource_id,
        "filename": filename,
        "displayName": displayName.strip() if displayName and displayName.strip() else filename,
        "subject_id": subject_id,
        "subject_name": subject["name"],
        "category": category,
        "fileType": ext,
        "mimeType": mime_type,
        "fileSize": size,
        "uploadedBy": admin.get("email", admin.get("name", "admin")),
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "downloadCount": 0,
        "file_path": str(disk_path),
    }
    await db.resources.insert_one(resource_doc)
    
    # Notify students: e.g. "📚 Python Unit 3 Notes added."
    display_name = resource_doc["displayName"]
    subject_name = resource_doc["subject_name"]
    await _notify_all_students(
        title="Resource uploaded",
        message=f"📚 {subject_name} {display_name} added.",
        type="resource",
        link="/student/resources"
    )

    return APIResponse(success=True, message="Resource uploaded", data={"resource": await _build_resource_response(resource_doc)}).model_dump()

@api_router.put("/resources/{resource_id}/replace")
async def replace_resource(request: Request, resource_id: str, file: UploadFile = File(...)):
    admin = await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    subject = await db.resource_subjects.find_one({"id": resource["subject_id"]}, {"_id": 0})
    if not subject or subject.get("admin_id") != admin["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this resource")
    filename = _sanitize_filename(file.filename)
    ext = _get_file_extension(filename)
    if ext not in ALLOWED_RESOURCE_EXTENSIONS:
        return APIResponse(success=False, message=RESOURCE_UNSUPPORTED_MESSAGE).model_dump()
    mime_type = _resource_mime_for_validation(filename, file.content_type)
    if mime_type not in RESOURCE_FILE_TYPES[ext]["mimeTypes"]:
        return APIResponse(success=False, message=RESOURCE_UNSUPPORTED_MESSAGE).model_dump()
    storage_dir = await _ensure_resource_storage_dir()
    subject_dir = Path(resource.get("file_path", "")).parent
    subject_dir.mkdir(parents=True, exist_ok=True)
    disk_name = f"{resource_id}.{ext}"
    disk_path = subject_dir / disk_name
    old_file_path = Path(resource.get("file_path", ""))

    # Stream the uploaded replacement file in chunks to validate size without OOM
    temp_path = disk_path.with_suffix(".tmp")
    chunk_size = 1024 * 1024  # 1 MB chunks
    size = 0
    try:
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                size += len(chunk)
                if size > 50 * 1024 * 1024:
                    f.close()
                    if temp_path.exists():
                        temp_path.unlink()
                    return APIResponse(success=False, message="Resource file must be 50 MB or smaller").model_dump()
                f.write(chunk)
        
        # Swapping files safely once we know the upload is valid
        if old_file_path.exists() and old_file_path != disk_path:
            old_file_path.unlink()
        if temp_path.exists():
            if disk_path.exists():
                disk_path.unlink()
            temp_path.rename(disk_path)
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise e

    # Update database record to reflect new size and potential path/type modifications
    await db.resources.update_one(
        {"id": resource_id},
        {
            "$set": {
                "filename": filename,
                "fileType": ext,
                "mimeType": mime_type,
                "fileSize": size,
                "file_path": str(disk_path),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
            }
        }
    )
    
    updated_resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    return APIResponse(success=True, message="Resource replaced", data={"resource": await _build_resource_response(updated_resource)}).model_dump()

@api_router.put("/resources/{resource_id}/rename")
async def rename_resource(resource_id: str, data: ResourceRename, request: Request):
    admin = await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    subject = await db.resource_subjects.find_one({"id": resource["subject_id"]}, {"_id": 0})
    if not subject or subject.get("admin_id") != admin["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this resource")

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, request: Request):
    admin = await get_current_admin(request)
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        return APIResponse(success=False, message="Resource not found").model_dump()
    subject = await db.resource_subjects.find_one({"id": resource["subject_id"]}, {"_id": 0})
    if not subject or subject.get("admin_id") != admin["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this resource")
    file_path = Path(resource.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
    await db.resources.delete_one({"id": resource_id})
    return APIResponse(success=True, message="Resource deleted").model_dump()

@api_router.get("/announcements")
async def list_announcements(request: Request, class_id: Optional[str] = None):
    admin = await get_current_admin(request)
    owned_classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    class_map = {item["id"]: item["name"] for item in owned_classes}
    if class_id and class_id not in class_map:
        raise HTTPException(status_code=404, detail="Class not found")
    query = {"class_id": class_id} if class_id else {"class_id": {"$in": list(class_map)}}
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for item in announcements:
        item["class_name"] = class_map.get(item["class_id"], "Unknown")
        item["description"] = item.get("description") or item.get("message", "")
    return APIResponse(success=True, message="Announcements retrieved", data={"announcements": announcements}).model_dump()

@api_router.post("/announcements")
async def publish_announcement(announcement: AnnouncementCreate, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(announcement.class_id, admin["id"])
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    title = announcement.title.strip()
    description = announcement.description.strip()
    if not title or not description:
        raise HTTPException(status_code=400, detail="Title and description are required")
    created_at = datetime.now(timezone.utc).isoformat()
    announcement_doc = {
        "id": str(uuid.uuid4()), "class_id": announcement.class_id, "title": title,
        "description": description, "created_by": admin["id"], "created_at": created_at,
        "updated_at": created_at,
    }
    await db.announcements.insert_one(announcement_doc)
    await _notify_class_students(
        announcement.class_id, "New announcement", f"📢 {title}", "announcement", "/student/dashboard"
    )
    return APIResponse(success=True, message="Announcement created", data={"announcement": announcement_doc}).model_dump()

@api_router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, body: AnnouncementUpdate, request: Request):
    admin = await get_current_admin(request)
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    if not announcement or not await _get_admin_class(announcement["class_id"], admin["id"]):
        raise HTTPException(status_code=404, detail="Announcement not found")
    title, description = body.title.strip(), body.description.strip()
    if not title or not description:
        raise HTTPException(status_code=400, detail="Title and description are required")
    await db.announcements.update_one({"id": announcement_id}, {"$set": {
        "title": title, "description": description, "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return APIResponse(success=True, message="Announcement updated").model_dump()

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, request: Request):
    admin = await get_current_admin(request)
    announcement = await db.announcements.find_one({"id": announcement_id}, {"_id": 0})
    if not announcement or not await _get_admin_class(announcement["class_id"], admin["id"]):
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.announcements.delete_one({"id": announcement_id})
    return APIResponse(success=True, message="Announcement deleted").model_dump()

@api_router.get("/student/announcements")
async def student_announcements(request: Request, limit: int = 5):
    student = await get_current_student(request)
    safe_limit = min(max(limit, 1), 50)
    announcements = await db.announcements.find({"class_id": student["class_id"]}, {"_id": 0}).sort("created_at", -1).to_list(safe_limit)
    for item in announcements:
        item["description"] = item.get("description") or item.get("message", "")
    return APIResponse(success=True, message="Latest announcements", data={"announcements": announcements}).model_dump()

@api_router.put("/classes/{class_id}")
async def update_class(class_id: str, data: ClassUpdate, request: Request):
    admin = await get_current_admin(request)
    
    # Check if a duplicate class exists (excluding this one)
    existing_dup = await db.classes.find_one({
        "id": {"$ne": class_id},
        "admin_id": admin["id"],
        "department": data.department,
        "year": data.year,
        "section": data.section,
        "semester": data.semester,
        **active_class_filter()
    })
    
    if existing_dup:
        raise HTTPException(
            status_code=409,
            detail="A class with these details already exists."
        )

    # Check current enrollment against new max_students
    current_students = await db.students.count_documents({"class_id": class_id})
    if data.max_students < current_students:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce capacity below current enrollment ({current_students})."
        )

    result = await db.classes.update_one(
        {"id": class_id, "admin_id": admin["id"]},
        {"$set": {
            "name": data.name,
            "department": data.department,
            "year": data.year,
            "section": data.section,
            "semester": data.semester,
            "academic_year": data.academic_year,
            "max_students": data.max_students
        }}
    )
    if result.matched_count == 0:
        return APIResponse(success=False, message="Class not found").model_dump()
    return APIResponse(success=True, message="Class updated").model_dump()

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
        updated = await db.classes.find_one({"id": class_id, "admin_id": admin["id"], **active_class_filter()}, {"_id": 0})
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
        "roll_number": student.roll_number.strip().upper()
    }, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Student with this roll number already exists in this class."
        )

    current_students = await db.students.count_documents({"class_id": class_id})
    max_students = class_doc.get("max_students", 100)
    if current_students >= max_students:
        raise HTTPException(
            status_code=400,
            detail=f"Class has reached its maximum capacity of {max_students} students."
        )

    temp_pwd = student.password or student.roll_number
    pwd_hash = pwd_context.hash(temp_pwd)
    must_change = student.password is None
    now_iso = datetime.now(timezone.utc).isoformat()
    student_doc = {
        "id": str(uuid.uuid4()),
        "class_id": class_id,
        "name": student.name,
        "roll_number": student.roll_number,
        "password_hash": pwd_hash,
        "must_change_password": must_change,
        "hasCompletedOnboarding": False,
        "created_at": now_iso,
        "updated_at": now_iso,
        "added_at": now_iso,
    }
    await db.students.insert_one(student_doc)

    response_data = {
        "id": student_doc["id"],
        "class_id": student_doc["class_id"],
        "name": student_doc["name"],
        "roll_number": student_doc["roll_number"],
        "added_at": student_doc["added_at"]
    }
    # Include temporary password only when it was auto‑generated
    if student.password is None:
        response_data["temporary_password"] = temp_pwd
    return APIResponse(
        success=True,
        message="Student added",
        data=response_data
    ).model_dump()

@api_router.get("/classes/{class_id}/students")
async def list_students(class_id: str, request: Request):
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(None)
    records_by_student = {student["id"]: [] for student in students}
    for record in records:
        if record["student_id"] in records_by_student:
            records_by_student[record["student_id"]].append(record)
    for student in students:
        summary = _build_attendance_summary(records_by_student.get(student["id"], []))
        student["attendance"] = {
            "percentage": summary["percentage"],
            "status": summary["status"],
            "total_periods": summary["total_periods"],
            "present_count": summary["present_count"],
            "last_updated": summary["last_updated"],
        }
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
    # Also prune orphaned sessions and notifications for this student
    await db.sessions.delete_many({"user_id": student_id})
    await db.notifications.delete_many({"student_id": student_id})
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
    class_doc = await db.classes.find_one({"join_code": join_code.upper(), **active_class_filter()}, {"_id": 0})
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
async def join_class(request: Request, req: JoinClassRequest):
    ip = (request.client.host if request.client else "unknown")
    if not _join_limiter.is_allowed(ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.")
    class_doc = await db.classes.find_one({"join_code": req.join_code, **active_class_filter()}, {"_id": 0})
    if not class_doc:
        return APIResponse(success=False, message="Invalid join code").model_dump()
    if class_doc.get("join_enabled") is False:
        return APIResponse(success=False, message="Join link is currently disabled for this class").model_dump()

    roll_number = req.roll_number.strip().upper()

    existing = await db.students.find_one({
        "class_id": class_doc["id"],
        "roll_number": roll_number
    }, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Student with this roll number already exists in this class."
        )

    max_students = class_doc.get("max_students", 100)
    current_students = await db.students.count_documents({"class_id": class_doc["id"]})
    if current_students >= max_students:
        raise HTTPException(
            status_code=400,
            detail=f"Class has reached its maximum capacity of {max_students} students."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    student_doc = {
        "id": str(uuid.uuid4()),
        "class_id": class_doc["id"],
        "name": req.name,
        "roll_number": roll_number,
        "password_hash": pwd_context.hash(req.password),
        "must_change_password": False,
        "hasCompletedOnboarding": False,
        "created_at": now_iso,
        "updated_at": now_iso,
        "added_at": now_iso,
    }
    await db.students.insert_one(student_doc)

    return APIResponse(
        success=True,
        message="Successfully joined class",
        data={
            "class_name": class_doc["name"],
            "student_name": req.name,
            "roll_number": roll_number
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
    _validate_attendance_payload(attendance.date, attendance.period_number, attendance.records)

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
    else:
        student_ids = []

    previous_summaries = await _attendance_summaries_for_students(attendance.class_id, student_ids)
    reason_by_student = {}

    records_to_insert = []
    for record in attendance.records:
        status = record["status"]
        reason_by_student[record["student_id"]] = f"Marked {status} for period {attendance.period_number}."
        records_to_insert.append({
            "id": str(uuid.uuid4()),
            "class_id": attendance.class_id,
            "student_id": record["student_id"],
            "date": attendance.date,
            "period_number": attendance.period_number,
            "status": status,
            "marked_at": datetime.now(timezone.utc).isoformat()
        })

    if records_to_insert:
        await db.attendance.insert_many(records_to_insert)
        await _record_attendance_change_events(attendance.class_id, student_ids, previous_summaries, reason_by_student)
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
    _validate_attendance_payload(attendance.date, attendance.period_number, attendance.records)

    # --- Snapshot existing records before deletion (for audit diff) ---
    old_records = await db.attendance.find({
        "class_id": attendance.class_id,
        "date": attendance.date,
        "period_number": attendance.period_number
    }, {"_id": 0}).to_list(1000)
    old_status_map = {r["student_id"]: r["status"] for r in old_records}
    affected_student_ids = sorted(set(old_status_map.keys()) | {record["student_id"] for record in attendance.records})
    previous_summaries = await _attendance_summaries_for_students(attendance.class_id, affected_student_ids)

    # --- Delete existing records for this class/date/period ---
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

    # Build student roll_number lookup for audit
    all_students = await db.students.find({"class_id": attendance.class_id}, {"_id": 0}).to_list(1000)
    student_info = {s["id"]: {"roll_number": s["roll_number"], "name": s["name"]} for s in all_students}

    # --- Insert updated records ---
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

    # --- Build diff of changed students ---
    new_status_map = {r["student_id"]: r["status"] for r in records_to_insert}
    all_sids = set(old_status_map.keys()) | set(new_status_map.keys())
    changes = []
    reason_by_student = {}
    for sid in all_sids:
        old_s = old_status_map.get(sid)
        new_s = new_status_map.get(sid)
        if old_s != new_s:
            if old_s and new_s:
                reason_by_student[sid] = f"Period {attendance.period_number} changed from {old_s} to {new_s}."
            elif new_s:
                reason_by_student[sid] = f"Marked {new_s} for period {attendance.period_number}."
            else:
                reason_by_student[sid] = f"Period {attendance.period_number} attendance was removed."
            changes.append({
                "student_id": sid,
                "roll_number": student_info.get(sid, {}).get("roll_number", ""),
                "name": student_info.get(sid, {}).get("name", ""),
                "old_status": old_s,
                "new_status": new_s,
            })

    # --- Write audit log ---
    await db.audit_logs.insert_one({
        "action": "attendance_updated",
        "class_id": attendance.class_id,
        "class_name": class_doc.get("name", "Unknown"),
        "date": attendance.date,
        "period": attendance.period_number,
        "edited_by": admin["id"],
        "edited_by_role": admin.get("role", "admin"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_students": len(records_to_insert),
        "changes_count": len(changes),
        "changes": changes
    })
    await _record_attendance_change_events(attendance.class_id, affected_student_ids, previous_summaries, reason_by_student)

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
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(None)
    return APIResponse(success=True, message="Attendance retrieved", data={"attendance": records}).model_dump()

@api_router.get("/attendance/report/{class_id}")
async def get_attendance_report(class_id: str, request: Request):
    """Get per-student attendance summary with percentages"""
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(class_id, admin["id"])
    if not class_doc:
        return APIResponse(success=False, message="Class not found").model_dump()
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(None)

    records_by_student = {}
    student_map = {}
    for s in students:
        student_map[s["id"]] = {"name": s["name"], "roll_number": s["roll_number"]}
        records_by_student[s["id"]] = []
    for r in records:
        if r["student_id"] in records_by_student:
            records_by_student[r["student_id"]].append(r)

    summaries = []
    for sid, s in student_map.items():
        summary = _build_attendance_summary(records_by_student.get(sid, []))
        summaries.append({
            **s,
            "present": summary["present_count"] - summary["od_count"],
            "absent": summary["absent_count"],
            "od": summary["od_count"],
            "total": summary["total_periods"],
            "attended": summary["attended"],
            "percentage": summary["percentage"],
            "status": summary["status"],
            "is_eligible": summary["is_eligible"],
        })
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
    records = await db.attendance.find({"class_id": class_id}, {"_id": 0}).to_list(None)

    records_by_student = {}
    student_map = {}
    for s in students:
        student_map[s["id"]] = {"name": s["name"], "roll_number": s["roll_number"]}
        records_by_student[s["id"]] = []
    for r in records:
        if r["student_id"] in records_by_student:
            records_by_student[r["student_id"]].append(r)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll Number", "Name", "Present", "Absent", "OD", "Total Periods", "Attended (Present+OD)", "Percentage", "Status"])
    for sid, s in sorted(student_map.items(), key=lambda x: x[1]["roll_number"]):
        summary = _build_attendance_summary(records_by_student.get(sid, []))
        writer.writerow([
            s["roll_number"],
            s["name"],
            summary["present_count"] - summary["od_count"],
            summary["absent_count"],
            summary["od_count"],
            summary["total_periods"],
            summary["attended"],
            f"{summary['percentage']}%",
            summary["status"],
        ])

    output.seek(0)
    filename = f"attendance_{cls['code']}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# ===========================
# Student Dashboard Endpoint
# ===========================

@api_router.get("/student/dashboard")
async def student_dashboard(request: Request):
    student = await get_current_student(request)
    class_doc = await db.classes.find_one({"id": student["class_id"], **active_class_filter()}, {"_id": 0})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get all attendance records for this student
    records = await db.attendance.find({
        "student_id": student["id"],
        "class_id": student["class_id"]
    }, {"_id": 0}).to_list(None)
    attendance_summary = _build_attendance_summary(records)

    total_periods = attendance_summary["total_periods"]
    present_count = attendance_summary["present_count"]
    absent_count = attendance_summary["absent_count"]
    od_count = attendance_summary["od_count"]

    # Raw percentage for threshold logic — never round before comparing
    raw_percentage = attendance_summary["percentage"]
    # Display percentage — 2 decimal places for transparency
    percentage = attendance_summary["percentage"]
    is_eligible = attendance_summary["is_eligible"]

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
    today_records = attendance_summary["today_records"]

    # Classmates
    classmates = await db.students.find({"class_id": student["class_id"]}, {"_id": 0}).to_list(1000)
    classmates_list = [{"name": c["name"], "roll_number": c["roll_number"]} for c in classmates]

    # Sort records by date desc, period desc
    records = attendance_summary["history"]

    # Latest announcements for this class
    raw_announcements = await db.announcements.find(
        {"class_id": student["class_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    for item in raw_announcements:
        item["description"] = item.get("description") or item.get("message", "")

    # Current timetable for this class
    timetable_doc = await db.timetables.find_one({"class_id": student["class_id"]}, {"_id": 0})
    timetable_data = _timetable_response(timetable_doc) if timetable_doc else None
    day_order = await _get_day_order_setting()
    attendance_change = await _consume_latest_attendance_change(student["id"])

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
                "total_working_hours": total_periods,
                "working_hours_attended": present_count,
                "absent_count": absent_count,
                "od_count": od_count,
                "percentage": percentage,
                "status": attendance_summary["status"],
                "last_updated": attendance_summary["last_updated"],
                "is_eligible": is_eligible,
                "periods_needed_for_75": periods_needed,
            },
            "today": today_records,
            "history": records,
            "classmates": classmates_list,
            "announcements": raw_announcements,
            "timetable": timetable_data,
            "day_order": day_order,
            "attendance_change": attendance_change,
        }
    ).model_dump()

# ===========================
# Profile Endpoints
# ===========================

@api_router.get("/student/profile")
async def student_profile(request: Request):
    student = await get_current_student(request)
    class_doc = await db.classes.find_one({"id": student["class_id"], **active_class_filter()}, {"_id": 0})
    records = await db.attendance.find(
        {"student_id": student["id"], "class_id": student["class_id"]}, {"_id": 0}
    ).to_list(None)
    attendance_summary = _build_attendance_summary(records)
    profile = {
        "name": student["name"], "roll_number": student["roll_number"],
        "class": {"id": class_doc["id"], "name": class_doc["name"], "code": class_doc["code"]} if class_doc else None,
        "attendance_percentage": attendance_summary["percentage"],
        "attendance_status": attendance_summary["status"],
        "attendance_last_updated": attendance_summary["last_updated"],
        "account": {"role": "student", "joined_at": student.get("added_at")},
    }
    return APIResponse(success=True, message="Student profile", data={"profile": profile}).model_dump()

@api_router.get("/admin/profile")
async def admin_profile(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0}).to_list(1000)
    profile = {
        "id": admin["id"],
        "name": admin.get("name", ""),
        "email": admin.get("email", ""),
        "role": "Admin",
        "picture": admin.get("picture", ""),
        "account": {"created_at": admin.get("created_at")},
        "managed_classes": classes
    }
    return APIResponse(success=True, message="Profile fetched successfully", data={"profile": profile}).model_dump()

# ===========================
# Admin Dashboard Stats
# ===========================

@api_router.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    admin = await get_current_admin(request)
    classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0}).to_list(1000)

    # Use aggregation to avoid N+1 count queries
    class_ids = [c["id"] for c in classes]
    s_agg = db.students.aggregate([{"$match": {"class_id": {"$in": class_ids}}}, {"$count": "total"}])
    total_students = 0
    async for doc in s_agg:
        total_students = doc.get("total", 0)

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
            "day_order": await _get_day_order_setting(),
            "valid_day_orders": VALID_DAY_ORDERS,
        }
    ).model_dump()

# ===========================
# Reports / Feedback Endpoints
# ===========================

@api_router.post("/reports")
async def create_report(report: ReportCreate, request: Request):
    ip_address = request.client.host if request.client else "unknown"
    if not _report_limiter.is_allowed(ip_address):
        raise HTTPException(status_code=429, detail="Too many report submissions. Please try again later.")
    actor = await _get_report_actor(request)
    if actor["role"] not in {"student", "admin"}:
        raise HTTPException(status_code=403, detail="Students and admins only")

    title = report.title.strip()
    description = report.description.strip()
    if not title or not description:
        raise HTTPException(status_code=400, detail="Title and description are required")

    report_doc = {
        "report_id": str(uuid.uuid4()),
        "user_id": actor["id"],
        "user_name": actor["name"],
        "user_role": actor["role"],
        "type": report.type,
        "page": report.page.strip(),
        "title": title,
        "description": description,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reports.insert_one(report_doc.copy())
    asyncio.create_task(asyncio.to_thread(_send_report_email, report_doc))
    return APIResponse(success=True, message="Report submitted", data={"report": report_doc}).model_dump()

@api_router.get("/reports")
async def list_reports(request: Request, type: Optional[Literal['bug', 'feature_request', 'problem', 'suggestion']] = None):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")

    query = {}
    if type:
        query["type"] = type
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return APIResponse(success=True, message="Reports retrieved", data={"reports": reports}).model_dump()

@api_router.put("/reports/{report_id}/status")
async def update_report_status(report_id: str, data: ReportStatusUpdate, request: Request):
    admin = await get_current_admin(request)
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required.")

    result = await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return APIResponse(success=True, message="Report status updated").model_dump()

# ===========================
# Academic Updates Endpoints
# ===========================

@api_router.get("/academic-updates")
async def list_academic_updates(request: Request, class_id: Optional[str] = None):
    """List academic updates for admin's classes (optional class_id filter)"""
    admin = await get_current_admin(request)
    owned_classes = await db.classes.find({"admin_id": admin["id"], **active_class_filter()}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    class_map = {item["id"]: item["name"] for item in owned_classes}
    if class_id and class_id not in class_map:
        raise HTTPException(status_code=404, detail="Class not found")
    query = {"class_id": class_id} if class_id else {"class_id": {"$in": list(class_map)}}
    updates = await db.academic_updates.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for item in updates:
        item["class_name"] = class_map.get(item["class_id"], "Unknown")
    return APIResponse(success=True, message="Academic updates retrieved", data={"updates": updates}).model_dump()

@api_router.post("/academic-updates")
async def create_academic_update(body: AcademicUpdateCreate, request: Request):
    """Create a new academic update and notify class students"""
    admin = await get_current_admin(request)
    class_doc = await _get_admin_class(body.class_id, admin["id"])
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    title = body.title.strip()
    description = body.description.strip()
    subject = body.subject.strip()
    if not title or not description or not subject:
        raise HTTPException(status_code=400, detail="Subject, title, and description are required")
    now = datetime.now(timezone.utc).isoformat()
    update_doc = {
        "id": str(uuid.uuid4()),
        "class_id": body.class_id,
        "type": body.type,
        "subject": subject,
        "title": title,
        "description": description,
        "due_date": body.due_date,
        "resources": body.resources or [],
        "created_by": admin["id"],
        "created_at": now,
        "updated_at": now,
    }
    await db.academic_updates.insert_one(update_doc)
    # Notification with contextual emoji
    type_emojis = {
        "TEST": "📝", "STUDY": "📖", "TASK": "📋",
        "INSTRUCTION": "📌", "PURCHASE": "🛒",
        "MISSED_CLASS": "🔄", "REMINDER": "⏰",
    }
    emoji = type_emojis.get(body.type, "📢")
    notify_msg = f"{emoji} {subject}: {title}"
    await _notify_class_students(
        body.class_id, "Academic Update", notify_msg, "academic", "/student/academic-updates"
    )
    update_doc["class_name"] = class_doc["name"]
    return APIResponse(success=True, message="Academic update created", data={"update": update_doc}).model_dump()

@api_router.put("/academic-updates/{update_id}")
async def edit_academic_update(update_id: str, body: AcademicUpdateEdit, request: Request):
    """Edit an existing academic update"""
    admin = await get_current_admin(request)
    existing = await db.academic_updates.find_one({"id": update_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Academic update not found")
    if not await _get_admin_class(existing["class_id"], admin["id"]):
        raise HTTPException(status_code=403, detail="You cannot edit this update")
    title = body.title.strip()
    description = body.description.strip()
    subject = body.subject.strip()
    if not title or not description or not subject:
        raise HTTPException(status_code=400, detail="Subject, title, and description are required")
    await db.academic_updates.update_one({"id": update_id}, {"$set": {
        "type": body.type,
        "subject": subject,
        "title": title,
        "description": description,
        "due_date": body.due_date,
        "resources": body.resources or [],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return APIResponse(success=True, message="Academic update updated").model_dump()

@api_router.delete("/academic-updates/{update_id}")
async def delete_academic_update(update_id: str, request: Request):
    """Delete an academic update"""
    admin = await get_current_admin(request)
    existing = await db.academic_updates.find_one({"id": update_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Academic update not found")
    if not await _get_admin_class(existing["class_id"], admin["id"]):
        raise HTTPException(status_code=403, detail="You cannot delete this update")
    await db.academic_updates.delete_one({"id": update_id})
    return APIResponse(success=True, message="Academic update deleted").model_dump()

@api_router.get("/student/academic-updates")
async def student_academic_updates(request: Request):
    """Get academic updates for the student's class, organized into human-readable sections"""
    student = await get_current_student(request)
    all_updates = await db.academic_updates.find(
        {"class_id": student["class_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    # Resolve linked resource names for display
    all_resource_ids = set()
    for u in all_updates:
        for rid in u.get("resources", []):
            all_resource_ids.add(rid)
    resource_map = {}
    if all_resource_ids:
        resources = await db.resources.find(
            {"id": {"$in": list(all_resource_ids)}},
            {"_id": 0, "id": 1, "displayName": 1, "filename": 1, "mimeType": 1, "fileType": 1}
        ).to_list(1000)
        resource_map = {r["id"]: r for r in resources}

    # Attach resolved resource info to each update
    for u in all_updates:
        resolved = []
        for rid in u.get("resources", []):
            r = resource_map.get(rid)
            if r:
                resolved.append({
                    "id": r["id"],
                    "name": r.get("displayName") or r.get("filename", "File"),
                    "fileType": r.get("fileType", ""),
                })
        u["resolved_resources"] = resolved

    # Organize into student-facing sections
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    try:
        today_dt = datetime.strptime(today, '%Y-%m-%d')
    except ValueError:
        today_dt = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = (today_dt + timedelta(days=1)).strftime('%Y-%m-%d')
    upcoming_limit = (today_dt + timedelta(days=3)).strftime('%Y-%m-%d')

    tomorrows_tests = []
    what_to_study = []
    pending_work = []
    faculty_instructions = []
    missed_while_absent = []

    for u in all_updates:
        utype = u.get("type", "")
        due = u.get("due_date")

        if utype == "TEST":
            tomorrows_tests.append(u)
        elif utype == "STUDY":
            what_to_study.append(u)
        elif utype == "TASK":
            pending_work.append(u)
        elif utype in ("INSTRUCTION", "PURCHASE"):
            faculty_instructions.append(u)
        elif utype == "MISSED_CLASS":
            missed_while_absent.append(u)
        elif utype == "REMINDER":
            # Reminders go to the most relevant section
            if due:
                tomorrows_tests.append(u)
            else:
                faculty_instructions.append(u)

    return APIResponse(
        success=True,
        message="Student academic updates",
        data={
            "tomorrows_tests": tomorrows_tests,
            "what_to_study": what_to_study,
            "pending_work": pending_work,
            "faculty_instructions": faculty_instructions,
            "missed_while_absent": missed_while_absent,
        }
    ).model_dump()

# ===========================
# Analytics Endpoints
# ===========================

async def _require_super_admin(request: Request) -> dict:
    """Dependency: requires valid session with role == super_admin. Returns admin record."""
    session = await _get_valid_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    if session.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Analytics access is restricted to Super Admin.")
    admin = await db.admins.find_one({"id": session["user_id"]}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Analytics access is restricted to Super Admin.")
    return admin


def _period_to_start_dt(period: str) -> datetime:
    """Convert a period string to a UTC start datetime for filtering."""
    now = datetime.now(timezone.utc)
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "30d":
        return now - timedelta(days=30)
    # Default: 7d
    return now - timedelta(days=7)


@api_router.post("/analytics/event")
async def track_analytics_event(request: Request, body: AnalyticsEventCreate):
    """
    Record a product analytics event.
    - Requires valid authentication (any role).
    - user_id is always sourced from the authenticated session — never from request body.
    - Event name must be in the VALID_ANALYTICS_EVENTS allowlist.
    - Always returns 200 even on analytics failure (never blocks the user).
    """
    try:
        session = await _get_valid_session(request)
        if not session:
            return JSONResponse(status_code=200, content={"success": False, "message": "Not authenticated"})

        event_name = (body.event or "").strip()
        if event_name not in VALID_ANALYTICS_EVENTS:
            return JSONResponse(status_code=200, content={"success": False, "message": "Invalid event"})

        # Sanitize metadata — only store safe scalar values
        safe_metadata: dict = {}
        if body.metadata and isinstance(body.metadata, dict):
            for k, v in body.metadata.items():
                if isinstance(v, (str, int, float, bool)) and isinstance(k, str):
                    safe_metadata[str(k)[:64]] = v

        await db.analytics_events.insert_one({
            "user_id": session["user_id"],
            "user_role": session.get("role", "unknown"),
            "event": event_name,
            "timestamp": datetime.now(timezone.utc),
            "metadata": safe_metadata,
        })
        return {"success": True, "message": "Event recorded"}
    except Exception as exc:
        logger.warning(f"Analytics event recording failed (non-critical): {exc}")
        return {"success": False, "message": "Analytics unavailable"}


@api_router.get("/analytics/dashboard")
async def get_analytics_dashboard(request: Request, period: str = "7d"):
    """
    Super_Admin-only analytics dashboard.
    Returns dynamically computed metrics from the analytics_events collection.
    period: 'today' | '7d' (default) | '30d'
    """
    await _require_super_admin(request)

    try:
        valid_periods = {"today", "7d", "30d"}
        if period not in valid_periods:
            period = "7d"

        now = datetime.now(timezone.utc)
        period_start = _period_to_start_dt(period)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # ── Total students ──
        total_students = await db.students.count_documents({})

        # ── Active users today (distinct user_ids with events today) ──
        active_today_pipeline = [
            {"$match": {"timestamp": {"$gte": today_start}, "user_role": "student"}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "count"},
        ]
        active_today_result = await db.analytics_events.aggregate(active_today_pipeline).to_list(1)
        active_today = active_today_result[0]["count"] if active_today_result else 0

        # ── Active users in selected period ──
        active_period_pipeline = [
            {"$match": {"timestamp": {"$gte": period_start}, "user_role": "student"}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "count"},
        ]
        active_period_result = await db.analytics_events.aggregate(active_period_pipeline).to_list(1)
        active_in_period = active_period_result[0]["count"] if active_period_result else 0

        # ── Returning users: users who have events BOTH before and within the period ──
        # A returning user has at least one event before period_start AND one within period.
        returning_pipeline = [
            {"$match": {"user_role": "student"}},
            {
                "$group": {
                    "_id": "$user_id",
                    "has_before": {
                        "$sum": {"$cond": [{"$lt": ["$timestamp", period_start]}, 1, 0]}
                    },
                    "has_in_period": {
                        "$sum": {"$cond": [{"$gte": ["$timestamp", period_start]}, 1, 0]}
                    },
                }
            },
            {
                "$match": {
                    "has_before": {"$gt": 0},
                    "has_in_period": {"$gt": 0},
                }
            },
            {"$count": "count"},
        ]
        returning_result = await db.analytics_events.aggregate(returning_pipeline).to_list(1)
        returning_users = returning_result[0]["count"] if returning_result else 0

        # ── Feature usage: count distinct users per event in period ──
        feature_usage_pipeline = [
            {"$match": {"timestamp": {"$gte": period_start}, "user_role": "student",
                        "event": {"$ne": "login"}}},
            {
                "$group": {
                    "_id": {"event": "$event", "user_id": "$user_id"},
                }
            },
            {
                "$group": {
                    "_id": "$_id.event",
                    "unique_users": {"$sum": 1},
                }
            },
            {"$sort": {"unique_users": -1}},
        ]
        feature_usage_docs = await db.analytics_events.aggregate(feature_usage_pipeline).to_list(100)
        feature_usage = [{"event": d["_id"], "unique_users": d["unique_users"]} for d in feature_usage_docs]

        # ── Daily active users for last N days of the selected period ──
        # Determine the number of days to show
        if period == "today":
            days_to_show = 1
        elif period == "30d":
            days_to_show = 30
        else:
            days_to_show = 7

        daily_pipeline = [
            {"$match": {"timestamp": {"$gte": period_start}, "user_role": "student"}},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                        "user_id": "$user_id",
                    }
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "active_users": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        daily_docs = await db.analytics_events.aggregate(daily_pipeline).to_list(days_to_show + 5)
        daily_active_users = [{"date": d["_id"], "active_users": d["active_users"]} for d in daily_docs]

        # ── Total events in period ──
        total_events_in_period = await db.analytics_events.count_documents(
            {"timestamp": {"$gte": period_start}, "user_role": "student"}
        )

        return APIResponse(
            success=True,
            message="Analytics dashboard",
            data={
                "period": period,
                "period_start": period_start.isoformat(),
                "total_students": total_students,
                "active_today": active_today,
                "active_in_period": active_in_period,
                "returning_users": returning_users,
                "total_events_in_period": total_events_in_period,
                "feature_usage": feature_usage,
                "daily_active_users": daily_active_users,
            }
        ).model_dump()

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Analytics dashboard error: {exc}")
        raise HTTPException(status_code=500, detail="Analytics dashboard unavailable")


@api_router.get("/analytics/students")
async def get_analytics_students(request: Request, period: str = "7d"):
    """
    Super_Admin-only per-student activity view.
    Returns: for each student — name, roll_number, days_active_in_period, last_active, most_used_feature.
    period: 'today' | '7d' (default) | '30d'
    """
    await _require_super_admin(request)

    try:
        valid_periods = {"today", "7d", "30d"}
        if period not in valid_periods:
            period = "7d"

        period_start = _period_to_start_dt(period)

        # Get all students
        all_students = await db.students.find({}, {"_id": 0, "id": 1, "name": 1, "roll_number": 1}).to_list(10000)
        student_map = {s["id"]: s for s in all_students}
        student_ids = list(student_map.keys())

        if not student_ids:
            return APIResponse(
                success=True, message="Student analytics",
                data={"period": period, "students": []}
            ).model_dump()

        # Per-student aggregation: days active, last active, most-used feature
        pipeline = [
            {"$match": {"user_id": {"$in": student_ids}, "timestamp": {"$gte": period_start}}},
            {
                "$group": {
                    "_id": {
                        "user_id": "$user_id",
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                        "event": "$event",
                    },
                    "event_count": {"$sum": 1},
                    "last_ts": {"$max": "$timestamp"},
                }
            },
            {
                "$group": {
                    "_id": "$_id.user_id",
                    "days_active": {"$addToSet": "$_id.date"},
                    "last_active": {"$max": "$last_ts"},
                    "events": {
                        "$push": {
                            "event": "$_id.event",
                            "count": "$event_count",
                        }
                    },
                }
            },
        ]
        results = await db.analytics_events.aggregate(pipeline).to_list(len(student_ids) + 10)

        # Build result map
        analytics_by_student = {}
        for row in results:
            uid = row["_id"]
            days_active = len(row["days_active"])
            last_active = row["last_active"]
            # Most used feature (exclude 'login')
            feature_counts = {}
            for e in row["events"]:
                if e["event"] != "login":
                    feature_counts[e["event"]] = feature_counts.get(e["event"], 0) + e["count"]
            most_used = max(feature_counts, key=feature_counts.get) if feature_counts else None
            analytics_by_student[uid] = {
                "days_active_in_period": days_active,
                "last_active": last_active.isoformat() if last_active else None,
                "most_used_feature": most_used,
            }

        # Merge with student list
        students_out = []
        for student in all_students:
            sid = student["id"]
            a = analytics_by_student.get(sid, {})
            students_out.append({
                "student_id": sid,
                "name": student.get("name", ""),
                "roll_number": student.get("roll_number", ""),
                "days_active_in_period": a.get("days_active_in_period", 0),
                "last_active": a.get("last_active"),
                "most_used_feature": a.get("most_used_feature"),
                "active_in_period": a.get("days_active_in_period", 0) > 0,
            })

        # Sort: most active first
        students_out.sort(key=lambda s: s["days_active_in_period"], reverse=True)

        return APIResponse(
            success=True,
            message="Student analytics",
            data={"period": period, "students": students_out}
        ).model_dump()

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Analytics students error: {exc}")
        raise HTTPException(status_code=500, detail="Student analytics unavailable")


@api_router.get("/health")
async def health_check():
    """Health check endpoint verifying database connectivity."""
    try:
        await db.command("ping")
        return {
            "success": True,
            "message": "Healthy",
            "data": {
                "status": "healthy",
                "database": "connected"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "message": "Unhealthy",
                "data": {
                    "status": "unhealthy",
                    "database": f"error: {str(e)}"
                }
            }
        )

# Include router and middleware
app.include_router(api_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail, "detail": exc.detail}
        )
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred. Please try again later.",
            "detail": "An unexpected error occurred. Please try again later."
        }
    )


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def _security_headers_middleware(request: Request, call_next):
    """Attach defensive security headers to every response."""
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
