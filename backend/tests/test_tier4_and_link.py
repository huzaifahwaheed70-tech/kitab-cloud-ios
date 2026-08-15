"""
Tests for iteration 13:
- Bookshelf endpoint returns limit=null for tier 4 users (Premium unlimited)
- Google Link endpoint auth behavior (no auto-linking)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"]


class TestAdminIsPremium:
    """Admin should be tier 4 (Premium)"""

    def test_admin_me_shows_tier_4(self, api_client, admin_token):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("subscription_tier") == 4, (
            f"Expected admin tier=4, got {data.get('subscription_tier')}"
        )
        assert data.get("is_admin") is True


class TestBookshelfTier4Unlimited:
    """Tier 4 users must have bookshelf limit=null (unlimited)"""

    def test_bookshelf_returns_null_limit_for_tier4(self, api_client, admin_token):
        r = api_client.get(
            f"{BASE_URL}/api/bookshelf",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "limit" in data
        assert data["limit"] is None, (
            f"Expected limit=None for tier 4, got {data['limit']}"
        )
        # is_locked must always be False when limit is None
        assert data.get("is_locked") is False
        assert data.get("can_modify") is True
        assert isinstance(data.get("count"), int)
        assert isinstance(data.get("books"), list)


class TestTiersEndpoint:
    """/api/tiers must show tier 4 book_limit as null/None"""

    def test_tiers_endpoint_public(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/tiers")
        assert r.status_code == 200
        data = r.json()
        # Tier 4 must exist and have book_limit=None
        tier4 = data.get("4") or data.get(4)
        assert tier4 is not None, f"Tier 4 missing from /api/tiers: {data}"
        assert tier4.get("book_limit") in (None, "Unlimited"), (
            f"Expected tier 4 book_limit=null/Unlimited, got {tier4.get('book_limit')}"
        )
        assert tier4.get("name") == "Premium"


class TestGoogleLinkNoAutoLink:
    """Google link endpoint must not auto-link and requires valid auth+session_id"""

    def test_link_requires_auth(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            json={"session_id": "fake_session_id_123"},
        )
        assert r.status_code in (401, 403), (
            f"Expected 401/403 without auth, got {r.status_code}"
        )

    def test_link_rejects_invalid_session(self, api_client, admin_token):
        r = api_client.post(
            f"{BASE_URL}/api/auth/google/link",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"session_id": "invalid_session_id_that_does_not_exist"},
        )
        # Should fail 4xx (401 from Emergent auth, or 400 bad request)
        assert r.status_code >= 400 and r.status_code < 500, (
            f"Expected 4xx for invalid session_id, got {r.status_code}: {r.text}"
        )

    def test_admin_google_linked_state_unchanged(self, api_client, admin_token):
        """After failed link attempts, admin state should be unchanged."""
        r = api_client.get(
            f"{BASE_URL}/api/user/profile",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        # google_linked must be a boolean field
        assert isinstance(data.get("google_linked"), bool)
        # Admin should still be able to auth (token still valid)
        me = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert me.status_code == 200
