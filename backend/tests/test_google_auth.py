"""Tests for Google OAuth session endpoint and existing auth flows."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()

ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestGoogleAuthEndpoint:
    """Google Auth Session Exchange endpoint"""

    def test_google_session_endpoint_exists_invalid_session(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/session",
            json={"session_id": "test_invalid_session_id"},
        )
        # Should return 401 Invalid session (endpoint reachable)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "session" in data["detail"].lower()

    def test_google_session_missing_session_id(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/google/session", json={})
        # 422 pydantic validation error
        assert r.status_code == 422

    def test_google_session_empty_session_id(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/session",
            json={"session_id": ""},
        )
        # Empty string still triggers upstream check -> 401
        assert r.status_code in (400, 401)


class TestEmailPasswordLogin:
    """Existing email/password login flow"""

    def test_admin_login_success(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert isinstance(data["token"], str) and len(data["token"]) > 20

    def test_admin_login_invalid_password(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"},
        )
        assert r.status_code == 401

    def test_auth_me_with_valid_token(self, api_client):
        # Get token
        login = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert login.status_code == 200
        token = login.json()["token"]

        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200, f"/auth/me failed: {r.status_code} {r.text}"
        user = r.json()
        assert user["email"] == ADMIN_EMAIL

    def test_auth_me_without_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)


class TestGuestLogin:
    """Guest login flow"""

    def test_guest_login(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/guest")
        # Guest endpoint might be /api/auth/guest or return token similarly
        assert r.status_code in (200, 201), f"Guest login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data
