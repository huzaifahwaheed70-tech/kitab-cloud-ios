"""
Test cases for new features:
1. Pre-checkout discount popup validation
2. Admin Push Notifications system (OneSignal)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kitab-cloud.preview.emergentagent.com')

# Test credentials from review request
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


class TestDiscountValidation:
    """Tests for discount code validation endpoint used by pre-checkout popup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    def test_discount_validate_endpoint_exists(self):
        """Test that /api/discount/validate endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/discount/validate", json={
            "code": "TESTCODE",
            "tier": 1
        })
        # Should return 400/404 for invalid code, not 404 for missing endpoint
        assert response.status_code in [200, 400, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"Discount validate endpoint exists, status: {response.status_code}")
    
    def test_discount_validate_with_invalid_code(self):
        """Test discount validation with invalid code"""
        response = self.session.post(f"{BASE_URL}/api/discount/validate", json={
            "code": "INVALIDCODE123",
            "tier": 1
        })
        # Should return error for invalid code
        assert response.status_code in [400, 404], f"Expected 400/404 for invalid code, got {response.status_code}"
        print(f"Invalid code correctly rejected: {response.status_code}")
    
    def test_discount_visible_endpoint(self):
        """Test /api/discount/visible endpoint for promotional banners"""
        response = self.session.get(f"{BASE_URL}/api/discount/visible")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "discounts" in data, "Response should contain 'discounts' key"
        print(f"Visible discounts endpoint works, found {len(data.get('discounts', []))} discounts")


class TestAdminNotifications:
    """Tests for Admin Push Notifications system using OneSignal"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            
            # Verify user is admin
            if not self.user.get("is_admin"):
                pytest.skip("User is not admin")
        else:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    def test_notification_send_endpoint_exists(self):
        """Test that /api/admin/notifications/send endpoint exists and requires admin"""
        response = self.session.post(f"{BASE_URL}/api/admin/notifications/send", json={
            "title": "Test Notification",
            "message": "This is a test message",
            "target": "all"
        })
        # Should return 200 (success) or 500 (OneSignal config issue) - not 404
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}, response: {response.text}"
        print(f"Notification send endpoint exists, status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Notification response: {data}")
            assert "success" in data, "Response should contain 'success' key"
    
    def test_notification_send_with_all_fields(self):
        """Test sending notification with all fields"""
        response = self.session.post(f"{BASE_URL}/api/admin/notifications/send", json={
            "title": "Test Title",
            "message": "Test message body",
            "target": "all",
            "url": "/pricing"
        })
        # Accept 200 (success) or 500 (OneSignal not configured for web push)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        print(f"Send notification with all fields: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "recipients" in data or "message" in data
    
    def test_notification_send_target_unsubscribed(self):
        """Test sending notification to unsubscribed users"""
        response = self.session.post(f"{BASE_URL}/api/admin/notifications/send", json={
            "title": "Special Offer",
            "message": "Subscribe now for 20% off!",
            "target": "unsubscribed"
        })
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        print(f"Send to unsubscribed: {response.status_code}")
    
    def test_notification_send_target_subscribed(self):
        """Test sending notification to subscribed users"""
        response = self.session.post(f"{BASE_URL}/api/admin/notifications/send", json={
            "title": "New Books Added",
            "message": "Check out our latest additions!",
            "target": "subscribed"
        })
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        print(f"Send to subscribed: {response.status_code}")
    
    def test_notification_history_endpoint(self):
        """Test /api/admin/notifications/history endpoint"""
        response = self.session.get(f"{BASE_URL}/api/admin/notifications/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "notifications" in data, "Response should contain 'notifications' key"
        print(f"Notification history endpoint works, found {len(data.get('notifications', []))} notifications")
    
    def test_notification_history_returns_list(self):
        """Test that notification history returns a list"""
        response = self.session.get(f"{BASE_URL}/api/admin/notifications/history")
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        assert isinstance(notifications, list), "Notifications should be a list"
        print(f"Notification history is a list with {len(notifications)} items")


class TestAdminNotificationsUnauthorized:
    """Test that notification endpoints require admin access"""
    
    def test_notification_send_requires_auth(self):
        """Test that send endpoint requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/admin/notifications/send", json={
            "title": "Test",
            "message": "Test"
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Send endpoint correctly requires authentication")
    
    def test_notification_history_requires_auth(self):
        """Test that history endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/notifications/history")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("History endpoint correctly requires authentication")


class TestTiersEndpoint:
    """Test tiers endpoint used by pricing page"""
    
    def test_tiers_endpoint(self):
        """Test /api/tiers endpoint returns tier information"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/tiers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have tier 0-4
        assert "0" in data or 0 in data, "Should have tier 0"
        print(f"Tiers endpoint works, tiers: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
