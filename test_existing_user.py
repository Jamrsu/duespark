#!/usr/bin/env python3
"""
Test with common test user patterns
"""

import requests
import json

base_url = "https://duespark-backend.onrender.com"

def test_existing_patterns():
    # Common test user patterns that might exist
    test_users = [
        ("admin@example.com", "password123"),
        ("admin@admin.com", "admin123"),
        ("test@test.com", "password123"),
        ("user@example.com", "password123"),
        ("demo@example.com", "demo123"),
    ]

    for email, password in test_users:
        print(f"\n🔍 Testing login with {email}...")

        login_data = {
            "username": email,  # OAuth2 uses 'username' field but we pass email
            "password": password
        }

        try:
            response = requests.post(
                f"{base_url}/auth/login",
                data=login_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=10
            )
            print(f"Login Status: {response.status_code}")
            print(f"Login Response: {response.text[:200]}...")

            if response.status_code == 200:
                try:
                    data = response.json()
                    access_token = data.get('access_token')
                    if access_token:
                        print(f"✅ Login successful with {email}!")
                        print(f"Token: {access_token[:50]}...")

                        # Test protected endpoint
                        headers = {'Authorization': f'Bearer {access_token}'}
                        response = requests.get(f"{base_url}/auth/me", headers=headers, timeout=10)
                        print(f"Protected endpoint status: {response.status_code}")

                        if response.status_code == 200:
                            user_data = response.json()
                            print(f"User data: {user_data}")
                            return access_token, email

                except Exception as e:
                    print(f"Error parsing response: {e}")

        except Exception as e:
            print(f"Request error: {e}")

    return None, None

if __name__ == "__main__":
    token, email = test_existing_patterns()
    if token:
        print(f"\n🎉 Working credentials found! Email: {email}")
    else:
        print("\n❌ No working credentials found")