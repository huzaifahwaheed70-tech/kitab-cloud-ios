"""
Iteration 10 tests for Google account link/unlink endpoints and welcome features.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()

ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestGoogleLinkEndpoint:
    """/api/auth/google/link - link Google account to existing user"""

    def test_link_requires_auth(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "test_invalid_session"},
            timeout=30,
        )
        assert r.status_code in (401, 403), f"Expected 401/403 without auth, got {r.status_code}"

    def test_link_invalid_session_id(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "definitely_invalid_session_id_xyz"},
            headers=auth_headers,
            timeout=30,
        )
        # Should be 401 because upstream Emergent Auth rejects invalid session
        assert r.status_code == 401, f"Expected 401 for invalid session_id, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "session" in data["detail"].lower()

    def test_link_missing_session_id(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/auth/google/link",
            json={},
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 422, f"Expected 422 for missing session_id, got {r.status_code}"


class TestGoogleUnlinkEndpoint:
    """/api/auth/google/unlink - unlink Google account"""

    def test_unlink_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/auth/google/unlink", timeout=30)
        assert r.status_code in (401, 403), f"Expected 401/403 without auth, got {r.status_code}"

    def test_unlink_when_not_linked(self, auth_headers):
        """Admin should not have google_linked, so should return 400."""
        # First ensure google_linked is not set (skip if it is)
        me = requests.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=30,
        )
        assert me.status_code == 200
        if me.json().get("google_linked"):
            pytest.skip("Admin has google_linked=True; cannot test 'not linked' case without cleanup")

        r = requests.post(
            f"{BASE_URL}/api/auth/google/unlink",
            headers=auth_headers,
            timeout=30,
        )
        # Should return 400 with "No Google account linked"
        assert r.status_code == 400, f"Expected 400 for unlinked user, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data
        assert "google" in data["detail"].lower() or "linked" in data["detail"].lower()


class TestUserProfileGoogleLinked:
    """/api/user/profile must return google_linked field"""

    def test_profile_returns_google_linked(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": auth_headers["Authorization"]},
            timeout=30,
        )
        assert r.status_code == 200, f"Profile failed: {r.status_code} {r.text}"
        data = r.json()
        assert "google_linked" in data, f"Response missing 'google_linked' field. Keys: {list(data.keys())}"
        assert isinstance(data["google_linked"], bool)
        # Also verify has_password field for Settings page logic
        assert "has_password" in data, "Response missing 'has_password' field"
        assert isinstance(data["has_password"], bool)


class TestExistingAuthFlows:
    """Verify existing auth flows still work after new endpoints were added"""

    def test_email_password_login_still_works(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] is True

    def test_google_session_endpoint_still_works(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/google/session",
            json={"session_id": "test_invalid_xyz"},
            timeout=30,
        )
        assert r.status_code == 401

    def test_guest_login(self):
        r = requests.post(f"{BASE_URL}/api/auth/guest", timeout=30)
        assert r.status_code in (200, 201)
        data = r.json()
        assert "token" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
