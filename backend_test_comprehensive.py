#!/usr/bin/env python3
"""
Comprehensive Backend Testing Suite for DueSpark
Tests all endpoints after SQLAlchemy text() fix
"""

import requests
import json
import time
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class DueSparkBackendTester:
    def __init__(self, base_url: str = "https://duespark-backend.onrender.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {}
        self.performance_metrics = {}
        self.auth_token = None
        self.test_user_id = None
        self.test_client_id = None
        self.test_invoice_id = None

    def log_test(self, test_name: str, success: bool, response_time: float, details: str = ""):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "response_time": response_time,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} ({response_time:.3f}s): {details}")

    def generate_test_email(self) -> str:
        """Generate unique test email"""
        timestamp = int(time.time())
        random_suffix = ''.join(random.choices(string.ascii_lowercase, k=6))
        return f"test_{timestamp}_{random_suffix}@duespark.test"

    def make_request(self, method: str, endpoint: str, **kwargs) -> tuple[Optional[requests.Response], float]:
        """Make HTTP request with timing"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            if self.auth_token and 'headers' not in kwargs:
                kwargs['headers'] = {}
            if self.auth_token:
                kwargs['headers']['Authorization'] = f"Bearer {self.auth_token}"

            response = self.session.request(method, url, timeout=30, **kwargs)
            response_time = time.time() - start_time
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            print(f"Request failed: {str(e)}")
            return None, response_time

    def test_health_checks(self):
        """Test health check endpoints"""
        print("\n🔍 Testing Health Check Endpoints...")

        # Test /health endpoint
        response, response_time = self.make_request("GET", "/health")
        if response and response.status_code == 200:
            self.log_test("health_endpoint", True, response_time, f"Status: {response.json()}")
        else:
            self.log_test("health_endpoint", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

        # Test /healthz endpoint
        response, response_time = self.make_request("GET", "/healthz")
        if response and response.status_code == 200:
            self.log_test("healthz_endpoint", True, response_time, f"Status: {response.json()}")
        else:
            self.log_test("healthz_endpoint", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_api_documentation(self):
        """Test API documentation accessibility"""
        print("\n📚 Testing API Documentation...")

        response, response_time = self.make_request("GET", "/docs")
        if response and response.status_code == 200:
            self.log_test("api_docs", True, response_time, "Documentation accessible")
        else:
            self.log_test("api_docs", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

        # Test OpenAPI spec
        response, response_time = self.make_request("GET", "/openapi.json")
        if response and response.status_code == 200:
            self.log_test("openapi_spec", True, response_time, "OpenAPI spec accessible")
        else:
            self.log_test("openapi_spec", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")

        test_email = self.generate_test_email()
        registration_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "full_name": "Test User"
        }

        response, response_time = self.make_request(
            "POST", "/auth/register",
            json=registration_data
        )

        if response and response.status_code == 201:
            response_data = response.json()
            self.test_user_id = response_data.get("user", {}).get("id")
            self.log_test("user_registration", True, response_time,
                         f"User ID: {self.test_user_id}")
            return test_email, "TestPassword123!"
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", f"Status: {response.status_code}")
                except:
                    error_detail = f"Status: {response.status_code}"
            self.log_test("user_registration", False, response_time, error_detail)
            return None, None

    def test_user_login(self, email: str, password: str):
        """Test user login"""
        print("\n🔐 Testing User Login...")

        login_data = {
            "username": email,  # FastAPI OAuth2 uses 'username' field
            "password": password
        }

        response, response_time = self.make_request(
            "POST", "/auth/login",
            data=login_data,  # OAuth2 typically uses form data
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        if response and response.status_code == 200:
            response_data = response.json()
            self.auth_token = response_data.get("access_token")
            self.log_test("user_login", True, response_time,
                         f"Token received: {bool(self.auth_token)}")
            return True
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", f"Status: {response.status_code}")
                except:
                    error_detail = f"Status: {response.status_code}"
            self.log_test("user_login", False, response_time, error_detail)
            return False

    def test_protected_endpoint_access(self):
        """Test access to protected endpoints"""
        print("\n🔒 Testing Protected Endpoint Access...")

        # Test user profile endpoint
        response, response_time = self.make_request("GET", "/users/me")

        if response and response.status_code == 200:
            response_data = response.json()
            self.log_test("protected_endpoint", True, response_time,
                         f"User profile: {response_data.get('email')}")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", f"Status: {response.status_code}")
                except:
                    error_detail = f"Status: {response.status_code}"
            self.log_test("protected_endpoint", False, response_time, error_detail)

    def test_client_management(self):
        """Test client CRUD operations"""
        print("\n👥 Testing Client Management...")

        # Create client
        client_data = {
            "name": "Test Client Company",
            "email": "client@testcompany.com",
            "phone": "+1-555-0123",
            "address": "123 Test Street, Test City, TC 12345"
        }

        response, response_time = self.make_request("POST", "/clients/", json=client_data)

        if response and response.status_code == 201:
            response_data = response.json()
            self.test_client_id = response_data.get("id")
            self.log_test("client_creation", True, response_time,
                         f"Client ID: {self.test_client_id}")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", f"Status: {response.status_code}")
                except:
                    error_detail = f"Status: {response.status_code}"
            self.log_test("client_creation", False, response_time, error_detail)
            return

        # List clients
        response, response_time = self.make_request("GET", "/clients/")

        if response and response.status_code == 200:
            clients = response.json()
            self.log_test("client_list", True, response_time,
                         f"Found {len(clients)} clients")
        else:
            self.log_test("client_list", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

        # Get specific client
        if self.test_client_id:
            response, response_time = self.make_request("GET", f"/clients/{self.test_client_id}")

            if response and response.status_code == 200:
                client_data = response.json()
                self.log_test("client_retrieve", True, response_time,
                             f"Client: {client_data.get('name')}")
            else:
                self.log_test("client_retrieve", False, response_time,
                             f"Status: {response.status_code if response else 'No response'}")

    def test_invoice_management(self):
        """Test invoice CRUD operations"""
        print("\n📄 Testing Invoice Management...")

        if not self.test_client_id:
            self.log_test("invoice_creation", False, 0, "No client ID available")
            return

        # Create invoice
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        invoice_data = {
            "client_id": self.test_client_id,
            "amount": 1500.00,
            "due_date": due_date,
            "description": "Test invoice for comprehensive testing",
            "status": "pending"
        }

        response, response_time = self.make_request("POST", "/invoices/", json=invoice_data)

        if response and response.status_code == 201:
            response_data = response.json()
            self.test_invoice_id = response_data.get("id")
            self.log_test("invoice_creation", True, response_time,
                         f"Invoice ID: {self.test_invoice_id}")
        else:
            error_detail = ""
            if response:
                try:
                    error_detail = response.json().get("detail", f"Status: {response.status_code}")
                except:
                    error_detail = f"Status: {response.status_code}"
            self.log_test("invoice_creation", False, response_time, error_detail)
            return

        # List invoices
        response, response_time = self.make_request("GET", "/invoices/")

        if response and response.status_code == 200:
            invoices = response.json()
            self.log_test("invoice_list", True, response_time,
                         f"Found {len(invoices)} invoices")
        else:
            self.log_test("invoice_list", False, response_time,
                         f"Status: {response.status_code if response else 'No response'}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n🚨 Testing Error Handling...")

        # Test invalid endpoint
        response, response_time = self.make_request("GET", "/invalid-endpoint")
        if response and response.status_code == 404:
            self.log_test("invalid_endpoint", True, response_time, "Proper 404 response")
        else:
            self.log_test("invalid_endpoint", False, response_time,
                         f"Expected 404, got {response.status_code if response else 'No response'}")

        # Test unauthorized access
        temp_token = self.auth_token
        self.auth_token = None  # Remove auth token

        response, response_time = self.make_request("GET", "/users/me")
        if response and response.status_code == 401:
            self.log_test("unauthorized_access", True, response_time, "Proper 401 response")
        else:
            self.log_test("unauthorized_access", False, response_time,
                         f"Expected 401, got {response.status_code if response else 'No response'}")

        self.auth_token = temp_token  # Restore auth token

        # Test invalid data
        response, response_time = self.make_request("POST", "/clients/", json={"invalid": "data"})
        if response and response.status_code in [400, 422]:
            self.log_test("invalid_data", True, response_time, f"Proper {response.status_code} response")
        else:
            self.log_test("invalid_data", False, response_time,
                         f"Expected 400/422, got {response.status_code if response else 'No response'}")

    def calculate_performance_metrics(self):
        """Calculate performance metrics"""
        print("\n📊 Calculating Performance Metrics...")

        response_times = [result["response_time"] for result in self.test_results.values()]
        success_count = sum(1 for result in self.test_results.values() if result["success"])
        total_tests = len(self.test_results)

        self.performance_metrics = {
            "total_tests": total_tests,
            "successful_tests": success_count,
            "success_rate": (success_count / total_tests * 100) if total_tests > 0 else 0,
            "average_response_time": sum(response_times) / len(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "total_test_duration": sum(response_times)
        }

    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*80)
        print("🎯 COMPREHENSIVE BACKEND TEST REPORT")
        print("="*80)

        print(f"\n📈 PERFORMANCE SUMMARY:")
        print(f"   Total Tests: {self.performance_metrics['total_tests']}")
        print(f"   Successful: {self.performance_metrics['successful_tests']}")
        print(f"   Success Rate: {self.performance_metrics['success_rate']:.1f}%")
        print(f"   Average Response Time: {self.performance_metrics['average_response_time']:.3f}s")
        print(f"   Min Response Time: {self.performance_metrics['min_response_time']:.3f}s")
        print(f"   Max Response Time: {self.performance_metrics['max_response_time']:.3f}s")
        print(f"   Total Test Duration: {self.performance_metrics['total_test_duration']:.3f}s")

        print(f"\n📋 DETAILED TEST RESULTS:")
        for test_name, result in self.test_results.items():
            status = "✅" if result["success"] else "❌"
            print(f"   {status} {test_name}: {result['response_time']:.3f}s - {result['details']}")

        print(f"\n🔍 ANALYSIS:")
        if self.performance_metrics['success_rate'] >= 90:
            print("   🎉 EXCELLENT: Backend is functioning properly!")
        elif self.performance_metrics['success_rate'] >= 75:
            print("   ⚠️  GOOD: Most functionality working, minor issues detected")
        elif self.performance_metrics['success_rate'] >= 50:
            print("   🚨 POOR: Significant issues detected, needs attention")
        else:
            print("   💥 CRITICAL: Major functionality broken, immediate action required")

        if self.performance_metrics['average_response_time'] < 1.0:
            print("   🚀 Response times are excellent")
        elif self.performance_metrics['average_response_time'] < 3.0:
            print("   ⏱️  Response times are acceptable")
        else:
            print("   🐌 Response times are slow, optimization needed")

        # SQLAlchemy fix assessment
        database_tests = [name for name in self.test_results.keys()
                         if any(keyword in name for keyword in ['health', 'registration', 'login', 'client', 'invoice'])]
        database_success = sum(1 for name in database_tests if self.test_results[name]["success"])
        database_total = len(database_tests)

        print(f"\n🗄️  DATABASE FUNCTIONALITY:")
        print(f"   Database-related tests: {database_success}/{database_total}")
        if database_total > 0:
            db_success_rate = (database_success / database_total * 100)
            print(f"   Database success rate: {db_success_rate:.1f}%")

            if db_success_rate >= 90:
                print("   ✅ SQLAlchemy text() fix appears successful!")
            elif db_success_rate >= 50:
                print("   ⚠️  Some database issues may remain")
            else:
                print("   ❌ Database connectivity still has major issues")

    def run_comprehensive_test(self):
        """Run all tests"""
        print("🚀 Starting Comprehensive DueSpark Backend Testing...")
        print(f"Backend URL: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")

        # Run all test categories
        self.test_health_checks()
        self.test_api_documentation()

        # Authentication flow
        email, password = self.test_user_registration()
        if email and password:
            login_success = self.test_user_login(email, password)

            if login_success:
                self.test_protected_endpoint_access()
                self.test_client_management()
                self.test_invoice_management()

        self.test_error_handling()

        # Calculate metrics and generate report
        self.calculate_performance_metrics()
        self.generate_report()

        return self.test_results, self.performance_metrics

if __name__ == "__main__":
    tester = DueSparkBackendTester()
    test_results, performance_metrics = tester.run_comprehensive_test()