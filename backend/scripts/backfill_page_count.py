#!/usr/bin/env python3
"""
Backfill Page Count Script
Extracts page counts from existing PDF files and updates the database.
"""

import asyncio
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from io import BytesIO

try:
    from PyPDF2 import PdfReader
except ImportError:
    print("PyPDF2 not installed. Run: pip install PyPDF2")
    exit(1)

ROOT_DIR = Path(__file__).parent.parent  # Go up to backend directory
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def get_pdf_page_count(pdf_url: str) -> int:
    """Download PDF and extract page count"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.get(pdf_url)
            if response.status_code != 200:
                print(f"  Failed to download PDF: {response.status_code}")
                return 0
            
            pdf_bytes = BytesIO(response.content)
            reader = PdfReader(pdf_bytes)
            page_count = len(reader.pages)
            return page_count
    except Exception as e:
        print(f"  Error reading PDF: {e}")
        return 0


async def backfill_page_counts():
    """Find all books with PDF URLs but no page_count and update them"""
    print("=" * 60)
    print("Page Count Backfill Script")
    print("=" * 60)
    
    # Find books with PDF URL but no page_count
    query = {
        "pdf_url": {"$exists": True, "$ne": None, "$ne": ""},
        "$or": [
            {"page_count": {"$exists": False}},
            {"page_count": None},
            {"page_count": 0}
        ]
    }
    
    books_cursor = db.books.find(query, {"_id": 0, "book_id": 1, "title": 1, "pdf_url": 1})
    books = await books_cursor.to_list(100)
    
    if not books:
        print("\nNo books need page count updates!")
        
        # Show stats
        total_books = await db.books.count_documents({})
        books_with_count = await db.books.count_documents({"page_count": {"$gt": 0}})
        print(f"\nStats: {books_with_count}/{total_books} books have page counts")
        return
    
    print(f"\nFound {len(books)} books to process\n")
    
    updated = 0
    failed = 0
    
    for i, book in enumerate(books, 1):
        book_id = book.get("book_id")
        title = book.get("title", "Unknown")[:50]
        pdf_url = book.get("pdf_url")
        
        print(f"[{i}/{len(books)}] Processing: {title}")
        
        if not pdf_url:
            print(f"  Skipped - No PDF URL")
            failed += 1
            continue
        
        page_count = await get_pdf_page_count(pdf_url)
        
        if page_count > 0:
            await db.books.update_one(
                {"book_id": book_id},
                {"$set": {"page_count": page_count}}
            )
            print(f"  ✓ Updated: {page_count} pages")
            updated += 1
        else:
            print(f"  ✗ Failed to get page count")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Complete! Updated: {updated}, Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(backfill_page_counts())
