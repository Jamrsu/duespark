#!/usr/bin/env python3
"""
Test registration with absolute minimal data to avoid referral code path
"""

import requests
import json
import time

def test_minimal_registration_no_referral():
    print("🔬 Testing Registration with Minimal Data (No Referral)")

    base_url = "https://duespark-backend.onrender.com"

    # Use only the absolutely required fields
    test_data = {
        "email": f"minimal_{int(time.time())}@gmail.com",
        "password": "TestPass123!"
        # Explicitly NOT including referral_code or full_name
    }

    print(f"📝 Testing registration with: {json.dumps(test_data, indent=2)}")

    try:
        response = requests.post(
            f"{base_url}/auth/register",
            json=test_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )

        print(f"Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.text:
            try:
                response_json = response.json()
                print(f"Response: {json.dumps(response_json, indent=2)}")

                if response.status_code == 201:
                    print("✅ Registration successful!")
                    return response_json.get("data", {}).get("access_token")
                else:
                    print(f"❌ Registration failed with status {response.status_code}")

            except Exception as e:
                print(f"❌ Failed to parse response JSON: {e}")
                print(f"Response text: {response.text}")

    except Exception as e:
        print(f"❌ Request failed: {e}")

    return None

def test_without_optional_fields():
    print("\n🔬 Testing Various Field Combinations")

    base_url = "https://duespark-backend.onrender.com"

    # Test different combinations of required/optional fields
    test_cases = [
        {
            "name": "Only email and password",
            "data": {
                "email": f"test1_{int(time.time())}@gmail.com",
                "password": "TestPass123!"
            }
        },
        {
            "name": "Email, password, and full_name",
            "data": {
                "email": f"test2_{int(time.time())}@gmail.com",
                "password": "TestPass123!",
                "full_name": "Test User"
            }
        }
    ]

    for test_case in test_cases:
        print(f"\n🔹 Testing: {test_case['name']}")
        print(f"   Data: {json.dumps(test_case['data'])}")

        try:
            response = requests.post(
                f"{base_url}/auth/register",
                json=test_case["data"],
                timeout=30,
                headers={"Content-Type": "application/json"}
            )

            print(f"   Status: {response.status_code}")

            if response.status_code == 201:
                print("   ✅ Success!")
            elif response.status_code == 422:
                print("   ⚠️  Validation error")
                try:
                    error = response.json()
                    print(f"   Error details: {error}")
                except:
                    pass
            elif response.status_code == 500:
                print("   🚨 Server error - likely SQLAlchemy or missing module issue")
            else:
                print(f"   ❌ Other error: {response.status_code}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    test_without_optional_fields()
    access_token = test_minimal_registration_no_referral()

    if access_token:
        print(f"\n🎉 Successfully obtained access token: {access_token[:20]}...")
    else:
        print("\n❌ Failed to register and obtain access token")