"""
Backend API tests for Auth and Password Reset functionality
Tests: Login, Forgot Password, Reset Password endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Authentication login endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "huzaifahwaheed70@gmail.com",
            "password": "admin123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "huzaifahwaheed70@gmail.com"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"Login successful for user: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Invalid credentials correctly rejected: {data['detail']}")
    
    def test_login_wrong_password(self):
        """Test login with correct email but wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "huzaifahwaheed70@gmail.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Wrong password correctly rejected")


class TestForgotPassword:
    """Forgot password endpoint tests"""
    
    def test_forgot_password_existing_email(self):
        """Test forgot password with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "huzaifahwaheed70@gmail.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        # Should return generic message to prevent email enumeration
        assert "reset link" in data["message"].lower() or "email" in data["message"].lower()
        print(f"Forgot password response: {data['message']}")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with non-existent email (should still return 200 for security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })
        
        # Should return 200 to prevent email enumeration
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        print(f"Non-existent email response (security): {data['message']}")
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "invalid-email"
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("Invalid email format correctly rejected")


class TestResetPassword:
    """Reset password endpoint tests"""
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_123",
            "new_password": "newpassword123"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"Invalid token correctly rejected: {data['detail']}")
    
    def test_reset_password_missing_token(self):
        """Test reset password with missing token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "new_password": "newpassword123"
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("Missing token correctly rejected")
    
    def test_reset_password_missing_password(self):
        """Test reset password with missing new_password"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "some_token"
        })
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("Missing password correctly rejected")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_auth_me_with_valid_token(self):
        """Test /auth/me with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "huzaifahwaheed70@gmail.com",
            "password": "admin123"
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Now test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "email" in data
        assert data["email"] == "huzaifahwaheed70@gmail.com"
        print(f"Auth me successful: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized access correctly rejected")
    
    def test_auth_me_with_invalid_token(self):
        """Test /auth/me with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_123"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid token correctly rejected")


class TestNoGoogleAuth:
    """Tests to verify Google Auth has been removed"""
    
    def test_no_google_auth_endpoint(self):
        """Verify Google OAuth endpoints don't exist"""
        # Test common Google OAuth endpoint patterns
        endpoints_to_check = [
            "/api/auth/google",
            "/api/auth/google/callback",
            "/api/auth/oauth/google",
        ]
        
        for endpoint in endpoints_to_check:
            response = requests.get(f"{BASE_URL}{endpoint}")
            # Should return 404 or 405 (not found or method not allowed)
            assert response.status_code in [404, 405, 422], \
                f"Endpoint {endpoint} should not exist, got {response.status_code}"
            print(f"Verified {endpoint} does not exist (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
