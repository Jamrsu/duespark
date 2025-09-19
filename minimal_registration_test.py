#!/usr/bin/env python3
"""
Minimal registration test to isolate database issues
"""

import requests
import json
import time

def test_minimal_registration():
    print("🔬 Minimal Registration Test")

    base_url = "https://duespark-backend.onrender.com"

    # Use absolute minimal data
    test_data = {
        "email": f"minimal_{int(time.time())}@gmail.com",
        "password": "TestPass123!"
    }

    print(f"📝 Testing minimal registration: {test_data['email']}")

    try:
        response = requests.post(
            f"{base_url}/auth/register",
            json=test_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )

        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.text:
            try:
                response_json = response.json()
                print(f"Response: {json.dumps(response_json, indent=2)}")
            except:
                print(f"Response text: {response.text}")

        return response.status_code == 201

    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_existing_user_login():
    print("\n🔐 Testing Login with Potentially Existing User")

    base_url = "https://duespark-backend.onrender.com"

    # Try logging in with a test user that might already exist
    login_data = {
        "username": "admin@duespark.com",  # Common admin email
        "password": "admin123"  # Common test password
    }

    try:
        response = requests.post(
            f"{base_url}/auth/login",
            data=login_data,
            timeout=30,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        print(f"Status: {response.status_code}")

        if response.text:
            try:
                response_json = response.json()
                print(f"Response: {json.dumps(response_json, indent=2)}")
            except:
                print(f"Response text: {response.text}")

        return response.status_code == 200

    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_database_through_other_endpoints():
    print("\n🗄️ Testing Database Through Other Endpoints")

    base_url = "https://duespark-backend.onrender.com"

    # Try endpoints that don't require auth but might use database
    test_endpoints = [
        "/health",
        "/healthz",
        "/metrics"
    ]

    for endpoint in test_endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            print(f"{endpoint}: {response.status_code}")
            if response.status_code != 200:
                try:
                    print(f"  Error: {response.json()}")
                except:
                    print(f"  Error text: {response.text[:100]}")
        except Exception as e:
            print(f"{endpoint}: Failed - {e}")

if __name__ == "__main__":
    test_database_through_other_endpoints()
    success = test_minimal_registration()
    if not success:
        test_existing_user_login()