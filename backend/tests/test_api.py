"""
Backend API Tests for Dar-Us-Salam Kitab Cloud
Tests: Auth, Books, Bookshelf, Favorites, Reading Progress, Tiers
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kitab-cloud.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "huzaifahwaheed70@gmail.com"
TEST_PASSWORD = "admin123"

class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_tiers_endpoint(self):
        """Test public tiers endpoint"""
        response = requests.get(f"{BASE_URL}/api/tiers")
        assert response.status_code == 200
        data = response.json()
        # Should have 5 tiers (0-4)
        assert "0" in data or 0 in data
        assert "4" in data or 4 in data
        print(f"Tiers: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["is_admin"] == True
        print(f"Login successful for user: {data['user']['name']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_auth_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"Auth/me returned user: {data['name']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("Unauthenticated request correctly rejected")


class TestBooks:
    """Book-related endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_all_books_preview(self):
        """Test public books preview endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/books/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} books in preview")
        if len(data) > 0:
            book = data[0]
            assert "book_id" in book
            assert "title" in book
            print(f"Sample book: {book.get('title')}")
    
    def test_get_books_authenticated(self, auth_token):
        """Test authenticated books endpoint"""
        response = requests.get(f"{BASE_URL}/api/books", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} books for authenticated user")
    
    def test_search_books(self):
        """Test book search functionality"""
        response = requests.get(f"{BASE_URL}/api/books/all?search=test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Search returned {len(data)} results")


class TestAdminEndpoints:
    """Admin-specific endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_books" in data
        assert "tier_distribution" in data
        print(f"Admin stats: {data['total_users']} users, {data['total_books']} books")
    
    def test_admin_users(self, admin_token):
        """Test admin users endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users")
    
    def test_create_book(self, admin_token):
        """Test book creation (admin only)"""
        unique_code = f"TEST_{uuid.uuid4().hex[:6].upper()}"
        book_data = {
            "title": f"Test Book {unique_code}",
            "darussalam_code": unique_code,
            "tier_level": 1,
            "is_volume": False,
            "is_advanced": False,
            "description": "Test book description",
            "original_price": 29.99,
            "pdf_price": 9.99
        }
        
        response = requests.post(f"{BASE_URL}/api/books", json=book_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Create book failed: {response.text}"
        data = response.json()
        assert data["title"] == book_data["title"]
        assert data["darussalam_code"] == unique_code
        assert data["is_volume"] == False
        assert data["is_advanced"] == False
        assert data["original_price"] == 29.99
        assert data["pdf_price"] == 9.99
        print(f"Created book: {data['book_id']}")
        
        # Cleanup - delete the test book
        delete_response = requests.delete(f"{BASE_URL}/api/books/{data['book_id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert delete_response.status_code == 200
        print(f"Deleted test book: {data['book_id']}")


class TestBookshelfAndFavorites:
    """Bookshelf and favorites endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_bookshelf(self, auth_token):
        """Test get bookshelf endpoint"""
        response = requests.get(f"{BASE_URL}/api/bookshelf", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "books" in data
        assert "count" in data
        assert "limit" in data
        assert "month" in data
        print(f"Bookshelf: {data['count']} books, limit: {data['limit']}")
    
    def test_get_favorites(self, auth_token):
        """Test get favorites endpoint"""
        response = requests.get(f"{BASE_URL}/api/favorites", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "books" in data
        print(f"Favorites: {len(data['books'])} books")
    
    def test_continue_reading(self, auth_token):
        """Test continue reading endpoint"""
        response = requests.get(f"{BASE_URL}/api/continue-reading", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "books" in data
        print(f"Continue reading: {len(data['books'])} books")


class TestCoverImages:
    """Test cover image endpoint (public, no auth)"""
    
    def test_covers_endpoint_exists(self):
        """Test that covers endpoint exists (even if no covers yet)"""
        # This should return 404 for non-existent cover, not 401
        response = requests.get(f"{BASE_URL}/api/covers/nonexistent.png")
        # Should be 404 (not found) not 401 (unauthorized)
        assert response.status_code == 404
        print("Covers endpoint is public (returns 404 for missing, not 401)")


class TestPayments:
    """Payment-related endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    def test_create_checkout_session(self, auth_token):
        """Test creating a checkout session"""
        response = requests.post(f"{BASE_URL}/api/payments/create-checkout", json={
            "tier": 1,
            "origin_url": "https://kitab-cloud.preview.emergentagent.com"
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        # Should succeed and return checkout URL
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        print(f"Checkout session created: {data['session_id'][:20]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
