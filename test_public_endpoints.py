#!/usr/bin/env python3
"""
Test public endpoints that don't require authentication
"""

import requests
import json
import time

base_url = "https://duespark-backend.onrender.com"

def test_public_endpoints():
    """Test endpoints that should work without authentication"""
    results = {}

    endpoints_to_test = [
        # Documentation endpoints
        ("GET", "/docs", "API Documentation"),
        ("GET", "/openapi.json", "OpenAPI Specification"),

        # Health/status endpoints
        ("GET", "/health", "Health Check"),

        # Public access endpoints (if any)
        ("GET", "/", "Root Endpoint"),

        # Check if any endpoint accepts OPTIONS (CORS)
        ("OPTIONS", "/docs", "CORS Preflight"),
        ("OPTIONS", "/auth/login", "Auth CORS Preflight"),
    ]

    print("🌐 TESTING PUBLIC ENDPOINTS...")
    print("=" * 50)

    for method, endpoint, description in endpoints_to_test:
        print(f"\n🔍 Testing {method} {endpoint} ({description})")

        try:
            start_time = time.time()

            if method == "OPTIONS":
                response = requests.request(
                    method, f"{base_url}{endpoint}",
                    headers={'Origin': 'https://example.com'},
                    timeout=10
                )
            else:
                response = requests.request(method, f"{base_url}{endpoint}", timeout=10)

            response_time = round((time.time() - start_time) * 1000, 2)

            result = {
                'status_code': response.status_code,
                'response_time_ms': response_time,
                'success': response.status_code < 400,
                'headers': dict(response.headers),
                'content_type': response.headers.get('Content-Type', ''),
            }

            if response.status_code < 400:
                try:
                    if 'json' in result['content_type']:
                        result['data'] = response.json()
                    else:
                        result['data'] = response.text[:500]  # First 500 chars
                except:
                    result['data'] = response.text[:500]

            results[f"{method}_{endpoint}"] = result

            status_icon = "✅" if result['success'] else "❌"
            print(f"{status_icon} Status: {response.status_code} | Time: {response_time}ms")

            if method == "OPTIONS":
                cors_headers = [h for h in response.headers.keys() if h.lower().startswith('access-control')]
                if cors_headers:
                    print(f"   CORS headers: {cors_headers}")
                else:
                    print("   No CORS headers found")

        except Exception as e:
            result = {
                'status_code': None,
                'response_time_ms': None,
                'success': False,
                'error': str(e)
            }
            results[f"{method}_{endpoint}"] = result
            print(f"❌ Error: {e}")

    return results

def test_endpoint_discovery():
    """Try to discover additional endpoints"""
    print("\n\n🔍 ENDPOINT DISCOVERY...")
    print("=" * 50)

    # Test common endpoint patterns
    common_paths = [
        "/status",
        "/ping",
        "/version",
        "/info",
        "/metrics",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
    ]

    for path in common_paths:
        try:
            response = requests.get(f"{base_url}{path}", timeout=5)
            if response.status_code != 404:
                print(f"✅ Found: {path} (Status: {response.status_code})")
            else:
                print(f"   {path} - Not found")
        except:
            print(f"   {path} - Error")

def test_authentication_error_details():
    """Test authentication endpoints to get detailed error information"""
    print("\n\n🔐 AUTHENTICATION ERROR ANALYSIS...")
    print("=" * 50)

    # Test registration with minimal data
    print("\n📝 Testing registration with minimal valid data...")
    min_registration = {
        "email": "test@example.com",
        "password": "TestPass123"
    }

    try:
        response = requests.post(f"{base_url}/auth/register", json=min_registration, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"Error: {e}")

    # Test login with form data
    print("\n🔑 Testing login with form data...")
    login_form = {
        "username": "test@example.com",
        "password": "TestPass123"
    }

    try:
        response = requests.post(
            f"{base_url}/auth/login",
            data=login_form,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    print("🚀 COMPREHENSIVE PUBLIC ENDPOINT TESTING")
    print(f"🎯 Target: {base_url}")
    print("=" * 60)

    # Test public endpoints
    public_results = test_public_endpoints()

    # Test endpoint discovery
    test_endpoint_discovery()

    # Test authentication error details
    test_authentication_error_details()

    # Summary
    print("\n\n📊 SUMMARY")
    print("=" * 60)

    working_endpoints = [k for k, v in public_results.items() if v.get('success')]
    failing_endpoints = [k for k, v in public_results.items() if not v.get('success')]

    print(f"✅ Working endpoints: {len(working_endpoints)}")
    for endpoint in working_endpoints:
        result = public_results[endpoint]
        print(f"   {endpoint}: {result['status_code']} ({result['response_time_ms']}ms)")

    print(f"\n❌ Failing endpoints: {len(failing_endpoints)}")
    for endpoint in failing_endpoints:
        result = public_results[endpoint]
        if 'error' in result:
            print(f"   {endpoint}: {result['error']}")
        else:
            print(f"   {endpoint}: {result['status_code']}")

    # Save results
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"public_endpoint_test_{timestamp}.json"
    with open(filename, 'w') as f:
        json.dump(public_results, f, indent=2)
    print(f"\n💾 Results saved to: {filename}")

    return public_results

if __name__ == "__main__":
    main()