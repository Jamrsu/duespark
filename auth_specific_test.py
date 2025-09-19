#!/usr/bin/env python3
"""
Focused authentication testing to isolate the 500 error
"""

import requests
import json

def test_auth_registration():
    print("🔬 Detailed Authentication Registration Test")

    base_url = "https://duespark-backend.onrender.com"

    # Test with minimal valid data
    test_data = {
        "email": f"test_{int(__import__('time').time())}@duespark.test",
        "password": "TestPassword123!",
        "full_name": "Test User"
    }

    print(f"📝 Testing registration with data: {json.dumps(test_data, indent=2)}")

    try:
        response = requests.post(
            f"{base_url}/auth/register",
            json=test_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.text:
            try:
                response_json = response.json()
                print(f"Response JSON: {json.dumps(response_json, indent=2)}")
            except:
                print(f"Response Text: {response.text}")

        # Check if it's a server error
        if response.status_code == 500:
            print("🚨 500 Server Error detected - this suggests SQLAlchemy text() or other database issue")

    except Exception as e:
        print(f"Request failed: {e}")

def test_auth_login():
    print("\n🔐 Testing Login Endpoint")

    base_url = "https://duespark-backend.onrender.com"

    # Test with form data (as expected by OAuth2PasswordRequestForm)
    login_data = {
        "username": "test@example.com",
        "password": "TestPassword123!"
    }

    print(f"📝 Testing login with form data: {login_data}")

    try:
        response = requests.post(
            f"{base_url}/auth/login",
            data=login_data,  # Use form data, not JSON
            timeout=30,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.text:
            try:
                response_json = response.json()
                print(f"Response JSON: {json.dumps(response_json, indent=2)}")
            except:
                print(f"Response Text: {response.text}")

        # Check if it's a server error
        if response.status_code == 500:
            print("🚨 500 Server Error detected - this suggests SQLAlchemy text() or other database issue")

    except Exception as e:
        print(f"Request failed: {e}")

def test_simple_database_operations():
    print("\n🗄️ Testing Simple Database Operations")

    base_url = "https://duespark-backend.onrender.com"

    # Test endpoints that use database but might not have auth
    endpoints_to_test = [
        ("/healthz", "GET"),
        ("/health", "GET"),
        ("/docs", "GET")
    ]

    for endpoint, method in endpoints_to_test:
        try:
            print(f"\n🔹 Testing {method} {endpoint}")
            response = requests.request(method, f"{base_url}{endpoint}", timeout=10)
            print(f"   Status: {response.status_code}")
            if response.status_code >= 400:
                try:
                    print(f"   Error: {response.json()}")
                except:
                    print(f"   Error Text: {response.text[:200]}...")
            else:
                print(f"   ✅ Success")
        except Exception as e:
            print(f"   ❌ Failed: {e}")

if __name__ == "__main__":
    test_simple_database_operations()
    test_auth_registration()
    test_auth_login()