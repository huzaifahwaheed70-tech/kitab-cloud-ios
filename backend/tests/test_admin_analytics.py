"""Backend tests for Admin Reading Analytics endpoint (P1 feature)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitab-cloud.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# --- /api/admin/reading-stats endpoint ---
class TestAdminReadingStats:
    def test_reading_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", timeout=30)
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_reading_stats_admin_success(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        assert r.status_code == 200, f"Got {r.status_code} - {r.text}"
        data = r.json()

        # Response structure checks
        assert "overview" in data
        assert "activity" in data
        assert "popular_books" in data
        assert "daily_reading" in data
        assert "top_streaks" in data
        assert "reading_by_category" in data

    def test_reading_stats_overview_fields(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        overview = r.json()["overview"]
        for key in [
            "total_reading_sessions",
            "total_pages_read",
            "total_reading_minutes",
            "total_reading_hours",
            "unique_readers_all_time",
        ]:
            assert key in overview, f"Missing overview key: {key}"
            assert isinstance(overview[key], (int, float)), f"{key} not numeric"

    def test_reading_stats_activity_fields(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        activity = r.json()["activity"]
        for key in ["readers_today", "readers_this_week", "readers_this_month"]:
            assert key in activity, f"Missing activity key: {key}"
            assert isinstance(activity[key], int)
            assert activity[key] >= 0

    def test_reading_stats_lists_are_arrays(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        data = r.json()
        assert isinstance(data["popular_books"], list)
        assert isinstance(data["daily_reading"], list)
        assert isinstance(data["top_streaks"], list)
        assert isinstance(data["reading_by_category"], list)

    def test_reading_stats_popular_book_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        pop = r.json()["popular_books"]
        # If any popular books exist, verify shape
        for pb in pop:
            for key in ["book_id", "title", "sessions", "pages_read"]:
                assert key in pb, f"popular_books item missing: {key}"

    def test_reading_stats_top_streak_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        streaks = r.json()["top_streaks"]
        for s in streaks:
            for key in ["user_id", "name", "current_streak", "longest_streak"]:
                assert key in s, f"top_streaks item missing: {key}"

    def test_reading_stats_daily_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        daily = r.json()["daily_reading"]
        for d in daily:
            for key in ["date", "sessions", "pages", "readers"]:
                assert key in d, f"daily_reading item missing: {key}"

    def test_no_mongo_objectid_leak(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reading-stats", headers=admin_headers, timeout=60)
        text = r.text
        # Ensure raw ObjectId not leaked and _id field absent
        assert '"_id"' not in text, "MongoDB _id field leaked in response"
