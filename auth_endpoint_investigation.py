#!/usr/bin/env python3
"""
Investigation script for authentication endpoints
"""

import requests
import json
import time

def investigate_auth_endpoints():
    base_url = "https://duespark-backend.onrender.com"

    print("🔍 Investigating Authentication Endpoints...")

    # First, let's check what endpoints are available in the API documentation
    try:
        docs_response = requests.get(f"{base_url}/openapi.json", timeout=10)
        if docs_response.status_code == 200:
            api_spec = docs_response.json()
            print("\n📋 Available endpoints from OpenAPI spec:")

            paths = api_spec.get("paths", {})
            auth_endpoints = {}

            for path, methods in paths.items():
                if "auth" in path.lower() or "login" in path.lower() or "register" in path.lower():
                    auth_endpoints[path] = list(methods.keys())
                    print(f"   {path}: {list(methods.keys())}")

            # Also check for user-related endpoints
            print("\n👤 User-related endpoints:")
            for path, methods in paths.items():
                if "user" in path.lower():
                    print(f"   {path}: {list(methods.keys())}")

            # Check endpoint details for registration
            if "/auth/register" in paths:
                register_spec = paths["/auth/register"]
                print(f"\n📝 Registration endpoint details:")
                if "post" in register_spec:
                    post_spec = register_spec["post"]
                    print(f"   Summary: {post_spec.get('summary', 'N/A')}")
                    print(f"   Request body: {post_spec.get('requestBody', 'N/A')}")

            if "/auth/login" in paths:
                login_spec = paths["/auth/login"]
                print(f"\n🔐 Login endpoint details:")
                if "post" in login_spec:
                    post_spec = login_spec["post"]
                    print(f"   Summary: {post_spec.get('summary', 'N/A')}")
                    print(f"   Request body: {post_spec.get('requestBody', 'N/A')}")

    except Exception as e:
        print(f"❌ Failed to get API documentation: {e}")

    # Test various auth endpoint patterns
    print("\n🧪 Testing different authentication endpoint patterns...")

    auth_patterns = [
        "/auth/register",
        "/register",
        "/signup",
        "/users/register",
        "/api/auth/register",
        "/api/register"
    ]

    test_data = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User"
    }

    for pattern in auth_patterns:
        try:
            print(f"\n🔹 Testing {pattern}...")
            response = requests.post(f"{base_url}{pattern}", json=test_data, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.text:
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response (text): {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")

    # Test login patterns
    print("\n🔐 Testing login patterns...")
    login_patterns = [
        "/auth/login",
        "/login",
        "/signin",
        "/users/login",
        "/api/auth/login",
        "/api/login",
        "/token",
        "/auth/token"
    ]

    login_data_json = {
        "email": "test@example.com",
        "password": "TestPassword123!"
    }

    login_data_form = {
        "username": "test@example.com",
        "password": "TestPassword123!"
    }

    for pattern in login_patterns:
        try:
            print(f"\n🔹 Testing {pattern} with JSON...")
            response = requests.post(f"{base_url}{pattern}", json=login_data_json, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.text:
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response (text): {response.text[:200]}...")

            print(f"🔹 Testing {pattern} with form data...")
            response = requests.post(f"{base_url}{pattern}", data=login_data_form, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.text:
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response (text): {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")

if __name__ == "__main__":
    investigate_auth_endpoints()