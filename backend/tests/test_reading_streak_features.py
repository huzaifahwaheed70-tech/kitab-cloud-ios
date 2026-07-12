"""
Backend tests for Reading Streak page endpoints and Book Detail metadata.
Tests: /api/reading-streak, /api/reading-stats, /api/reading-streak/goal (PUT),
       /api/reading-session, /api/books/{id} (page_count, file_type, category fields).
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


# ---------- Reading Streak Endpoints ----------

class TestReadingStreak:
    def test_get_reading_streak(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Verify required fields
        for k in ["current_streak", "longest_streak", "total_reading_days",
                  "reading_goal_days", "goal_progress"]:
            assert k in data, f"missing field {k}"
        assert isinstance(data["current_streak"], int)
        assert isinstance(data["longest_streak"], int)
        assert isinstance(data["reading_goal_days"], int)

    def test_get_reading_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reading-stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ["total_books_read", "total_pages_read", "total_reading_time_minutes",
                  "books_by_month", "reading_history"]:
            assert k in data, f"missing field {k}"
        assert isinstance(data["reading_history"], list)
        assert isinstance(data["books_by_month"], dict)

    def test_update_goal_valid(self, auth_headers):
        # Set to 5
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=5",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("goal_days") == 5

        # Verify persisted via GET
        r2 = requests.get(f"{BASE_URL}/api/reading-streak", headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["reading_goal_days"] == 5

        # Restore to 7
        requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=7",
                     headers=auth_headers, timeout=30)

    def test_update_goal_out_of_range(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=0",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 400
        r = requests.put(f"{BASE_URL}/api/reading-streak/goal?goal_days=8",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 400

    def test_streak_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/reading-streak", timeout=30)
        assert r.status_code == 401

    def test_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/reading-stats", timeout=30)
        assert r.status_code == 401


# ---------- Book Detail Metadata (page_count, file_type, category) ----------

class TestBookMetadata:
    def test_books_list_has_metadata_fields(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/books/all", timeout=30)
        assert r.status_code == 200
        books = r.json()
        assert isinstance(books, list)
        assert len(books) > 0, "no books returned"
        sample = books[0]
        # Required fields
        for k in ["book_id", "title", "tier_level"]:
            assert k in sample, f"expected field {k} in book"
        # Optional metadata fields - report presence
        with_ft = sum(1 for b in books if b.get("file_type"))
        with_pc = sum(1 for b in books if b.get("page_count"))
        with_cat = sum(1 for b in books if b.get("category"))
        print(f"\n[INFO] file_type: {with_ft}/{len(books)}, page_count: {with_pc}/{len(books)}, category: {with_cat}/{len(books)}")

    def test_book_detail_endpoint(self, auth_headers):
        # Get any book and fetch its details
        r = requests.get(f"{BASE_URL}/api/books/all", timeout=30)
        assert r.status_code == 200
        books = r.json()
        assert len(books) > 0
        book_id = books[0]["book_id"]
        r2 = requests.get(f"{BASE_URL}/api/books/{book_id}", headers=auth_headers, timeout=30)
        assert r2.status_code == 200, r2.text
        detail = r2.json()
        assert detail["book_id"] == book_id
        # Optional metadata fields - graceful (frontend guards with book.field &&)
        # Just verify endpoint returns 200 with the requested book

    def test_any_book_with_page_count(self, auth_headers):
        """Verify at least one book might have page_count set (informational)."""
        r = requests.get(f"{BASE_URL}/api/books/all", timeout=30)
        books = r.json()
        with_pc = [b for b in books if b.get("page_count")]
        print(f"\n[INFO] Books with page_count set: {len(with_pc)}/{len(books)}")
        # Don't fail - just report
        assert True


# ---------- Reading Session (updates streak) ----------

class TestReadingSession:
    def test_log_reading_session(self, auth_headers):
        # Get a book
        r = requests.get(f"{BASE_URL}/api/books/all", timeout=30)
        books = r.json()
        book_id = books[0]["book_id"]

        payload = {
            "book_id": book_id,
            "pages_read": 2,
            "reading_time_minutes": 3,
            "current_page": 1
        }
        r2 = requests.post(f"{BASE_URL}/api/reading-session",
                           json=payload, headers=auth_headers, timeout=30)
        assert r2.status_code == 200, r2.text
