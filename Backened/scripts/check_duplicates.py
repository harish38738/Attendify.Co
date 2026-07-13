"""
Migration Script: Detect Duplicate Students
==========================================
Scans the 'students' collection for duplicate (class_id, roll_number) pairs.
Does NOT delete any records. Prints a report for manual review.

Usage:
  python scripts/check_duplicates.py
"""

import asyncio
import os
from collections import defaultdict
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "attendify")


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 60)
    print("ATTENDIFY — Duplicate Student Detection Report")
    print("=" * 60)

    # Fetch all students
    students = await db.students.find({}, {"_id": 0, "id": 1, "class_id": 1, "roll_number": 1, "name": 1, "created_at": 1}).to_list(None)

    # Group by (class_id, roll_number)
    groups = defaultdict(list)
    for s in students:
        key = (s["class_id"], s["roll_number"].strip().upper() if s.get("roll_number") else "")
        groups[key].append(s)

    duplicates = {k: v for k, v in groups.items() if len(v) > 1}

    if not duplicates:
        print("\n[OK] No duplicate students found. Database is clean.")
    else:
        print(f"\n[WARNING] Found {len(duplicates)} duplicate group(s):\n")
        for (class_id, roll_number), records in duplicates.items():
            # Fetch class name for reference
            cls = await db.classes.find_one({"id": class_id}, {"_id": 0, "name": 1, "code": 1})
            class_label = f"{cls['name']} ({cls['code']})" if cls else class_id
            print(f"  Class: {class_label}")
            print(f"  Roll Number: {roll_number}")
            print(f"  Duplicate Records ({len(records)}):")
            for r in records:
                print(f"    - ID: {r['id']} | Name: {r.get('name', 'N/A')} | Created: {r.get('created_at', 'N/A')}")
            print()

        print("-" * 60)
        print(f"TOTAL DUPLICATE GROUPS: {len(duplicates)}")
        print(f"TOTAL EXTRA RECORDS (to clean up): {sum(len(v) - 1 for v in duplicates.values())}")
        print("-" * 60)
        print("\n[WARNING] No records have been deleted. Review the above and manually")
        print("   remove unwanted duplicates from MongoDB before enabling the unique index.")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
