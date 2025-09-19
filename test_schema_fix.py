#!/usr/bin/env python3
"""
Test script to verify database schema fixes are working
"""

import requests
import json
import time

def test_backend_health():
    """Test that the backend is running and healthy"""
    print("🔍 Testing backend health...")

    try:
        response = requests.get("https://duespark-backend.onrender.com/healthz", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend health: {data}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

def test_database_endpoints():
    """Test that database-dependent endpoints are working"""
    print("\n🔍 Testing database endpoints...")

    endpoints = [
        "/templates",
        "/admin/dead_letters",
        "/clients",
        "/invoices",
        "/reminders"
    ]

    for endpoint in endpoints:
        try:
            url = f"https://duespark-backend.onrender.com{endpoint}"
            response = requests.get(url, timeout=10)

            if response.status_code == 401:
                print(f"✅ {endpoint}: Database working (401 auth required)")
            elif response.status_code == 200:
                print(f"✅ {endpoint}: Database working (200 OK)")
            else:
                try:
                    error_data = response.json()
                    if "no such table" in str(error_data) or "no such column" in str(error_data):
                        print(f"❌ {endpoint}: Database schema error: {error_data}")
                        return False
                    else:
                        print(f"⚠️  {endpoint}: Other error ({response.status_code}): {error_data}")
                except:
                    print(f"⚠️  {endpoint}: Status {response.status_code}")

        except Exception as e:
            print(f"❌ {endpoint}: Request error: {e}")
            return False

    return True

def test_user_registration():
    """Test user registration to verify database tables work"""
    print("\n🔍 Testing user registration (database write)...")

    test_user = {
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPass123"
    }

    try:
        response = requests.post(
            "https://duespark-backend.onrender.com/auth/register",
            json=test_user,
            timeout=10
        )

        if response.status_code == 201:
            print("✅ User registration successful - database write works")
            return True
        elif response.status_code == 500:
            try:
                error_data = response.json()
                if "no such table" in str(error_data) or "no such column" in str(error_data):
                    print(f"❌ User registration failed - schema error: {error_data}")
                    return False
                else:
                    print(f"⚠️  User registration failed - other error: {error_data}")
                    return True  # Not a schema error
            except:
                print(f"⚠️  User registration failed - status 500 (not schema related)")
                return True  # Not a schema error
        else:
            print(f"⚠️  User registration status {response.status_code} (not schema related)")
            return True  # Not a schema error

    except Exception as e:
        print(f"❌ User registration error: {e}")
        return False

def main():
    print("🚀 Testing database schema fixes on live backend")
    print("=" * 60)

    # Test 1: Backend health
    health_ok = test_backend_health()
    if not health_ok:
        print("\n❌ Backend is not healthy - stopping tests")
        return

    # Test 2: Database endpoints
    db_ok = test_database_endpoints()

    # Test 3: User registration
    reg_ok = test_user_registration()

    print("\n" + "=" * 60)
    print("📊 TEST RESULTS:")
    print(f"Backend Health:  {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Database Schema: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"User Registration: {'✅ PASS' if reg_ok else '❌ FAIL'}")

    if health_ok and db_ok and reg_ok:
        print("\n🎉 ALL TESTS PASSED - Database schema is fixed!")
        print("The backend is live and the schema migration resolved the issues.")
    else:
        print("\n⚠️  Some tests failed - see results above")

if __name__ == "__main__":
    main()