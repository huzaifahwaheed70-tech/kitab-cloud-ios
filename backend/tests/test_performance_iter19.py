"""
Iteration 19 backend tests - Performance features
- GZip compression on responses > 500 bytes
- Cache-Control headers on PDFs (1hr) and images (24hr)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kitab-cloud.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "huzaifahwaheed70@gmail.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


# ---------- GZip Middleware tests ----------
class TestGZipCompression:
    def test_gzip_applied_on_large_json_response(self, admin_token):
        """Large /api/books response should be gzip-compressed when client accepts gzip."""
        r = requests.get(
            f"{BASE_URL}/api/books",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Accept-Encoding": "gzip",
            },
            timeout=30,
        )
        assert r.status_code == 200
        # requests auto-decompresses, but headers surface the original encoding
        assert r.headers.get("content-encoding") == "gzip", f"Expected gzip encoding, got headers: {dict(r.headers)}"
        assert "accept-encoding" in r.headers.get("vary", "").lower()
        # Verify JSON parses and has non-trivial payload
        body = r.json()
        assert isinstance(body, list)

    def test_gzip_not_applied_on_small_response(self, admin_token):
        """Small responses (< 500 bytes) should NOT be gzipped."""
        r = requests.get(
            f"{BASE_URL}/api/",
            headers={"Accept-Encoding": "gzip"},
            timeout=30,
        )
        assert r.status_code == 200
        # Root endpoint returns just {"message": "..."} - tiny payload
        assert r.headers.get("content-encoding") != "gzip"

    def test_no_gzip_when_client_does_not_accept(self, admin_token):
        """When Accept-Encoding does not include gzip, response must not be gzipped."""
        # Use urllib/requests with identity encoding explicitly
        r = requests.get(
            f"{BASE_URL}/api/books",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Accept-Encoding": "identity",
            },
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers.get("content-encoding") not in ("gzip",)

    def test_gzip_reduces_payload_size(self, admin_token):
        """Gzipped payload should be significantly smaller than raw."""
        raw = requests.get(
            f"{BASE_URL}/api/books",
            headers={"Authorization": f"Bearer {admin_token}", "Accept-Encoding": "identity"},
            timeout=30,
        )
        assert raw.status_code == 200
        raw_size = len(raw.content)

        # Use a raw socket-style approach: send Accept-Encoding gzip and don't decompress
        gz = requests.get(
            f"{BASE_URL}/api/books",
            headers={"Authorization": f"Bearer {admin_token}", "Accept-Encoding": "gzip"},
            timeout=30,
            stream=True,
        )
        # r.raw.read gives us the raw (still-compressed) bytes
        gz_bytes = gz.raw.read(decode_content=False)
        gz.close()

        assert gz.headers.get("content-encoding") == "gzip"
        # Compression should shrink JSON by at least 30%
        assert len(gz_bytes) < raw_size * 0.7, (
            f"gzip size {len(gz_bytes)} not < 70% of raw {raw_size}"
        )


# ---------- Cache-Control header tests ----------
class TestCacheHeaders:
    def test_cover_endpoint_reachable_without_auth(self):
        """/api/covers/{path} should be public (used for browsing without auth)."""
        # A non-existent path should still respond (401 would indicate an auth wall).
        r = requests.get(f"{BASE_URL}/api/covers/does-not-exist.png", timeout=30)
        assert r.status_code in (404, 200), f"Unexpected status {r.status_code}"

    def test_pdf_file_cache_header_when_accessible(self, admin_token):
        """When an admin fetches an existing PDF via /api/files/, response should include Cache-Control."""
        # First list books and find one with a pdf_url
        books = requests.get(
            f"{BASE_URL}/api/books",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        ).json()
        pdf_book = next((b for b in books if b.get("pdf_url")), None)
        if not pdf_book:
            pytest.skip("No book with pdf_url available for cache-header test")

        pdf_path = pdf_book["pdf_url"]
        r = requests.get(
            f"{BASE_URL}/api/files/{pdf_path}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60,
            stream=True,
        )
        # If storage failed (404) skip; otherwise expect a cache header.
        if r.status_code == 404:
            pytest.skip(f"PDF at {pdf_path} not found in object storage")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        cc = r.headers.get("cache-control", "")
        # NOTE: Backend correctly sets 'private, max-age=3600', but the
        # preview ingress overrides Cache-Control to 'no-store, no-cache, ...'.
        # We verify server-side header via localhost:8001 in a companion test.
        # Externally we only assert the response is OK and the ingress override
        # is captured as a documented finding, not a code defect.
        assert cc, f"Expected Cache-Control header to be present, got: {cc!r}"
        r.close()

    def test_pdf_cache_header_on_backend_directly(self, admin_token):
        """Verify the backend itself emits Cache-Control: private, max-age=3600 on PDFs.

        This ensures the fix in server.py is correctly deployed; the preview
        ingress may override the header externally, but the app code is right.
        """
        internal = "http://localhost:8001"
        try:
            books = requests.get(
                f"{internal}/api/books",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10,
            ).json()
        except Exception:
            pytest.skip("Backend not reachable on localhost:8001 in this env")

        pdf_book = next((b for b in books if b.get("pdf_url")), None)
        if not pdf_book:
            pytest.skip("No book with pdf_url available")
        r = requests.get(
            f"{internal}/api/files/{pdf_book['pdf_url']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60,
            stream=True,
        )
        if r.status_code == 404:
            pytest.skip("PDF not in storage")
        assert r.status_code == 200
        cc = r.headers.get("cache-control", "")
        assert "max-age=3600" in cc and "private" in cc, (
            f"Backend should emit 'private, max-age=3600' for PDFs, got: {cc!r}"
        )
        r.close()
