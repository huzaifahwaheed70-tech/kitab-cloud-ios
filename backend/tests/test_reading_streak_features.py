"""
Backend tests for Reading Streak endpoints (multi-goal support).
Tests: /api/reading-streak, /api/reading-stats, /api/reading-streak/goal (PUT for
       goal_days / goal_pages / goal_minutes), /api/reading-session.
Also checks response contains pages_today / minutes_today fields.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitab-cloud.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Reading Streak GET ----------
class TestReadingStreakGet:
    def test_get_reading_streak_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Required fields including new multi-goal + today fields
        required = [
            "current_streak", "longest_streak", "total_reading_days",
            "reading_goal_days", "reading_goal_pages", "reading_goal_minutes",
            "goal_progress", "pages_today", "minutes_today"
        ]
        for k in required:
            assert k in data, f"missing field {k} in response: {data}"
        assert isinstance(data["reading_goal_pages"], int)
        assert isinstance(data["reading_goal_minutes"], int)
        assert isinstance(data["pages_today"], int)
        assert isinstance(data["minutes_today"], int)

    def test_get_reading_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reading-stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ["total_books_read", "total_pages_read", "total_reading_time_minutes",
                  "books_by_month", "reading_history"]:
            assert k in data
        assert isinstance(data["reading_history"], list)

    def test_streak_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/reading-streak", timeout=30)
        assert r.status_code == 401


# ---------- Multi-goal PUT ----------
class TestUpdateGoals:
    def test_update_days_goal(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=5",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reading_goal_days") == 5 or body.get("goal_days") == 5
        # Verify persisted
        s = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        assert s["reading_goal_days"] == 5
        # Restore
        requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=7", headers=auth_headers, timeout=30)

    def test_update_pages_goal(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_pages=50",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        s = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        assert s["reading_goal_pages"] == 50
        # Restore
        requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_pages=20", headers=auth_headers, timeout=30)

    def test_update_minutes_goal(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_minutes=60",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        s = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        assert s["reading_goal_minutes"] == 60
        # Restore
        requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_minutes=30", headers=auth_headers, timeout=30)

    def test_update_multiple_goals_at_once(self, auth_headers):
        r = requests.put(
            f"{BASE_URL}/api/reading-streak/goal?goal_days=4&goal_pages=25&goal_minutes=45",
            headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        s = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        assert s["reading_goal_days"] == 4
        assert s["reading_goal_pages"] == 25
        assert s["reading_goal_minutes"] == 45
        # Restore defaults
        requests.put(
            f"{BASE_URL}/api/reading-streak/goal?goal_days=7&goal_pages=20&goal_minutes=30",
            headers=auth_headers, timeout=30)

    def test_days_out_of_range(self, auth_headers):
        for bad in [0, 8, -1]:
            r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days={bad}",
                             headers=auth_headers, timeout=30)
            assert r.status_code == 400, f"expected 400 for goal_days={bad}"

    def test_pages_out_of_range(self, auth_headers):
        for bad in [0, 501]:
            r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_pages={bad}",
                             headers=auth_headers, timeout=30)
            assert r.status_code == 400, f"expected 400 for goal_pages={bad}"

    def test_minutes_out_of_range(self, auth_headers):
        for bad in [4, 481]:
            r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_minutes={bad}",
                             headers=auth_headers, timeout=30)
            assert r.status_code == 400, f"expected 400 for goal_minutes={bad}"

    def test_no_params_returns_400(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 400


# ---------- Session logs update pages_today / minutes_today ----------
class TestReadingSessionAffectsToday:
    def test_session_updates_today_counters(self, auth_headers):
        books = requests.get(f"{BASE_URL}/api/books/all", timeout=30).json()
        assert len(books) > 0
        book_id = books[0]["book_id"]

        before = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        pages_before = before["pages_today"]
        minutes_before = before["minutes_today"]

        payload = {"book_id": book_id, "pages_read": 3, "reading_time_minutes": 5, "current_page": 1}
        r = requests.post(f"{BASE_URL}/api/reading-session",
                          json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text

        after = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30).json()
        assert after["pages_today"] >= pages_before + 3
        assert after["minutes_today"] >= minutes_before + 5
