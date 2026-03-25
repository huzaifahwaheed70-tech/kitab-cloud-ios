"""
Test Settings Page API Endpoints
Tests for: /user/profile, /user/password, /user/cancel-subscription, /user/reactivate-subscription
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "huzaifahwaheed70@gmail.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestUserProfile:
    """Tests for /user/profile endpoint"""
    
    def test_get_user_profile_success(self, auth_headers):
        """Test GET /user/profile returns user data with tier info"""
        response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "email" in data, "Profile should contain email"
        assert "name" in data, "Profile should contain name"
        assert "subscription_tier" in data, "Profile should contain subscription_tier"
        assert "tier_info" in data, "Profile should contain tier_info"
        assert "has_password" in data, "Profile should contain has_password"
        
        # Verify tier_info structure
        tier_info = data["tier_info"]
        assert "name" in tier_info, "tier_info should contain name"
        assert "price" in tier_info, "tier_info should contain price"
        assert "book_limit" in tier_info, "tier_info should contain book_limit"
        
        # Verify cancellation fields exist
        assert "cancellation_pending" in data, "Profile should contain cancellation_pending"
        
        print(f"Profile data: email={data['email']}, tier={data['subscription_tier']}, tier_name={tier_info['name']}, has_password={data['has_password']}")
    
    def test_get_user_profile_unauthorized(self):
        """Test GET /user/profile without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_update_profile_name(self, auth_headers):
        """Test PUT /user/profile to update name"""
        # First get current name
        get_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        original_name = get_response.json().get("name")
        
        # Update name
        new_name = "Test Updated Name"
        response = requests.put(f"{BASE_URL}/api/user/profile", 
            headers=auth_headers,
            json={"name": new_name}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "message" in response.json()
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        assert verify_response.json()["name"] == new_name
        
        # Restore original name
        requests.put(f"{BASE_URL}/api/user/profile", 
            headers=auth_headers,
            json={"name": original_name}
        )
        print(f"Profile name update test passed: {original_name} -> {new_name} -> {original_name}")
    
    def test_update_profile_no_data(self, auth_headers):
        """Test PUT /user/profile with no data returns 400"""
        response = requests.put(f"{BASE_URL}/api/user/profile", 
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestPasswordChange:
    """Tests for /user/password endpoint"""
    
    def test_change_password_wrong_current(self, auth_headers):
        """Test PUT /user/password with wrong current password returns 400"""
        response = requests.put(f"{BASE_URL}/api/user/password",
            headers=auth_headers,
            json={
                "current_password": "wrongpassword123",
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "incorrect" in response.json().get("detail", "").lower()
        print("Password change with wrong current password correctly rejected")
    
    def test_change_password_unauthorized(self):
        """Test PUT /user/password without auth returns 401"""
        response = requests.put(f"{BASE_URL}/api/user/password",
            json={
                "current_password": "test",
                "new_password": "test123"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestCancelSubscription:
    """Tests for /user/cancel-subscription endpoint"""
    
    def test_cancel_subscription_success(self, auth_headers):
        """Test POST /user/cancel-subscription creates pending cancellation"""
        # First check if there's already a pending cancellation
        profile_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        profile = profile_response.json()
        
        if profile.get("subscription_tier", 0) == 0:
            pytest.skip("User has no active subscription to cancel")
        
        if profile.get("cancellation_pending"):
            # Reactivate first to test cancel
            requests.post(f"{BASE_URL}/api/user/reactivate-subscription", headers=auth_headers)
        
        # Now cancel
        response = requests.post(f"{BASE_URL}/api/user/cancel-subscription", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "effective_date" in data
        print(f"Subscription cancellation scheduled for: {data['effective_date']}")
        
        # Verify cancellation is pending
        verify_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        assert verify_response.json().get("cancellation_pending") == True
    
    def test_cancel_subscription_already_pending(self, auth_headers):
        """Test POST /user/cancel-subscription when already pending returns 400"""
        # First ensure there's a pending cancellation
        profile_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        profile = profile_response.json()
        
        if profile.get("subscription_tier", 0) == 0:
            pytest.skip("User has no active subscription")
        
        if not profile.get("cancellation_pending"):
            # Create a pending cancellation first
            requests.post(f"{BASE_URL}/api/user/cancel-subscription", headers=auth_headers)
        
        # Try to cancel again
        response = requests.post(f"{BASE_URL}/api/user/cancel-subscription", headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already pending" in response.json().get("detail", "").lower()
        print("Double cancellation correctly rejected")
    
    def test_cancel_subscription_unauthorized(self):
        """Test POST /user/cancel-subscription without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/user/cancel-subscription")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestReactivateSubscription:
    """Tests for /user/reactivate-subscription endpoint"""
    
    def test_reactivate_subscription_success(self, auth_headers):
        """Test POST /user/reactivate-subscription removes pending cancellation"""
        # First ensure there's a pending cancellation
        profile_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        profile = profile_response.json()
        
        if profile.get("subscription_tier", 0) == 0:
            pytest.skip("User has no active subscription")
        
        if not profile.get("cancellation_pending"):
            # Create a pending cancellation first
            cancel_response = requests.post(f"{BASE_URL}/api/user/cancel-subscription", headers=auth_headers)
            if cancel_response.status_code != 200:
                pytest.skip("Could not create pending cancellation for test")
        
        # Now reactivate
        response = requests.post(f"{BASE_URL}/api/user/reactivate-subscription", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "message" in response.json()
        print("Subscription reactivated successfully")
        
        # Verify cancellation is no longer pending
        verify_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        assert verify_response.json().get("cancellation_pending") == False
    
    def test_reactivate_no_pending_cancellation(self, auth_headers):
        """Test POST /user/reactivate-subscription when no pending cancellation returns 400"""
        # First ensure there's no pending cancellation
        profile_response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        profile = profile_response.json()
        
        if profile.get("cancellation_pending"):
            # Remove pending cancellation first
            requests.post(f"{BASE_URL}/api/user/reactivate-subscription", headers=auth_headers)
        
        # Try to reactivate when nothing is pending
        response = requests.post(f"{BASE_URL}/api/user/reactivate-subscription", headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Reactivation without pending cancellation correctly rejected")
    
    def test_reactivate_subscription_unauthorized(self):
        """Test POST /user/reactivate-subscription without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/user/reactivate-subscription")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestTierInfo:
    """Tests for tier info in profile"""
    
    def test_tier_info_structure(self, auth_headers):
        """Test that tier_info contains correct structure for premium user"""
        response = requests.get(f"{BASE_URL}/api/user/profile", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        tier = data.get("subscription_tier", 0)
        tier_info = data.get("tier_info", {})
        
        # For tier 5+ (admin/premium), should map to tier 4 info
        if tier >= 4:
            assert tier_info.get("name") == "Premium", f"Expected Premium, got {tier_info.get('name')}"
            assert tier_info.get("book_limit") is None, "Premium should have unlimited books"
            assert tier_info.get("price") == 80.00, f"Expected price 80, got {tier_info.get('price')}"
        
        print(f"Tier {tier} info: {tier_info}")
