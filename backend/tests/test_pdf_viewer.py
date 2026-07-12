"""Tests for PDF viewer flow: /api/files/ auth, book access, PDF content."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kitab-cloud.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"
TEST_BOOK_ID = "book_873c49aac9ee"
TEST_PDF_PATH = f"darussalam-kitab/pdfs/{TEST_BOOK_ID}.pdf"


@pytest.fixture(scope="module")
def admin_token():
    """Login admin and get bearer token."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    }, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token, "Token missing in login response"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Auth / user tier ---
class TestAdminAuth:
    def test_admin_is_tier4(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] is True
        assert data["subscription_tier"] == 4


# --- Book resource ---
class TestBookAccess:
    def test_book_detail_returns_pdf_url(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/books/{TEST_BOOK_ID}", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        book = r.json()
        assert book["book_id"] == TEST_BOOK_ID
        assert book["pdf_url"] == TEST_PDF_PATH
        assert "_id" not in book  # mongo id must be excluded


# --- /api/files/ endpoint (PDF serving) ---
class TestPdfFileEndpoint:
    def test_pdf_returns_200_for_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/files/{TEST_PDF_PATH}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type") == "application/pdf"
        # Response body must be a real PDF (starts with %PDF)
        assert r.content[:4] == b"%PDF", f"Not a valid PDF, first bytes: {r.content[:20]}"
        # Content-length sane
        assert len(r.content) > 100

    def test_pdf_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/files/{TEST_PDF_PATH}", timeout=10)
        # Should be 401 or 403 (no auth token)
        assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}"

    def test_pdf_invalid_path_returns_404(self, admin_headers):
        # Backend GCS lookup for missing files can be slow → allow longer timeout
        r = requests.get(f"{BASE_URL}/api/files/darussalam-kitab/pdfs/does_not_exist.pdf",
                         headers=admin_headers, timeout=45)
        assert r.status_code == 404


# --- Reading progress persistence ---
class TestReadingProgress:
    def test_save_and_load_progress(self, admin_headers):
        # Save page 1
        r = requests.post(f"{BASE_URL}/api/reading-progress/{TEST_BOOK_ID}?page=1",
                          headers=admin_headers, json={}, timeout=10)
        assert r.status_code == 200
        # Load progress
        r = requests.get(f"{BASE_URL}/api/reading-progress/{TEST_BOOK_ID}",
                         headers=admin_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["page"] == 1
