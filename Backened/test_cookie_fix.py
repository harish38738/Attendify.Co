#!/usr/bin/env python
"""
Quick test to verify the cookie secure fix works for local HTTP development.
Tests student login and dashboard endpoint with session cookie handling.
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_backend_connectivity():
    """Test if backend is reachable"""
    try:
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=5)
        print(f"✓ Backend reachable: {r.status_code}")
        return True
    except Exception as e:
        print(f"✗ Backend not reachable: {e}")
        return False

def test_student_login_and_dashboard():
    """Test student login and dashboard with session persistence"""
    # First create a session object to persist cookies
    session = requests.Session()
    
    print("\n=== Testing Student Login & Dashboard ===")
    
    # Try a test roll number (the backend should have test data, or we'll get 401)
    test_roll = "TEST001"
    
    print(f"\n1. Attempting student login with roll number: {test_roll}")
    login_resp = session.post(
        f"{BASE_URL}/api/auth/student-login",
        json={"roll_number": test_roll},
        timeout=10
    )
    print(f"   Status: {login_resp.status_code}")
    
    if login_resp.status_code == 200:
        data = login_resp.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        
        # Check if Set-Cookie header is present
        print(f"\n2. Checking for session_id cookie in response headers...")
        cookies = session.cookies
        print(f"   Cookies in session: {dict(cookies)}")
        
        if 'session_id' in cookies:
            print(f"   ✓ session_id cookie received: {cookies['session_id'][:20]}...")
        else:
            print(f"   ⚠ No session_id cookie in session (may be in Set-Cookie header)")
            print(f"   Headers: {login_resp.headers}")
        
        print(f"\n3. Testing dashboard access with session cookie...")
        dashboard_resp = session.get(
            f"{BASE_URL}/api/student/dashboard",
            timeout=10
        )
        print(f"   Status: {dashboard_resp.status_code}")
        
        if dashboard_resp.status_code == 200:
            print(f"   ✓ Dashboard accessible (session cookie working!)")
            data = dashboard_resp.json()
            if data.get('success'):
                print(f"   ✓ Dashboard returned success response")
                print(f"   Data: {json.dumps(data, indent=2)[:500]}...")
            return True
        else:
            print(f"   ✗ Dashboard returned {dashboard_resp.status_code}")
            print(f"   Response: {dashboard_resp.text[:500]}")
            return False
    elif login_resp.status_code == 401:
        print(f"   ⚠ Roll number not found (expected for test - backend needs test data)")
        print(f"   Response: {login_resp.json()}")
        return None
    else:
        print(f"   ✗ Unexpected status: {login_resp.status_code}")
        print(f"   Response: {login_resp.text}")
        return False

if __name__ == "__main__":
    print("Testing Cookie Secure Fix for Local HTTP Development")
    print("=" * 50)
    
    if not test_backend_connectivity():
        print("\n⚠ Backend not running. Start with: python server.py")
        sys.exit(1)
    
    result = test_student_login_and_dashboard()
    
    print("\n" + "=" * 50)
    if result is True:
        print("✓ All tests passed!")
    elif result is None:
        print("⚠ Tests inconclusive (backend test data needed)")
    else:
        print("✗ Tests failed")
