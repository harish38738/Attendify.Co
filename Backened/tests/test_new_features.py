"""
Attendify - New Features API Tests (Iteration 3)
Tests: Class rename, Join link controls, Student edit, Attendance report, CSV export
"""
import pytest
import requests
import os
import uuid

# Skip obsolete test module since admin auth /api/auth/login has been removed in V1.0.0
pytestmark = pytest.mark.skip(
    reason="Obsolete: targets removed password-based admin login `/api/auth/login`. Admin login in V1.0.0 uses Google OAuth (`/api/auth/google-admin`)."
)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# =====================================
# Fixtures
# =====================================

@pytest.fixture(scope="module")
def session():
    """Shared requests session with cookie support"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_session(session):
    """Admin authenticated session"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@college.edu",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert data["success"] is True
    yield session
    # Logout after tests
    session.post(f"{BASE_URL}/api/auth/logout")

@pytest.fixture(scope="module")
def test_class(admin_session):
    """Create a test class and return its data"""
    unique_code = f"NEW{uuid.uuid4().hex[:4].upper()}"
    response = admin_session.post(f"{BASE_URL}/api/classes", json={
        "name": "Test Class for New Features",
        "code": unique_code,
        "periods_per_day": 6
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    class_data = data["data"]
    yield class_data
    # Cleanup: Delete the test class
    admin_session.delete(f"{BASE_URL}/api/classes/{class_data['id']}")

@pytest.fixture(scope="module")
def test_students(admin_session, test_class):
    """Create test students and return their data"""
    students = []
    for i in range(3):
        roll_number = f"STU{uuid.uuid4().hex[:6].upper()}"
        response = admin_session.post(f"{BASE_URL}/api/classes/{test_class['id']}/students", json={
            "name": f"Test Student {i+1}",
            "roll_number": roll_number
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        students.append(data["data"])
    yield students
    # Cleanup happens when class is deleted


# =====================================
# Class Rename Tests
# =====================================

class TestClassRename:
    """Test PUT /api/classes/{id}/rename endpoint"""
    
    def test_rename_class_success(self, admin_session, test_class):
        """Test renaming a class successfully"""
        new_name = f"Renamed Class {uuid.uuid4().hex[:4]}"
        response = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/rename", json={
            "name": new_name
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "renamed" in data["message"].lower()
        print(f"✓ Class renamed to '{new_name}' successfully")
    
    def test_rename_class_verify_persistence(self, admin_session, test_class):
        """Test that rename persists in class list"""
        # First rename
        new_name = f"Verified Rename {uuid.uuid4().hex[:4]}"
        rename_resp = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/rename", json={
            "name": new_name
        })
        assert rename_resp.status_code == 200
        
        # Verify in class list
        list_resp = admin_session.get(f"{BASE_URL}/api/classes")
        assert list_resp.status_code == 200
        classes = list_resp.json()["data"]["classes"]
        found_class = next((c for c in classes if c["id"] == test_class["id"]), None)
        assert found_class is not None
        assert found_class["name"] == new_name
        print("✓ Class rename persisted correctly")
    
    def test_rename_nonexistent_class(self, admin_session):
        """Test renaming a class that doesn't exist"""
        response = admin_session.put(f"{BASE_URL}/api/classes/nonexistent-id/rename", json={
            "name": "New Name"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["message"].lower()
        print("✓ Renaming nonexistent class handled correctly")
    
    def test_rename_class_unauthenticated(self, test_class):
        """Test renaming class without authentication"""
        fresh_session = requests.Session()
        response = fresh_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/rename", json={
            "name": "Unauthorized Rename"
        })
        assert response.status_code == 401
        print("✓ Unauthenticated rename rejected correctly")


# =====================================
# Join Link Control Tests
# =====================================

class TestJoinLinkControls:
    """Test PUT /api/classes/{id}/join-link endpoint"""
    
    def test_disable_join_link(self, admin_session, test_class):
        """Test disabling join link"""
        response = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "disable"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "disabled" in data["message"].lower()
        print("✓ Join link disabled successfully")
    
    def test_join_with_disabled_link(self, admin_session, test_class):
        """Test that joining with disabled link fails"""
        # First disable the link
        admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "disable"
        })
        
        # Try to get join info
        response = requests.get(f"{BASE_URL}/api/classes/join-info/{test_class['join_code']}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "disabled" in data["message"].lower()
        print("✓ Join with disabled link rejected correctly")
    
    def test_enable_join_link(self, admin_session, test_class):
        """Test enabling join link"""
        response = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "enable"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "enabled" in data["message"].lower()
        assert "join_code" in data["data"]
        print("✓ Join link enabled successfully")
    
    def test_regenerate_join_link(self, admin_session, test_class):
        """Test regenerating join link"""
        # Get current join code
        list_resp = admin_session.get(f"{BASE_URL}/api/classes")
        classes = list_resp.json()["data"]["classes"]
        current_class = next((c for c in classes if c["id"] == test_class["id"]), None)
        old_code = current_class["join_code"]
        
        # Regenerate
        response = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "regenerate"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "regenerated" in data["message"].lower()
        new_code = data["data"]["join_code"]
        assert new_code != old_code
        assert len(new_code) == 6
        print(f"✓ Join link regenerated: {old_code} -> {new_code}")
    
    def test_invalid_join_link_action(self, admin_session, test_class):
        """Test invalid action for join link"""
        response = admin_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "invalid_action"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "invalid" in data["message"].lower()
        print("✓ Invalid join link action handled correctly")
    
    def test_join_link_unauthenticated(self, test_class):
        """Test join link control without authentication"""
        fresh_session = requests.Session()
        response = fresh_session.put(f"{BASE_URL}/api/classes/{test_class['id']}/join-link", json={
            "action": "disable"
        })
        assert response.status_code == 401
        print("✓ Unauthenticated join link control rejected correctly")


# =====================================
# Student Edit Tests
# =====================================

class TestStudentEdit:
    """Test PUT /api/students/{id} endpoint"""
    
    def test_edit_student_name(self, admin_session, test_students):
        """Test editing student name"""
        student = test_students[0]
        new_name = f"Updated Name {uuid.uuid4().hex[:4]}"
        response = admin_session.put(f"{BASE_URL}/api/students/{student['id']}", json={
            "name": new_name,
            "roll_number": student["roll_number"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "updated" in data["message"].lower()
        print(f"✓ Student name updated to '{new_name}'")
    
    def test_edit_student_roll_number(self, admin_session, test_students):
        """Test editing student roll number"""
        student = test_students[1]
        new_roll = f"NEWROLL{uuid.uuid4().hex[:4].upper()}"
        response = admin_session.put(f"{BASE_URL}/api/students/{student['id']}", json={
            "name": student["name"],
            "roll_number": new_roll
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"✓ Student roll number updated to '{new_roll}'")
    
    def test_edit_student_duplicate_roll_number(self, admin_session, test_students):
        """Test editing student with duplicate roll number - should fail"""
        student1 = test_students[0]
        student2 = test_students[2]
        
        # Try to change student2's roll number to student1's roll number
        response = admin_session.put(f"{BASE_URL}/api/students/{student2['id']}", json={
            "name": student2["name"],
            "roll_number": student1["roll_number"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "already exists" in data["message"].lower()
        print("✓ Duplicate roll number edit rejected correctly")
    
    def test_edit_nonexistent_student(self, admin_session):
        """Test editing a student that doesn't exist"""
        response = admin_session.put(f"{BASE_URL}/api/students/nonexistent-id", json={
            "name": "New Name",
            "roll_number": "NEWROLL123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["message"].lower()
        print("✓ Editing nonexistent student handled correctly")
    
    def test_edit_student_unauthenticated(self, test_students):
        """Test editing student without authentication"""
        student = test_students[0]
        fresh_session = requests.Session()
        response = fresh_session.put(f"{BASE_URL}/api/students/{student['id']}", json={
            "name": "Unauthorized Edit",
            "roll_number": student["roll_number"]
        })
        assert response.status_code == 401
        print("✓ Unauthenticated student edit rejected correctly")


# =====================================
# Attendance Report Tests
# =====================================

class TestAttendanceReport:
    """Test GET /api/attendance/report/{class_id} endpoint"""
    
    def test_get_attendance_report_empty(self, admin_session, test_class):
        """Test getting attendance report with no attendance records"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/report/{test_class['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "report" in data["data"]
        print("✓ Empty attendance report retrieved successfully")
    
    def test_get_attendance_report_with_data(self, admin_session, test_class, test_students):
        """Test getting attendance report with attendance data"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Mark attendance for all students
        records = [
            {"student_id": test_students[0]["id"], "status": "Present"},
            {"student_id": test_students[1]["id"], "status": "Absent"},
            {"student_id": test_students[2]["id"], "status": "OD"}
        ]
        
        # Mark attendance for period 2 (to avoid conflict with other tests)
        mark_resp = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class["id"],
            "date": today,
            "period_number": 2,
            "records": records
        })
        
        # Get report
        response = admin_session.get(f"{BASE_URL}/api/attendance/report/{test_class['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        report = data["data"]["report"]
        
        # Verify report structure
        assert len(report) >= 3  # At least our 3 test students
        for student_report in report:
            assert "name" in student_report
            assert "roll_number" in student_report
            assert "present" in student_report
            assert "absent" in student_report
            assert "od" in student_report
            assert "total" in student_report
            assert "attended" in student_report
            assert "percentage" in student_report
        
        print("✓ Attendance report with data retrieved successfully")
    
    def test_attendance_report_percentage_calculation(self, admin_session, test_class, test_students):
        """Test that percentage is calculated correctly"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/report/{test_class['id']}")
        assert response.status_code == 200
        report = response.json()["data"]["report"]
        
        for student_report in report:
            if student_report["total"] > 0:
                expected_attended = student_report["present"] + student_report["od"]
                assert student_report["attended"] == expected_attended
                expected_pct = round((expected_attended / student_report["total"]) * 100, 1)
                assert student_report["percentage"] == expected_pct
        
        print("✓ Attendance percentage calculation verified")
    
    def test_attendance_report_unauthenticated(self, test_class):
        """Test getting attendance report without authentication"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/attendance/report/{test_class['id']}")
        assert response.status_code == 401
        print("✓ Unauthenticated attendance report access rejected")


# =====================================
# CSV Export Tests
# =====================================

class TestCSVExport:
    """Test GET /api/attendance/export/{class_id} endpoint"""
    
    def test_export_csv(self, admin_session, test_class):
        """Test exporting attendance as CSV"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/export/{test_class['id']}")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        
        # Verify CSV content
        csv_content = response.text
        lines = csv_content.strip().split('\n')
        assert len(lines) >= 1  # At least header
        
        # Check header
        header = lines[0]
        assert "Roll Number" in header
        assert "Name" in header
        assert "Present" in header
        assert "Absent" in header
        assert "OD" in header
        assert "Total Periods" in header
        assert "Attended" in header
        assert "Percentage" in header
        
        print("✓ CSV export successful with correct headers")
    
    def test_export_csv_filename(self, admin_session, test_class):
        """Test that CSV filename contains class code"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/export/{test_class['id']}")
        assert response.status_code == 200
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attendance_" in content_disposition
        assert ".csv" in content_disposition
        print("✓ CSV filename format correct")
    
    def test_export_csv_nonexistent_class(self, admin_session):
        """Test exporting CSV for nonexistent class"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/export/nonexistent-id")
        assert response.status_code == 404
        print("✓ CSV export for nonexistent class handled correctly")
    
    def test_export_csv_unauthenticated(self, test_class):
        """Test exporting CSV without authentication"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/attendance/export/{test_class['id']}")
        assert response.status_code == 401
        print("✓ Unauthenticated CSV export rejected")


# =====================================
# Class Detail View - Students List
# =====================================

class TestClassStudentsList:
    """Test viewing students inside a class"""
    
    def test_get_students_in_class(self, admin_session, test_class, test_students):
        """Test getting students list for a class"""
        response = admin_session.get(f"{BASE_URL}/api/classes/{test_class['id']}/students")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        students = data["data"]["students"]
        
        # Verify all test students are present
        student_ids = [s["id"] for s in students]
        for test_student in test_students:
            assert test_student["id"] in student_ids
        
        # Verify student data structure
        for student in students:
            assert "id" in student
            assert "name" in student
            assert "roll_number" in student
            assert "class_id" in student
        
        print(f"✓ Retrieved {len(students)} students in class")
    
    def test_get_students_empty_class(self, admin_session):
        """Test getting students from an empty class"""
        # Create a new empty class
        unique_code = f"EMPTY{uuid.uuid4().hex[:4].upper()}"
        create_resp = admin_session.post(f"{BASE_URL}/api/classes", json={
            "name": "Empty Class",
            "code": unique_code,
            "periods_per_day": 4
        })
        class_id = create_resp.json()["data"]["id"]
        
        # Get students
        response = admin_session.get(f"{BASE_URL}/api/classes/{class_id}/students")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["students"] == []
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/classes/{class_id}")
        print("✓ Empty class students list handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
