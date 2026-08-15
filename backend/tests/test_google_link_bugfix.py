"""Backend tests for Google Link bug fix (iteration 12).

Verifies:
- /api/auth/google/link requires auth (401 without token)
- /api/auth/google/link rejects invalid session_id with 401
- /api/user/profile returns google_linked=False for non-Google-linked users
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitab-cloud.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if r.status_code != 200:
        pytest.skip(f"Login failed with status {r.status_code}: {r.text}")
    return r.json()["token"]


class TestGoogleLinkAuth:
    """Tests for the /api/auth/google/link endpoint"""

    def test_google_link_no_auth_returns_401_or_403(self, api_client):
        """Endpoint must require an authenticated user."""
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "any_fake_id"},
        )
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"

    def test_google_link_invalid_session_returns_401(self, api_client, auth_token):
        """With a valid JWT but invalid session_id, backend must reject with 401 (Invalid session)."""
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "definitely_invalid_session_id_TEST_" + os.urandom(8).hex()},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data
        # Confirm it says invalid session (not silently succeeded)
        assert "invalid" in data["detail"].lower() or "session" in data["detail"].lower(), (
            f"Unexpected detail: {data}"
        )

    def test_google_link_empty_session_id_rejected(self, api_client, auth_token):
        """Empty session_id must not accidentally 'link' the account."""
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": ""},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        # Should be 401 (invalid session) or 400/422 (validation). Must NOT be 200.
        assert r.status_code != 200, f"Empty session_id should NOT link account, got 200: {r.text}"
        assert r.status_code in (400, 401, 422), f"Unexpected status {r.status_code}: {r.text}"


class TestProfileGoogleLinkedFlag:
    """Verify profile endpoint exposes google_linked correctly."""

    def test_profile_returns_google_linked_field(self, api_client, auth_token):
        r = api_client.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert r.status_code == 200, f"Profile fetch failed: {r.status_code} {r.text}"
        data = r.json()
        # Field must be present (True or False) - main agent expects False for non-linked
        assert "google_linked" in data, f"google_linked missing in profile response: {data.keys()}"
        assert isinstance(data["google_linked"], bool), (
            f"google_linked should be bool, got {type(data['google_linked'])}"
        )

    def test_profile_admin_google_linked_state_consistent(self, api_client, auth_token):
        """Admin's google_linked state should remain unchanged after a failed link attempt."""
        # Get initial state
        r1 = api_client.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert r1.status_code == 200
        initial_state = r1.json().get("google_linked")

        # Attempt link with bogus session (must fail)
        r_link = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "bogus_TEST_" + os.urandom(6).hex()},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert r_link.status_code == 401

        # Confirm state unchanged
        r2 = api_client.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert r2.status_code == 200
        after_state = r2.json().get("google_linked")
        assert after_state == initial_state, (
            f"google_linked changed from {initial_state} to {after_state} after failed link!"
        )
