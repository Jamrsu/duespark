#!/usr/bin/env python3
"""
Test authentication with correct format
"""

import requests
import json
import random
import string

base_url = "https://duespark-backend.onrender.com"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_auth_working():
    # Generate unique test user
    test_email = f"test_{generate_random_string()}@example.com"
    test_password = "TestPassword123!"

    print(f"Testing with email: {test_email}")

    # Test 1: Registration with correct format
    print("🔍 Testing Registration (corrected)...")
    registration_data = {
        "email": test_email,
        "password": test_password
    }

    response = requests.post(f"{base_url}/auth/register", json=registration_data)
    print(f"Registration Status: {response.status_code}")
    print(f"Registration Response: {response.text}")

    if response.status_code in [200, 201]:
        print("✅ Registration successful!")

        # Test 2: Login with OAuth2PasswordRequestForm format
        print("\n🔍 Testing Login (OAuth2 form)...")
        login_data = {
            "username": test_email,  # OAuth2 uses 'username' field but we pass email
            "password": test_password
        }

        response = requests.post(
            f"{base_url}/auth/login",
            data=login_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        print(f"Login Status: {response.status_code}")
        print(f"Login Response: {response.text}")

        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')
            print("✅ Login successful!")
            print(f"Token: {access_token[:50]}..." if access_token else "No token")

            # Test 3: Access protected endpoint
            if access_token:
                print("\n🔍 Testing Protected Endpoint...")
                headers = {'Authorization': f'Bearer {access_token}'}
                response = requests.get(f"{base_url}/auth/me", headers=headers)
                print(f"Protected Status: {response.status_code}")
                print(f"Protected Response: {response.text}")

                if response.status_code == 200:
                    print("✅ Protected endpoint access successful!")
                    return access_token, test_email
                else:
                    print("❌ Protected endpoint access failed")
            else:
                print("❌ No access token received")
        else:
            print("❌ Login failed")
    else:
        print("❌ Registration failed")

    return None, None

if __name__ == "__main__":
    token, email = test_auth_working()
    if token:
        print(f"\n🎉 All tests passed! Token: {token[:50]}...")
        print(f"Email: {email}")
    else:
        print("\n❌ Authentication tests failed")