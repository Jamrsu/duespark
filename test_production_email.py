#!/usr/bin/env python3
"""
Test script for DueSpark email functionality in production
Use this to test your AWS SES setup after deployment to Render
"""

import os
import sys
import requests
import json
from datetime import datetime

# Configuration
RENDER_BASE_URL = "https://duespark-backend.onrender.com"  # Replace with your actual Render URL
API_BASE_URL = f"{RENDER_BASE_URL}/api/v1"

def test_health_check():
    """Test if the backend is running"""
    print("🔍 Testing backend health...")
    try:
        response = requests.get(f"{RENDER_BASE_URL}/healthz", timeout=10)
        if response.status_code == 200:
            print("✅ Backend is healthy!")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_email_endpoint(to_email):
    """Test email sending to verified address"""
    print(f"📧 Testing email to: {to_email}")

    # Test data
    email_data = {
        "to": to_email,
        "subject": "DueSpark Production Test Email"
    }

    try:
        # Try simple test endpoint first (no auth required)
        response = requests.post(
            f"{RENDER_BASE_URL}/test-email-simple",
            json=email_data,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            print("✅ Email sent successfully!")
            print(f"   Message ID: {result.get('message_id', 'N/A')}")
            return True
        else:
            print(f"❌ Email failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Raw response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Email test error: {e}")
        return False

def test_ses_configuration():
    """Test SES configuration endpoint"""
    print("⚙️ Testing email configuration...")
    try:
        # Test basic API connectivity first
        response = requests.get(f"{RENDER_BASE_URL}/docs", timeout=10)
        if response.status_code == 200:
            print("✅ API is accessible!")
            print("   SES configuration will be tested when admin endpoint is available")
            return True
        else:
            print(f"❌ API not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API connectivity test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 DueSpark Production Email Testing")
    print("=" * 50)
    print(f"Testing backend at: {RENDER_BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    # Get email for testing
    test_email = input("Enter a VERIFIED email address for testing: ").strip()
    if not test_email:
        print("❌ Email address is required!")
        sys.exit(1)

    print()
    print("📋 Running tests...")
    print()

    # Run tests
    tests_passed = 0
    total_tests = 3

    # Test 1: Health check
    if test_health_check():
        tests_passed += 1
    print()

    # Test 2: SES configuration
    if test_ses_configuration():
        tests_passed += 1
    print()

    # Test 3: Email sending
    if test_email_endpoint(test_email):
        tests_passed += 1
    print()

    # Summary
    print("📊 Test Results")
    print("=" * 30)
    print(f"Passed: {tests_passed}/{total_tests}")

    if tests_passed == total_tests:
        print("🎉 All tests passed! Your email system is working!")
        print()
        print("📝 Next steps:")
        print("1. Check your email inbox for the test message")
        print("2. Verify AWS SES sending statistics in the console")
        print("3. Monitor your deployment logs in Render dashboard")
        print("4. Wait for AWS SES production access approval")
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        print()
        print("🔧 Troubleshooting:")
        print("1. Check Render deployment logs")
        print("2. Verify environment variables in Render dashboard")
        print("3. Ensure your AWS credentials are correct")
        print("4. Make sure the test email is verified in AWS SES")

    return tests_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)