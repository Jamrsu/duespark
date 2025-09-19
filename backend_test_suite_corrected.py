#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Suite for DueSpark (CORRECTED)
Tests all endpoints using the correct API paths from OpenAPI spec
"""

import requests
import json
import time
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import urllib.parse

class DueSparkAPITester:
    def __init__(self, base_url: str = "https://duespark-backend.onrender.com"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_client_id = None
        self.test_invoice_id = None
        self.test_reminder_id = None
        self.results = {
            'connectivity': {},
            'authentication': {},
            'client_management': {},
            'invoice_management': {},
            'reminder_system': {},
            'analytics': {},
            'templates': {},
            'integrations': {},
            'performance': {},
            'errors': []
        }

    def log_result(self, category: str, test_name: str, success: bool,
                   response_time: float = None, details: str = None,
                   status_code: int = None, response_data: Any = None):
        """Log test results"""
        result = {
            'test_name': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round(response_time * 1000, 2) if response_time else None,
            'status_code': status_code,
            'details': details,
            'response_data': response_data
        }

        if category not in self.results:
            self.results[category] = {}
        self.results[category][test_name] = result

        if not success:
            self.results['errors'].append(f"{category}.{test_name}: {details}")

        print(f"[{category.upper()}] {test_name}: {'✅ PASS' if success else '❌ FAIL'}")
        if details:
            print(f"  └─ {details}")
        if response_time:
            print(f"  └─ Response time: {round(response_time * 1000, 2)}ms")

    def make_request(self, method: str, endpoint: str, **kwargs) -> tuple:
        """Make HTTP request and measure response time"""
        url = f"{self.base_url}{endpoint}"

        # Add auth header if we have a token
        if self.auth_token and 'headers' not in kwargs:
            kwargs['headers'] = {}
        if self.auth_token:
            if 'headers' not in kwargs:
                kwargs['headers'] = {}
            kwargs['headers']['Authorization'] = f"Bearer {self.auth_token}"

        start_time = time.time()
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
            response_time = time.time() - start_time
            return response, response_time, None
        except Exception as e:
            response_time = time.time() - start_time
            return None, response_time, str(e)

    def generate_random_string(self, length: int = 8) -> str:
        """Generate random string for testing"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

    def test_basic_connectivity(self):
        """Test basic connectivity and health endpoints"""
        print("\n🔍 TESTING BASIC CONNECTIVITY...")

        # Test docs endpoint (we know this works)
        response, response_time, error = self.make_request('GET', '/docs')
        if error:
            self.log_result('connectivity', 'api_docs', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            self.log_result('connectivity', 'api_docs', success, response_time,
                          f"Status: {response.status_code}", response.status_code)

        # Test OpenAPI spec
        response, response_time, error = self.make_request('GET', '/openapi.json')
        if error:
            self.log_result('connectivity', 'openapi_spec', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json()
                endpoint_count = len(data.get('paths', {}))
                self.log_result('connectivity', 'openapi_spec', success, response_time,
                              f"Status: {response.status_code}, Endpoints: {endpoint_count}",
                              response.status_code, {'endpoint_count': endpoint_count})
            except:
                self.log_result('connectivity', 'openapi_spec', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test CORS headers
        response, response_time, error = self.make_request('OPTIONS', '/docs',
                                                         headers={'Origin': 'https://example.com'})
        if not error and response:
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            has_cors = any(cors_headers.values())
            self.log_result('connectivity', 'cors_support', has_cors, response_time,
                          f"CORS headers present: {has_cors}", response.status_code, cors_headers)

    def test_authentication(self):
        """Test authentication system"""
        print("\n🔐 TESTING AUTHENTICATION SYSTEM...")

        # Generate unique test user
        test_username = f"testuser_{self.generate_random_string()}"
        test_email = f"test_{self.generate_random_string()}@example.com"
        test_password = "TestPassword123!"

        # Test user registration (correct endpoint: /auth/register)
        registration_data = {
            "username": test_username,
            "email": test_email,
            "password": test_password,
            "full_name": "Test User"
        }

        response, response_time, error = self.make_request('POST', '/auth/register',
                                                         json=registration_data)
        if error:
            self.log_result('authentication', 'user_registration', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code in [200, 201]
            try:
                data = response.json() if response.content else {}
                if success and 'id' in data:
                    self.test_user_id = data['id']
                self.log_result('authentication', 'user_registration', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('authentication', 'user_registration', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test user login (correct endpoint: /auth/login)
        login_data = {
            "username": test_username,
            "password": test_password
        }

        response, response_time, error = self.make_request('POST', '/auth/login',
                                                         json=login_data)
        if error:
            self.log_result('authentication', 'user_login', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                if success and 'access_token' in data:
                    self.auth_token = data['access_token']
                self.log_result('authentication', 'user_login', success, response_time,
                              f"Status: {response.status_code}, Token received: {'access_token' in data}",
                              response.status_code, {'token_type': data.get('token_type')})
            except:
                self.log_result('authentication', 'user_login', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test protected endpoint access (correct endpoint: /auth/me)
        response, response_time, error = self.make_request('GET', '/auth/me')
        if error:
            self.log_result('authentication', 'protected_endpoint_access', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                self.log_result('authentication', 'protected_endpoint_access', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('authentication', 'protected_endpoint_access', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test invalid token
        old_token = self.auth_token
        self.auth_token = "invalid_token"
        response, response_time, error = self.make_request('GET', '/auth/me')
        success = response and response.status_code == 401
        self.log_result('authentication', 'invalid_token_rejection', success, response_time,
                      f"Status: {response.status_code if response else 'No response'}",
                      response.status_code if response else None)
        self.auth_token = old_token  # Restore valid token

    def test_client_management(self):
        """Test client CRUD operations"""
        print("\n👥 TESTING CLIENT MANAGEMENT...")

        if not self.auth_token:
            self.log_result('client_management', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test create client
        client_data = {
            "name": f"Test Client {self.generate_random_string()}",
            "email": f"client_{self.generate_random_string()}@example.com",
            "phone": "+1234567890",
            "address": "123 Test Street, Test City, TS 12345"
        }

        response, response_time, error = self.make_request('POST', '/clients', json=client_data)
        if error:
            self.log_result('client_management', 'create_client', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code in [200, 201]
            try:
                data = response.json() if response.content else {}
                if success and 'id' in data:
                    self.test_client_id = data['id']
                self.log_result('client_management', 'create_client', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('client_management', 'create_client', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test list clients
        response, response_time, error = self.make_request('GET', '/clients')
        if error:
            self.log_result('client_management', 'list_clients', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else []
                client_count = len(data) if isinstance(data, list) else 0
                self.log_result('client_management', 'list_clients', success, response_time,
                              f"Status: {response.status_code}, Clients found: {client_count}",
                              response.status_code, {'client_count': client_count})
            except:
                self.log_result('client_management', 'list_clients', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test get specific client
        if self.test_client_id:
            response, response_time, error = self.make_request('GET', f'/clients/{self.test_client_id}')
            if error:
                self.log_result('client_management', 'get_client', False, response_time,
                              f"Connection error: {error}")
            else:
                success = response.status_code == 200
                try:
                    data = response.json() if response.content else {}
                    self.log_result('client_management', 'get_client', success, response_time,
                                  f"Status: {response.status_code}", response.status_code, data)
                except:
                    self.log_result('client_management', 'get_client', False, response_time,
                                  f"Invalid JSON response, Status: {response.status_code}",
                                  response.status_code)

        # Test update client
        if self.test_client_id:
            update_data = {
                "name": f"Updated Test Client {self.generate_random_string()}",
                "email": client_data["email"],  # Keep same email
                "phone": "+1987654321",
                "address": "456 Updated Street, Updated City, UP 54321"
            }

            response, response_time, error = self.make_request('PUT', f'/clients/{self.test_client_id}',
                                                             json=update_data)
            if error:
                self.log_result('client_management', 'update_client', False, response_time,
                              f"Connection error: {error}")
            else:
                success = response.status_code == 200
                try:
                    data = response.json() if response.content else {}
                    self.log_result('client_management', 'update_client', success, response_time,
                                  f"Status: {response.status_code}", response.status_code, data)
                except:
                    self.log_result('client_management', 'update_client', False, response_time,
                                  f"Invalid JSON response, Status: {response.status_code}",
                                  response.status_code)

    def test_invoice_management(self):
        """Test invoice CRUD operations"""
        print("\n📄 TESTING INVOICE MANAGEMENT...")

        if not self.auth_token:
            self.log_result('invoice_management', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        if not self.test_client_id:
            self.log_result('invoice_management', 'client_required', False, 0,
                          "No test client available for invoice testing")
            return

        # Test create invoice
        invoice_data = {
            "client_id": self.test_client_id,
            "amount": 1500.00,
            "description": f"Test Invoice {self.generate_random_string()}",
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "draft"
        }

        response, response_time, error = self.make_request('POST', '/invoices', json=invoice_data)
        if error:
            self.log_result('invoice_management', 'create_invoice', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code in [200, 201]
            try:
                data = response.json() if response.content else {}
                if success and 'id' in data:
                    self.test_invoice_id = data['id']
                self.log_result('invoice_management', 'create_invoice', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('invoice_management', 'create_invoice', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test list invoices
        response, response_time, error = self.make_request('GET', '/invoices')
        if error:
            self.log_result('invoice_management', 'list_invoices', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else []
                invoice_count = len(data) if isinstance(data, list) else 0
                self.log_result('invoice_management', 'list_invoices', success, response_time,
                              f"Status: {response.status_code}, Invoices found: {invoice_count}",
                              response.status_code, {'invoice_count': invoice_count})
            except:
                self.log_result('invoice_management', 'list_invoices', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test get specific invoice
        if self.test_invoice_id:
            response, response_time, error = self.make_request('GET', f'/invoices/{self.test_invoice_id}')
            if error:
                self.log_result('invoice_management', 'get_invoice', False, response_time,
                              f"Connection error: {error}")
            else:
                success = response.status_code == 200
                try:
                    data = response.json() if response.content else {}
                    self.log_result('invoice_management', 'get_invoice', success, response_time,
                                  f"Status: {response.status_code}", response.status_code, data)
                except:
                    self.log_result('invoice_management', 'get_invoice', False, response_time,
                                  f"Invalid JSON response, Status: {response.status_code}",
                                  response.status_code)

        # Test update invoice
        if self.test_invoice_id:
            update_data = {
                "amount": 1750.00,
                "description": f"Updated Test Invoice {self.generate_random_string()}",
                "status": "sent"
            }

            response, response_time, error = self.make_request('PUT', f'/invoices/{self.test_invoice_id}',
                                                             json=update_data)
            if error:
                self.log_result('invoice_management', 'update_invoice', False, response_time,
                              f"Connection error: {error}")
            else:
                success = response.status_code == 200
                try:
                    data = response.json() if response.content else {}
                    self.log_result('invoice_management', 'update_invoice', success, response_time,
                                  f"Status: {response.status_code}", response.status_code, data)
                except:
                    self.log_result('invoice_management', 'update_invoice', False, response_time,
                                  f"Invalid JSON response, Status: {response.status_code}",
                                  response.status_code)

    def test_reminder_system(self):
        """Test reminder system"""
        print("\n⏰ TESTING REMINDER SYSTEM...")

        if not self.auth_token:
            self.log_result('reminder_system', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test list reminders
        response, response_time, error = self.make_request('GET', '/reminders')
        if error:
            self.log_result('reminder_system', 'list_reminders', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else []
                reminder_count = len(data) if isinstance(data, list) else 0
                self.log_result('reminder_system', 'list_reminders', success, response_time,
                              f"Status: {response.status_code}, Reminders found: {reminder_count}",
                              response.status_code, {'reminder_count': reminder_count})
            except:
                self.log_result('reminder_system', 'list_reminders', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test create reminder (if we have an invoice)
        if self.test_invoice_id:
            reminder_data = {
                "invoice_id": self.test_invoice_id,
                "days_before_due": 7,
                "message": f"Test reminder {self.generate_random_string()}"
            }

            response, response_time, error = self.make_request('POST', '/reminders',
                                                             json=reminder_data)
            if error:
                self.log_result('reminder_system', 'create_reminder', False, response_time,
                              f"Connection error: {error}")
            else:
                success = response.status_code in [200, 201]
                try:
                    data = response.json() if response.content else {}
                    if success and 'id' in data:
                        self.test_reminder_id = data['id']
                    self.log_result('reminder_system', 'create_reminder', success, response_time,
                                  f"Status: {response.status_code}", response.status_code, data)
                except:
                    self.log_result('reminder_system', 'create_reminder', False, response_time,
                                  f"Invalid JSON response, Status: {response.status_code}",
                                  response.status_code)

        # Test reminder preview
        preview_data = {
            "invoice_id": self.test_invoice_id if self.test_invoice_id else 1,
            "template_type": "payment_reminder"
        }

        response, response_time, error = self.make_request('POST', '/reminders/preview',
                                                         json=preview_data)
        if error:
            self.log_result('reminder_system', 'reminder_preview', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                self.log_result('reminder_system', 'reminder_preview', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                # Might be HTML response
                is_html = 'html' in response.headers.get('content-type', '').lower()
                self.log_result('reminder_system', 'reminder_preview', is_html, response_time,
                              f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}",
                              response.status_code)

    def test_analytics(self):
        """Test analytics endpoints"""
        print("\n📊 TESTING ANALYTICS...")

        if not self.auth_token:
            self.log_result('analytics', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test analytics summary
        response, response_time, error = self.make_request('GET', '/analytics/summary')
        if error:
            self.log_result('analytics', 'analytics_summary', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                self.log_result('analytics', 'analytics_summary', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('analytics', 'analytics_summary', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

        # Test analytics timeseries
        response, response_time, error = self.make_request('GET', '/analytics/timeseries')
        if error:
            self.log_result('analytics', 'analytics_timeseries', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                self.log_result('analytics', 'analytics_timeseries', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('analytics', 'analytics_timeseries', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

    def test_templates(self):
        """Test template endpoints"""
        print("\n📝 TESTING TEMPLATES...")

        if not self.auth_token:
            self.log_result('templates', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test list templates
        response, response_time, error = self.make_request('GET', '/templates')
        if error:
            self.log_result('templates', 'list_templates', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else []
                template_count = len(data) if isinstance(data, list) else 0
                self.log_result('templates', 'list_templates', success, response_time,
                              f"Status: {response.status_code}, Templates found: {template_count}",
                              response.status_code, {'template_count': template_count})
            except:
                self.log_result('templates', 'list_templates', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

    def test_integrations(self):
        """Test Stripe integration endpoints"""
        print("\n🔗 TESTING INTEGRATIONS...")

        if not self.auth_token:
            self.log_result('integrations', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test Stripe status
        response, response_time, error = self.make_request('GET', '/integrations/stripe/status')
        if error:
            self.log_result('integrations', 'stripe_status', False, response_time,
                          f"Connection error: {error}")
        else:
            success = response.status_code == 200
            try:
                data = response.json() if response.content else {}
                self.log_result('integrations', 'stripe_status', success, response_time,
                              f"Status: {response.status_code}", response.status_code, data)
            except:
                self.log_result('integrations', 'stripe_status', False, response_time,
                              f"Invalid JSON response, Status: {response.status_code}",
                              response.status_code)

    def test_database_performance(self):
        """Test database queries and performance"""
        print("\n💾 TESTING DATABASE PERFORMANCE...")

        if not self.auth_token:
            self.log_result('database', 'authentication_required', False, 0,
                          "No auth token available for testing")
            return

        # Test multiple concurrent requests to measure consistency
        endpoints_to_test = ['/clients', '/invoices', '/auth/me', '/reminders']

        for endpoint in endpoints_to_test:
            response_times = []
            success_count = 0

            for i in range(3):  # Test each endpoint 3 times
                response, response_time, error = self.make_request('GET', endpoint)
                if not error and response and response.status_code == 200:
                    success_count += 1
                    response_times.append(response_time)
                time.sleep(0.1)  # Small delay between requests

            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
                consistency = success_count / 3
                self.log_result('performance', f'consistency_{endpoint.replace("/", "_")}',
                              consistency >= 0.8, avg_response_time,
                              f"Success rate: {success_count}/3, Avg response: {round(avg_response_time * 1000, 2)}ms")

    def generate_performance_summary(self):
        """Generate performance summary from all tests"""
        all_response_times = []
        total_tests = 0
        passed_tests = 0

        for category, tests in self.results.items():
            if category == 'errors':
                continue
            for test_name, result in tests.items():
                if isinstance(result, dict):
                    total_tests += 1
                    if result.get('success'):
                        passed_tests += 1
                    if result.get('response_time_ms'):
                        all_response_times.append(result['response_time_ms'])

        if all_response_times:
            avg_response_time = sum(all_response_times) / len(all_response_times)
            max_response_time = max(all_response_times)
            min_response_time = min(all_response_times)
        else:
            avg_response_time = max_response_time = min_response_time = 0

        self.results['performance']['summary'] = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'success_rate': round((passed_tests / total_tests * 100), 2) if total_tests > 0 else 0,
            'avg_response_time_ms': round(avg_response_time, 2),
            'max_response_time_ms': round(max_response_time, 2),
            'min_response_time_ms': round(min_response_time, 2),
            'total_errors': len(self.results['errors'])
        }

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 STARTING COMPREHENSIVE BACKEND API TESTING (CORRECTED)")
        print(f"🎯 Target URL: {self.base_url}")
        print("=" * 60)

        start_time = time.time()

        # Run all test suites
        self.test_basic_connectivity()
        self.test_authentication()
        self.test_client_management()
        self.test_invoice_management()
        self.test_reminder_system()
        self.test_analytics()
        self.test_templates()
        self.test_integrations()
        self.test_database_performance()

        # Generate performance summary
        self.generate_performance_summary()

        total_time = time.time() - start_time

        print("\n" + "=" * 60)
        print("🏁 TESTING COMPLETED")
        print(f"⏱️  Total test time: {round(total_time, 2)} seconds")

        # Print summary
        summary = self.results['performance']['summary']
        print(f"📊 Tests: {summary['passed_tests']}/{summary['total_tests']} passed ({summary['success_rate']}%)")
        print(f"⚡ Avg response time: {summary['avg_response_time_ms']}ms")
        print(f"❌ Total errors: {summary['total_errors']}")

        if self.results['errors']:
            print(f"\n🚨 ERRORS ENCOUNTERED:")
            for error in self.results['errors'][:10]:  # Show first 10 errors
                print(f"  • {error}")

        return self.results

    def save_results(self, filename: str = None):
        """Save test results to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"backend_test_results_corrected_{timestamp}.json"

        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print(f"💾 Results saved to: {filename}")
        return filename

def main():
    """Main testing function"""
    tester = DueSparkAPITester()
    results = tester.run_all_tests()

    # Save results
    results_file = tester.save_results()

    return results, results_file

if __name__ == "__main__":
    main()