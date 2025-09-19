#!/usr/bin/env python3
"""
Test authentication with valid email domains
"""

import requests
import json
import time

def test_registration_and_login():
    print("🔬 Testing Authentication Flow with Valid Email")

    base_url = "https://duespark-backend.onrender.com"

    # Use a valid email domain
    timestamp = int(time.time())
    test_email = f"test_{timestamp}@gmail.com"
    test_password = "TestPassword123!"

    print(f"📝 Testing registration with: {test_email}")

    # Step 1: Registration
    registration_data = {
        "email": test_email,
        "password": test_password,
        "full_name": "Test User"
    }

    try:
        reg_response = requests.post(
            f"{base_url}/auth/register",
            json=registration_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )

        print(f"Registration Status: {reg_response.status_code}")

        if reg_response.status_code == 201:
            print("✅ Registration successful!")
            reg_data = reg_response.json()
            print(f"Registration response: {json.dumps(reg_data, indent=2)}")

            # Step 2: Test login with the newly created user
            print(f"\n🔐 Testing login with: {test_email}")

            login_data = {
                "username": test_email,
                "password": test_password
            }

            login_response = requests.post(
                f"{base_url}/auth/login",
                data=login_data,
                timeout=30,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            print(f"Login Status: {login_response.status_code}")

            if login_response.status_code == 200:
                print("✅ Login successful!")
                login_data = login_response.json()
                access_token = login_data.get("data", {}).get("access_token")
                print(f"Access token received: {bool(access_token)}")

                # Step 3: Test protected endpoint
                if access_token:
                    print(f"\n🔒 Testing protected endpoint with token")
                    headers = {"Authorization": f"Bearer {access_token}"}

                    profile_response = requests.get(
                        f"{base_url}/auth/me",
                        headers=headers,
                        timeout=30
                    )

                    print(f"Profile Status: {profile_response.status_code}")
                    if profile_response.status_code == 200:
                        print("✅ Protected endpoint access successful!")
                        profile_data = profile_response.json()
                        print(f"User profile: {json.dumps(profile_data, indent=2)}")
                    else:
                        print("❌ Protected endpoint access failed")
                        try:
                            print(f"Error: {profile_response.json()}")
                        except:
                            print(f"Error text: {profile_response.text}")
            else:
                print("❌ Login failed")
                try:
                    error_data = login_response.json()
                    print(f"Login error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Login error text: {login_response.text}")

        elif reg_response.status_code == 422:
            print("❌ Registration validation error")
            try:
                error_data = reg_response.json()
                print(f"Validation error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {reg_response.text}")

        elif reg_response.status_code == 500:
            print("🚨 Registration server error - SQLAlchemy text() issue likely")
            try:
                error_data = reg_response.json()
                print(f"Server error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {reg_response.text}")

        else:
            print(f"❌ Registration failed with status {reg_response.status_code}")
            try:
                error_data = reg_response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {reg_response.text}")

    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_registration_and_login()