"""
Attendify - Comprehensive Backend API Tests
Tests all endpoints: Auth, Classes, Students, Attendance, Dashboard
"""
import pytest
import requests
import os
import uuid

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
def test_class_id(admin_session):
    """Create a test class and return its ID"""
    unique_code = f"TEST{uuid.uuid4().hex[:4].upper()}"
    response = admin_session.post(f"{BASE_URL}/api/classes", json={
        "name": "Test Class for API Testing",
        "code": unique_code,
        "periods_per_day": 6
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    class_id = data["data"]["id"]
    join_code = data["data"]["join_code"]
    yield {"class_id": class_id, "join_code": join_code, "code": unique_code}
    # Cleanup: Delete the test class
    admin_session.delete(f"{BASE_URL}/api/classes/{class_id}")

@pytest.fixture(scope="module")
def test_student_id(admin_session, test_class_id):
    """Create a test student and return their ID"""
    roll_number = f"TEST{uuid.uuid4().hex[:6].upper()}"
    response = admin_session.post(f"{BASE_URL}/api/classes/{test_class_id['class_id']}/students", json={
        "name": "Test Student",
        "roll_number": roll_number
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    yield {"student_id": data["data"]["id"], "roll_number": roll_number}
    # Cleanup happens when class is deleted


# =====================================
# Auth Endpoint Tests
# =====================================

class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self, session):
        """Test admin login with correct credentials"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@college.edu",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["role"] == "admin"
        assert data["data"]["email"] == "admin@college.edu"
        print("✓ Admin login successful")
    
    def test_admin_login_invalid_password(self, session):
        """Test admin login with wrong password"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@college.edu",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password rejected correctly")
    
    def test_admin_login_invalid_email(self, session):
        """Test admin login with non-existent email"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@college.edu",
            "password": "admin123"
        })
        assert response.status_code == 401
        print("✓ Invalid email rejected correctly")
    
    def test_student_login_not_found(self, session):
        """Test student login with unregistered roll number"""
        response = session.post(f"{BASE_URL}/api/auth/student-login", json={
            "roll_number": "NOTEXIST123"
        })
        assert response.status_code == 401
        print("✓ Unregistered roll number rejected correctly")
    
    def test_auth_me_without_session(self):
        """Test /auth/me without session cookie"""
        # Use a fresh session without cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /auth/me correctly rejects unauthenticated requests")
    
    def test_auth_me_with_session(self, admin_session):
        """Test /auth/me with valid session"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["role"] == "admin"
        print("✓ /auth/me returns correct admin data")
    
    def test_logout(self):
        """Test logout clears session"""
        # Login first
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@college.edu",
            "password": "admin123"
        })
        assert login_resp.status_code == 200
        
        # Logout
        logout_resp = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_resp.status_code == 200
        data = logout_resp.json()
        assert data["success"] is True
        
        # Verify session is cleared
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 401
        print("✓ Logout clears session correctly")


# =====================================
# Class Endpoint Tests
# =====================================

class TestClassEndpoints:
    """Class management endpoint tests"""
    
    def test_create_class(self, admin_session):
        """Test creating a new class"""
        unique_code = f"CLS{uuid.uuid4().hex[:4].upper()}"
        response = admin_session.post(f"{BASE_URL}/api/classes", json={
            "name": "Computer Science 101",
            "code": unique_code,
            "periods_per_day": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Computer Science 101"
        assert data["data"]["periods_per_day"] == 5
        assert "join_code" in data["data"]
        assert len(data["data"]["join_code"]) == 6
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/classes/{data['data']['id']}")
        print("✓ Class created successfully with join code")
    
    def test_create_class_duplicate_code(self, admin_session, test_class_id):
        """Test creating class with duplicate code"""
        response = admin_session.post(f"{BASE_URL}/api/classes", json={
            "name": "Another Class",
            "code": test_class_id["code"],
            "periods_per_day": 4
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "already exists" in data["message"].lower()
        print("✓ Duplicate class code rejected correctly")
    
    def test_create_class_invalid_periods(self, admin_session):
        """Test creating class with invalid periods_per_day"""
        response = admin_session.post(f"{BASE_URL}/api/classes", json={
            "name": "Invalid Periods Class",
            "code": f"INV{uuid.uuid4().hex[:4].upper()}",
            "periods_per_day": 15  # Max is 10
        })
        assert response.status_code == 422  # Validation error
        print("✓ Invalid periods_per_day rejected correctly")
    
    def test_list_classes(self, admin_session, test_class_id):
        """Test listing classes"""
        response = admin_session.get(f"{BASE_URL}/api/classes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "classes" in data["data"]
        assert isinstance(data["data"]["classes"], list)
        # Verify our test class is in the list
        class_ids = [c["id"] for c in data["data"]["classes"]]
        assert test_class_id["class_id"] in class_ids
        print("✓ Classes listed successfully")
    
    def test_list_classes_unauthenticated(self):
        """Test listing classes without auth"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/classes")
        assert response.status_code == 401
        print("✓ Unauthenticated class listing rejected")
    
    def test_delete_class(self, admin_session):
        """Test deleting a class"""
        # Create a class to delete
        unique_code = f"DEL{uuid.uuid4().hex[:4].upper()}"
        create_resp = admin_session.post(f"{BASE_URL}/api/classes", json={
            "name": "To Be Deleted",
            "code": unique_code,
            "periods_per_day": 4
        })
        class_id = create_resp.json()["data"]["id"]
        
        # Delete it
        delete_resp = admin_session.delete(f"{BASE_URL}/api/classes/{class_id}")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert data["success"] is True
        print("✓ Class deleted successfully")
    
    def test_delete_nonexistent_class(self, admin_session):
        """Test deleting a class that doesn't exist"""
        response = admin_session.delete(f"{BASE_URL}/api/classes/nonexistent-id")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        print("✓ Deleting nonexistent class handled correctly")


# =====================================
# Student Endpoint Tests
# =====================================

class TestStudentEndpoints:
    """Student management endpoint tests"""
    
    def test_add_student(self, admin_session, test_class_id):
        """Test adding a student to a class"""
        roll_number = f"STU{uuid.uuid4().hex[:6].upper()}"
        response = admin_session.post(f"{BASE_URL}/api/classes/{test_class_id['class_id']}/students", json={
            "name": "John Doe",
            "roll_number": roll_number
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "John Doe"
        assert data["data"]["roll_number"] == roll_number
        print("✓ Student added successfully")
    
    def test_add_duplicate_student(self, admin_session, test_class_id, test_student_id):
        """Test adding student with duplicate roll number"""
        response = admin_session.post(f"{BASE_URL}/api/classes/{test_class_id['class_id']}/students", json={
            "name": "Duplicate Student",
            "roll_number": test_student_id["roll_number"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "already exists" in data["message"].lower()
        print("✓ Duplicate roll number rejected correctly")
    
    def test_list_students(self, admin_session, test_class_id, test_student_id):
        """Test listing students in a class"""
        response = admin_session.get(f"{BASE_URL}/api/classes/{test_class_id['class_id']}/students")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "students" in data["data"]
        # Verify our test student is in the list
        student_ids = [s["id"] for s in data["data"]["students"]]
        assert test_student_id["student_id"] in student_ids
        print("✓ Students listed successfully")
    
    def test_delete_student(self, admin_session, test_class_id):
        """Test deleting a student"""
        # Add a student to delete
        roll_number = f"DEL{uuid.uuid4().hex[:6].upper()}"
        add_resp = admin_session.post(f"{BASE_URL}/api/classes/{test_class_id['class_id']}/students", json={
            "name": "To Delete",
            "roll_number": roll_number
        })
        student_id = add_resp.json()["data"]["id"]
        
        # Delete the student
        delete_resp = admin_session.delete(f"{BASE_URL}/api/students/{student_id}")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert data["success"] is True
        print("✓ Student deleted successfully")


# =====================================
# Join Class Tests (Public)
# =====================================

class TestJoinClassEndpoints:
    """Join class public endpoint tests"""
    
    def test_get_join_info(self, test_class_id):
        """Test getting class info by join code"""
        response = requests.get(f"{BASE_URL}/api/classes/join-info/{test_class_id['join_code']}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["class_name"] == "Test Class for API Testing"
        print("✓ Join info retrieved successfully")
    
    def test_get_join_info_invalid_code(self):
        """Test getting join info with invalid code"""
        response = requests.get(f"{BASE_URL}/api/classes/join-info/INVALID")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        print("✓ Invalid join code handled correctly")
    
    def test_join_class_self_register(self, test_class_id):
        """Test student self-registration via join code"""
        roll_number = f"JOIN{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/classes/join", json={
            "join_code": test_class_id["join_code"],
            "name": "Self Registered Student",
            "roll_number": roll_number
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["roll_number"] == roll_number
        print("✓ Student self-registration successful")
    
    def test_join_class_duplicate_roll(self, test_class_id, test_student_id):
        """Test self-registration with existing roll number"""
        response = requests.post(f"{BASE_URL}/api/classes/join", json={
            "join_code": test_class_id["join_code"],
            "name": "Duplicate Registration",
            "roll_number": test_student_id["roll_number"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        print("✓ Duplicate roll number in join rejected correctly")


# =====================================
# Attendance Endpoint Tests
# =====================================

class TestAttendanceEndpoints:
    """Attendance marking endpoint tests"""
    
    def test_mark_attendance(self, admin_session, test_class_id, test_student_id):
        """Test marking attendance"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class_id["class_id"],
            "date": today,
            "period_number": 1,
            "records": [
                {"student_id": test_student_id["student_id"], "status": "Present"}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print("✓ Attendance marked successfully")
    
    def test_mark_attendance_duplicate_period(self, admin_session, test_class_id, test_student_id):
        """Test marking attendance for same period twice"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        # First attempt should succeed (already marked in previous test)
        response = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class_id["class_id"],
            "date": today,
            "period_number": 1,
            "records": [
                {"student_id": test_student_id["student_id"], "status": "Absent"}
            ]
        })
        # Should return success:false because already marked
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert "already marked" in data["message"].lower()
        print("✓ Duplicate attendance marking rejected correctly")
    
    def test_edit_attendance(self, admin_session, test_class_id, test_student_id):
        """Test editing existing attendance"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = admin_session.put(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class_id["class_id"],
            "date": today,
            "period_number": 1,
            "records": [
                {"student_id": test_student_id["student_id"], "status": "Absent"}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "updated" in data["message"].lower()
        print("✓ Attendance edited successfully")
    
    def test_check_attendance(self, admin_session, test_class_id):
        """Test checking if attendance exists"""
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = admin_session.get(
            f"{BASE_URL}/api/attendance/check",
            params={
                "class_id": test_class_id["class_id"],
                "date": today,
                "period_number": 1
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["exists"] is True
        assert "records" in data["data"]
        print("✓ Attendance check working correctly")
    
    def test_get_class_attendance(self, admin_session, test_class_id):
        """Test getting all attendance for a class"""
        response = admin_session.get(f"{BASE_URL}/api/attendance/class/{test_class_id['class_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "attendance" in data["data"]
        print("✓ Class attendance retrieved successfully")
    
    def test_mark_attendance_invalid_date(self, admin_session, test_class_id, test_student_id):
        """Test marking attendance with invalid date format"""
        response = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class_id["class_id"],
            "date": "invalid-date",
            "period_number": 1,
            "records": [
                {"student_id": test_student_id["student_id"], "status": "Present"}
            ]
        })
        assert response.status_code == 422  # Validation error
        print("✓ Invalid date format rejected correctly")


# =====================================
# Student Login and Dashboard Tests
# =====================================

class TestStudentDashboard:
    """Student login and dashboard tests"""
    
    def test_student_login_success(self, test_student_id):
        """Test student login with roll number"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/student-login", json={
            "roll_number": test_student_id["roll_number"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["role"] == "student"
        assert data["data"]["roll_number"] == test_student_id["roll_number"]
        print("✓ Student login successful")
        return session
    
    def test_student_dashboard(self, test_student_id):
        """Test student dashboard endpoint"""
        # Login as student
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/student-login", json={
            "roll_number": test_student_id["roll_number"]
        })
        assert login_resp.status_code == 200
        
        # Get dashboard
        response = session.get(f"{BASE_URL}/api/student/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "student" in data["data"]
        assert "attendance" in data["data"]
        assert "classmates" in data["data"]
        assert "history" in data["data"]
        assert "percentage" in data["data"]["attendance"]
        assert "periods_needed_for_75" in data["data"]["attendance"]
        print("✓ Student dashboard data retrieved correctly")


# =====================================
# Admin Dashboard Tests
# =====================================

class TestAdminDashboard:
    """Admin dashboard tests"""
    
    def test_admin_dashboard(self, admin_session):
        """Test admin dashboard stats"""
        response = admin_session.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total_classes" in data["data"]
        assert "total_students" in data["data"]
        assert "today_attendance_pct" in data["data"]
        assert "today_records_count" in data["data"]
        print("✓ Admin dashboard stats retrieved correctly")
    
    def test_admin_dashboard_unauthenticated(self):
        """Test admin dashboard without auth"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401
        print("✓ Unauthenticated admin dashboard access rejected")


# =====================================
# Roll Number Case Insensitivity Test
# =====================================

class TestRollNumberCaseHandling:
    """Test that roll numbers are case insensitive"""
    
    def test_roll_number_uppercase_conversion(self, test_student_id):
        """Test that roll numbers are converted to uppercase"""
        session = requests.Session()
        # Try login with lowercase roll number
        response = session.post(f"{BASE_URL}/api/auth/student-login", json={
            "roll_number": test_student_id["roll_number"].lower()
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["roll_number"] == test_student_id["roll_number"].upper()
        print("✓ Roll number case insensitivity working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
