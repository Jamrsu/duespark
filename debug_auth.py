#!/usr/bin/env python3
"""
Debug authentication endpoints to understand expected formats
"""

import requests
import json

base_url = "https://duespark-backend.onrender.com"

def test_auth_debug():
    # Test 1: Registration endpoint with detailed error
    print("🔍 Testing Registration...")
    registration_data = {
        "username": "testuser123",
        "email": "test@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User"
    }

    response = requests.post(f"{base_url}/auth/register", json=registration_data)
    print(f"Registration Status: {response.status_code}")
    print(f"Registration Response: {response.text}")

    # Test 2: Login endpoint with detailed error
    print("\n🔍 Testing Login...")
    login_data = {
        "username": "testuser123",
        "password": "TestPassword123!"
    }

    response = requests.post(f"{base_url}/auth/login", json=login_data)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response: {response.text}")

    # Test 3: Check if we need form data instead of JSON for login
    print("\n🔍 Testing Login with form data...")
    response = requests.post(f"{base_url}/auth/login", data=login_data)
    print(f"Login Form Status: {response.status_code}")
    print(f"Login Form Response: {response.text}")

    # Test 4: Try accessing protected endpoint without auth
    print("\n🔍 Testing Protected Endpoint...")
    response = requests.get(f"{base_url}/auth/me")
    print(f"Protected Status: {response.status_code}")
    print(f"Protected Response: {response.text}")

if __name__ == "__main__":
    test_auth_debug()