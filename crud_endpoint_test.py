#!/usr/bin/env python3
"""
Test CRUD endpoints to understand database connectivity beyond auth
"""

import requests
import json

def test_protected_endpoints_without_auth():
    print("🔒 Testing Protected Endpoints Without Authentication")

    base_url = "https://duespark-backend.onrender.com"

    # Test various protected endpoints to see error patterns
    endpoints_to_test = [
        ("/clients", "GET", "List clients"),
        ("/invoices", "GET", "List invoices"),
        ("/auth/me", "GET", "User profile"),
        ("/templates", "GET", "List templates"),
        ("/analytics/dashboard", "GET", "Analytics dashboard"),
    ]

    for endpoint, method, description in endpoints_to_test:
        try:
            print(f"\n🔹 Testing {method} {endpoint} ({description})")
            response = requests.request(method, f"{base_url}{endpoint}", timeout=10)
            print(f"   Status: {response.status_code}")

            if response.status_code == 401:
                print("   ✅ Proper authentication required (401)")
            elif response.status_code == 500:
                print("   🚨 Server error (500) - possible database issue")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:100]}")
            else:
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                except:
                    print(f"   Response text: {response.text[:100]}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

def test_public_endpoints():
    print("\n🌐 Testing Public/Open Endpoints")

    base_url = "https://duespark-backend.onrender.com"

    # Test endpoints that should work without authentication
    public_endpoints = [
        ("/health", "GET", "Health check"),
        ("/healthz", "GET", "Health check simple"),
        ("/docs", "GET", "API documentation"),
        ("/openapi.json", "GET", "OpenAPI spec"),
        ("/metrics", "GET", "Metrics"),
    ]

    working_endpoints = 0
    total_endpoints = len(public_endpoints)

    for endpoint, method, description in public_endpoints:
        try:
            print(f"\n🔹 Testing {method} {endpoint} ({description})")
            response = requests.request(method, f"{base_url}{endpoint}", timeout=10)
            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                print("   ✅ Working")
                working_endpoints += 1
            else:
                print(f"   ❌ Failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:100]}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

    print(f"\n📊 Public endpoints working: {working_endpoints}/{total_endpoints} ({working_endpoints/total_endpoints*100:.1f}%)")

def test_edge_case_endpoints():
    print("\n🧪 Testing Edge Case Endpoints")

    base_url = "https://duespark-backend.onrender.com"

    # Test some edge cases
    edge_cases = [
        ("/nonexistent", "GET", "Non-existent endpoint"),
        ("/clients/999999", "GET", "Non-existent client"),
        ("/auth/register", "GET", "Wrong method for register"),
        ("/auth/login", "GET", "Wrong method for login"),
    ]

    for endpoint, method, description in edge_cases:
        try:
            print(f"\n🔹 Testing {method} {endpoint} ({description})")
            response = requests.request(method, f"{base_url}{endpoint}", timeout=10)
            print(f"   Status: {response.status_code}")

            if response.status_code in [404, 405, 422]:
                print("   ✅ Expected error response")
            elif response.status_code == 500:
                print("   🚨 Unexpected server error")
            else:
                print(f"   ℹ️  Other response: {response.status_code}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    test_public_endpoints()
    test_protected_endpoints_without_auth()
    test_edge_case_endpoints()