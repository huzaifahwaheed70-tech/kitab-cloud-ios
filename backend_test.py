import requests
import sys
import json
from datetime import datetime

class DarussamAPITester:
    def __init__(self, base_url="https://kitab-cloud.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_tiers_endpoint(self):
        """Test the tiers endpoint"""
        return self.run_test("Subscription Tiers", "GET", "tiers", 200)

    def test_register(self, email, password, name):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": email, "password": password, "name": name}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('user_id')
            print(f"   Registered user: {self.user_id}")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('user_id')
            print(f"   Logged in user: {self.user_id}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_books(self):
        """Test getting books (requires auth)"""
        return self.run_test("Get Books", "GET", "books", 200)

    def test_get_books_preview(self):
        """Test getting books preview (no auth)"""
        # Temporarily remove token for this test
        temp_token = self.token
        self.token = None
        success, response = self.run_test("Get Books Preview", "GET", "books/all", 200)
        self.token = temp_token
        return success, response

    def test_get_bookshelf(self):
        """Test getting user's bookshelf"""
        return self.run_test("Get Bookshelf", "GET", "bookshelf", 200)

    def test_scan_request(self, book_title, darussalam_code):
        """Test creating a scan request"""
        return self.run_test(
            "Create Scan Request",
            "POST",
            "scan-requests",
            200,
            data={"book_title": book_title, "darussalam_code": darussalam_code, "notes": "Test scan request"}
        )

    def test_get_scan_requests(self):
        """Test getting user's scan requests"""
        return self.run_test("Get My Scan Requests", "GET", "scan-requests", 200)

    def test_logout(self):
        """Test user logout"""
        return self.run_test("User Logout", "POST", "auth/logout", 200)

def main():
    print("🚀 Starting Darussalam Kitab Cloud API Tests")
    print("=" * 50)
    
    # Setup
    tester = DarussamAPITester()
    timestamp = datetime.now().strftime('%H%M%S')
    test_email = f"test_user_{timestamp}@example.com"
    test_password = "TestPass123!"
    test_name = f"Test User {timestamp}"

    # Test 1: Root endpoint
    print("\n📍 Testing Basic Endpoints")
    tester.test_root_endpoint()
    
    # Test 2: Tiers endpoint
    tester.test_tiers_endpoint()
    
    # Test 3: Books preview (no auth)
    tester.test_get_books_preview()

    # Test 4: User registration
    print("\n👤 Testing Authentication")
    if not tester.test_register(test_email, test_password, test_name):
        print("❌ Registration failed, stopping auth tests")
        return 1

    # Test 5: Get current user
    tester.test_auth_me()

    # Test 6: Get books (with auth)
    print("\n📚 Testing Book Operations")
    tester.test_get_books()

    # Test 7: Get bookshelf
    tester.test_get_bookshelf()

    # Test 8: Create scan request
    print("\n📝 Testing Scan Requests")
    tester.test_scan_request("Test Book Title", "TEST123")
    
    # Test 9: Get scan requests
    tester.test_get_scan_requests()

    # Test 10: Test login with same credentials
    print("\n🔐 Testing Login")
    # Clear token first
    tester.token = None
    tester.test_login(test_email, test_password)

    # Test 11: Logout
    tester.test_logout()

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())