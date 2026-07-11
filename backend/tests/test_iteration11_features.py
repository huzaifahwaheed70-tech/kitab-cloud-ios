"""
Backend tests for iteration 11 - New features:
- Reading Streak: /api/reading-streak, /api/reading-stats, /api/reading-session, /api/reading-streak/goal
- Admin Audit Log: /api/admin/audit-logs (+ actions, stats)
- Advanced Search: /api/search/books, /api/search/categories
- Word Doc upload: /api/books/{book_id}/upload-docx (admin-only auth check)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kitab-cloud.preview.emergentagent.com").rstrip("/")
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
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ==================== READING STREAK ====================
class TestReadingStreak:
    def test_get_reading_streak_authorized(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/reading-streak", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # Expected fields
        for field in [
            "current_streak",
            "longest_streak",
            "total_reading_days",
            "reading_goal_days",
            "goal_progress",
        ]:
            assert field in data, f"Missing field {field}: {data}"
        assert isinstance(data["current_streak"], int)
        assert isinstance(data["longest_streak"], int)

    def test_get_reading_streak_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/reading-streak", timeout=15)
        assert r.status_code in (401, 403), f"{r.status_code} {r.text}"

    def test_get_reading_stats_authorized(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/reading-stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for field in [
            "total_books_read",
            "total_pages_read",
            "total_reading_time_minutes",
            "books_by_month",
            "reading_history",
        ]:
            assert field in data, f"Missing field {field}: {data}"
        assert isinstance(data["reading_history"], list)

    def test_log_reading_session_and_streak_updates(self, admin_headers):
        # Get books to find a valid book_id
        books = requests.get(f"{BASE_URL}/api/books", headers=admin_headers, timeout=15)
        assert books.status_code == 200
        book_list = books.json().get("books", []) if isinstance(books.json(), dict) else books.json()
        if not book_list:
            pytest.skip("No books available to log session")
        book_id = book_list[0].get("book_id") or book_list[0].get("id")
        assert book_id, "No book_id found in books"

        prev_streak = requests.get(f"{BASE_URL}/api/reading-streak", headers=admin_headers, timeout=15).json()

        payload = {
            "book_id": book_id,
            "pages_read": 5,
            "reading_time_minutes": 10,
            "current_page": 5,
        }
        r = requests.post(
            f"{BASE_URL}/api/reading-session",
            headers=admin_headers,
            json=payload,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert "date" in r.json()

        # Verify streak updated
        new_streak = requests.get(f"{BASE_URL}/api/reading-streak", headers=admin_headers, timeout=15).json()
        assert new_streak["current_streak"] >= 1
        assert new_streak["total_reading_days"] >= prev_streak.get("total_reading_days", 0)

    def test_update_reading_goal_valid(self, admin_headers):
        r = requests.put(
            f"{BASE_URL}/api/reading-streak/goal?goal_days=5",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["goal_days"] == 5

        # Verify persistence
        streak = requests.get(f"{BASE_URL}/api/reading-streak", headers=admin_headers, timeout=15).json()
        assert streak["reading_goal_days"] == 5

    def test_update_reading_goal_invalid(self, admin_headers):
        r = requests.put(
            f"{BASE_URL}/api/reading-streak/goal?goal_days=10",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"


# ==================== ADMIN AUDIT LOGS ====================
class TestAdminAuditLogs:
    def test_audit_logs_admin_access(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for field in ["logs", "total", "limit", "offset"]:
            assert field in data, f"Missing field {field}: {data}"
        assert isinstance(data["logs"], list)

    def test_audit_logs_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs", timeout=15)
        assert r.status_code in (401, 403)

    def test_audit_logs_with_filter(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/admin/audit-logs?limit=5&action=upload_pdf",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert len(data["logs"]) <= 5
        # Every log should have action == upload_pdf (if any)
        for log in data["logs"]:
            assert log.get("action") == "upload_pdf"

    def test_audit_logs_actions_endpoint(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs/actions", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for field in ["actions", "target_types", "admin_emails"]:
            assert field in data
            assert isinstance(data[field], list)

    def test_audit_logs_stats_endpoint(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/audit-logs/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for field in ["total_logs", "action_counts", "daily_activity"]:
            assert field in data


# ==================== ADVANCED SEARCH ====================
class TestAdvancedSearch:
    def test_search_categories(self):
        r = requests.get(f"{BASE_URL}/api/search/categories", timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)

    def test_search_books_basic(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/search/books?q=a",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        for field in ["books", "total", "query"]:
            assert field in data
        assert data["query"] == "a"
        # accessible flag added on each book
        for book in data["books"][:5]:
            assert "accessible" in book

    def test_search_books_with_filters(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/search/books?q=a&tier=1&sort_by=title",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        # All books returned should have tier_level == 1
        for book in data["books"]:
            assert book.get("tier_level") == 1

    def test_search_books_sort_title(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/search/books?q=a&sort_by=title",
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200
        titles = [b.get("title", "") for b in r.json()["books"]]
        # verify sorted ascending (case-insensitive tolerant)
        assert titles == sorted(titles, key=lambda t: (t or "").lower()) or len(titles) <= 1

    def test_search_books_missing_query(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/search/books", headers=admin_headers, timeout=15)
        # 'q' is required
        assert r.status_code == 422, f"{r.status_code} {r.text}"

    def test_search_books_unauthorized(self):
        r = requests.get(f"{BASE_URL}/api/search/books?q=test", timeout=15)
        assert r.status_code in (401, 403)


# ==================== DOCX UPLOAD (AUTH) ====================
class TestDocxUpload:
    def test_upload_docx_unauthorized(self):
        r = requests.post(
            f"{BASE_URL}/api/books/nonexistent/upload-docx",
            files={"file": ("test.docx", b"dummy", "application/octet-stream")},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"{r.status_code} {r.text}"

    def test_upload_docx_admin_invalid_book(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/books/nonexistent_book_id_xyz/upload-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test.docx", b"dummy", "application/octet-stream")},
            timeout=15,
        )
        assert r.status_code == 404, f"{r.status_code} {r.text}"

    def test_upload_docx_admin_invalid_extension(self, admin_token, admin_headers):
        # find any book_id
        books = requests.get(f"{BASE_URL}/api/books", headers=admin_headers, timeout=15).json()
        book_list = books.get("books", []) if isinstance(books, dict) else books
        if not book_list:
            pytest.skip("No books found")
        book_id = book_list[0].get("book_id") or book_list[0].get("id")

        r = requests.post(
            f"{BASE_URL}/api/books/{book_id}/upload-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test.txt", b"dummy", "text/plain")},
            timeout=15,
        )
        assert r.status_code == 400, f"{r.status_code} {r.text}"
