import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure we can load .env
backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def migrate():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("Missing MONGO_URL or DB_NAME")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Starting migration...")
    
    migrated_password = 0
    migrated_must_change = 0

    # 1. Set password hash if missing (fallback from previous inline migration)
    async for student in db.students.find({"password_hash": {"$exists": False}}):
        default_hash = pwd_context.hash(student["roll_number"])
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.students.update_one(
            {"id": student["id"]},
            {"$set": {
                "password_hash": default_hash,
                "created_at": student.get("added_at", now_iso),
                "updated_at": now_iso,
            }}
        )
        migrated_password += 1
        
    # 2. Set must_change_password to true for all existing students without it
    # We assume any student run through this initial migration script was created BEFORE password enforcement
    async for student in db.students.find({"must_change_password": {"$exists": False}}):
        await db.students.update_one(
            {"id": student["id"]},
            {"$set": {"must_change_password": True}}
        )
        migrated_must_change += 1
        
    print(f"Migrated {migrated_password} students to have password hashes.")
    print(f"Migrated {migrated_must_change} students to must_change_password=True.")
    
    client.close()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
