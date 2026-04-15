from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Depends, Request, Response, Query, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
from io import BytesIO

# Stripe Integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Constants
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "darussalam-kitab"
storage_key = None

# Subscription Tiers
SUBSCRIPTION_TIERS = {
    0: {"name": "Pay Per Book", "price": 0, "book_limit": 0},
    1: {"name": "Basic", "price": 20.00, "book_limit": 10},
    2: {"name": "Standard", "price": 40.00, "book_limit": 20},
    3: {"name": "Advanced", "price": 60.00, "book_limit": 30},
    4: {"name": "Premium", "price": 80.00, "book_limit": None},
}

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Storage Functions
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        raise

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=120
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_tier: int = 0
    is_admin: bool = False
    created_at: str

class BookCreate(BaseModel):
    title: str
    darussalam_code: str
    tier_level: int = Field(ge=1, le=4)
    is_volume: bool = False  # Volume books only for Tier 3+
    is_advanced: bool = False  # Highly advanced books only for Tier 4
    description: Optional[str] = None
    original_price: Optional[float] = None  # Original book price
    pdf_price: Optional[float] = None  # Price to buy PDF
    purchase_link: Optional[str] = None  # Link to buy physical book from Dar-Us-Salam

class BookResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    book_id: str
    title: str
    darussalam_code: str
    tier_level: int
    is_volume: bool = False
    is_advanced: bool = False
    description: Optional[str] = None
    cover_url: Optional[str] = None
    pdf_url: Optional[str] = None
    original_price: Optional[float] = None
    pdf_price: Optional[float] = None
    purchase_link: Optional[str] = None
    created_at: str

class PaymentCreate(BaseModel):
    tier: int = Field(ge=1, le=4)
    origin_url: str


# Auth Helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request, authorization: str = Header(None)):
    # Check for session_token cookie first (Google OAuth)
    session_token = request.cookies.get("session_token")
    
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Check Authorization header (JWT)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = decode_jwt_token(token)
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except Exception:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")


async def get_admin_user(user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Darussalam Kitab Cloud API"}


# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "subscription_tier": 0,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id)
    return {"token": token, "user": UserResponse(**user_doc).model_dump()}


@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"])
    return {"token": token, "user": UserResponse(**user).model_dump()}


@api_router.get("/auth/session")
async def get_session(request: Request, session_id: str = Query(...)):
    # Fetch user data from Emergent Auth
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=30
        )
        resp.raise_for_status()
        auth_data = resp.json()
    except Exception as e:
        logger.error(f"Failed to fetch session data: {e}")
        raise HTTPException(status_code=401, detail="Invalid session")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "subscription_tier": 0,
            "is_admin": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update picture if changed
        if picture and user.get("picture") != picture:
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": picture}})
            user["picture"] = picture
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response_data = {"user": UserResponse(**user).model_dump()}
    response = Response(content=str(response_data).replace("'", '"'), media_type="application/json")
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return {"user": UserResponse(**user).model_dump(), "set_cookie": True}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user).model_dump()


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}


# Books Routes
@api_router.get("/books", response_model=List[BookResponse])
async def get_books(
    user: dict = Depends(get_current_user),
    search: Optional[str] = None,
    tier: Optional[int] = None
):
    user_tier = user.get("subscription_tier", 0)
    
    query = {"tier_level": {"$lte": user_tier}} if user_tier > 0 else {"tier_level": {"$lte": 0}}
    
    if search:
        query["$or"] = [
            {"darussalam_code": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}}
        ]
    if tier:
        query["tier_level"] = {"$lte": min(tier, user_tier)} if user_tier > 0 else {"$lte": 0}
    
    books = await db.books.find(query, {"_id": 0}).to_list(100)
    return books


@api_router.get("/books/all")
async def get_all_books_preview(
    search: Optional[str] = None
):
    """Get all books for preview (without auth) - shows locked state"""
    query = {}
    if search:
        query["$or"] = [
            {"darussalam_code": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}}
        ]
    
    books = await db.books.find(query, {"_id": 0, "pdf_url": 0}).to_list(100)
    return books


@api_router.get("/books/{book_id}")
async def get_book(book_id: str, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    user_tier = user.get("subscription_tier", 0)
    if book["tier_level"] > user_tier:
        raise HTTPException(status_code=403, detail="Upgrade required to access this book")
    
    return book


@api_router.post("/books", response_model=BookResponse)
async def create_book(book: BookCreate, user: dict = Depends(get_admin_user)):
    book_id = f"book_{uuid.uuid4().hex[:12]}"
    book_doc = {
        "book_id": book_id,
        **book.model_dump(),
        "cover_url": None,
        "pdf_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.books.insert_one(book_doc)
    return BookResponse(**book_doc)


@api_router.put("/books/{book_id}")
async def update_book(book_id: str, book: BookCreate, user: dict = Depends(get_admin_user)):
    result = await db.books.update_one(
        {"book_id": book_id},
        {"$set": book.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    
    updated = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    return updated


@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict = Depends(get_admin_user)):
    result = await db.books.delete_one({"book_id": book_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "Book deleted"}


@api_router.post("/books/{book_id}/upload-pdf")
async def upload_pdf(book_id: str, file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    book = await db.books.find_one({"book_id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    path = f"{APP_NAME}/pdfs/{book_id}.pdf"
    data = await file.read()
    
    result = put_object(path, data, "application/pdf")
    
    # Generate thumbnail from first page of PDF
    cover_path = None
    try:
        import fitz  # PyMuPDF
        from io import BytesIO
        
        pdf_doc = fitz.open(stream=data, filetype="pdf")
        if pdf_doc.page_count > 0:
            page = pdf_doc[0]
            # Render at 2x resolution for better quality
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Upload thumbnail
            thumb_path = f"{APP_NAME}/covers/{book_id}.png"
            thumb_result = put_object(thumb_path, img_data, "image/png")
            cover_path = thumb_result["path"]
            logger.info(f"Generated thumbnail for book {book_id}")
        pdf_doc.close()
    except Exception as e:
        logger.warning(f"Failed to generate thumbnail: {e}")
    
    # Update book with PDF URL and cover (if generated)
    update_data = {"pdf_url": result["path"]}
    if cover_path:
        update_data["cover_url"] = cover_path
    
    await db.books.update_one(
        {"book_id": book_id},
        {"$set": update_data}
    )
    
    return {"pdf_url": result["path"], "cover_url": cover_path}


# Public access for cover images (no auth required)
@api_router.get("/covers/{path:path}")
async def get_cover_image(path: str):
    """Get cover images without authentication"""
    try:
        full_path = f"darussalam-kitab/covers/{path}"
        data, content_type = get_object(full_path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"Cover fetch error: {e}")
        raise HTTPException(status_code=404, detail="Cover not found")


# Protected access for PDFs and other files (requires auth)
@api_router.get("/files/{path:path}")
async def get_file(path: str, user: dict = Depends(get_current_user)):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"File fetch error: {e}")
        raise HTTPException(status_code=404, detail="File not found")


# Bookshelf Routes - Monthly selection system
@api_router.get("/bookshelf")
async def get_bookshelf(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    
    # Get current month's bookshelf
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    bookshelf = await db.bookshelves.find_one(
        {"user_id": user_id, "month": current_month}, 
        {"_id": 0}
    )
    
    # Tier limits: 1=10, 2=20, 3=30, 4=unlimited
    tier_limits = {0: 0, 1: 10, 2: 20, 3: 30, 4: None}
    limit = tier_limits.get(user_tier, 0)
    
    if not bookshelf:
        return {"books": [], "count": 0, "limit": limit, "month": current_month}
    
    # Get full book details
    book_ids = bookshelf.get("book_ids", [])
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    
    return {"books": books, "count": len(books), "limit": limit, "month": current_month}


@api_router.post("/bookshelf/{book_id}")
async def add_to_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    
    if user_tier == 0:
        raise HTTPException(status_code=403, detail="Subscribe to add books to your monthly reading list")
    
    # Check book exists
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check volume/advanced restrictions
    if book.get("is_volume") and user_tier < 3:
        raise HTTPException(status_code=403, detail="Volume books require Tier 3 or higher")
    if book.get("is_advanced") and user_tier < 4:
        raise HTTPException(status_code=403, detail="Advanced books require Tier 4 (Premium)")
    
    # Get current month
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    bookshelf = await db.bookshelves.find_one({"user_id": user_id, "month": current_month})
    
    # Tier limits
    tier_limits = {1: 10, 2: 20, 3: 30, 4: None}
    limit = tier_limits.get(user_tier)
    
    if not bookshelf:
        await db.bookshelves.insert_one({
            "user_id": user_id,
            "month": current_month,
            "book_ids": [book_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        book_ids = bookshelf.get("book_ids", [])
        
        if book_id in book_ids:
            raise HTTPException(status_code=400, detail="Book already in this month's reading list")
        
        if limit and len(book_ids) >= limit:
            raise HTTPException(status_code=400, detail=f"Monthly limit reached ({limit} books). Upgrade for more or wait until next month.")
        
        await db.bookshelves.update_one(
            {"user_id": user_id, "month": current_month},
            {"$push": {"book_ids": book_id}}
        )
    
    return {"message": "Book added to this month's reading list"}


@api_router.delete("/bookshelf/{book_id}")
async def remove_from_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    result = await db.bookshelves.update_one(
        {"user_id": user_id, "month": current_month},
        {"$pull": {"book_ids": book_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Book not in this month's reading list")
    
    return {"message": "Book removed from reading list"}


# Reading Progress & Favorites
@api_router.post("/reading-progress/{book_id}")
async def save_reading_progress(book_id: str, page: int, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    await db.reading_progress.update_one(
        {"user_id": user_id, "book_id": book_id},
        {
            "$set": {
                "page": page,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Progress saved", "page": page}


@api_router.get("/reading-progress/{book_id}")
async def get_reading_progress(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    progress = await db.reading_progress.find_one(
        {"user_id": user_id, "book_id": book_id},
        {"_id": 0}
    )
    
    return {"page": progress.get("page", 1) if progress else 1}


@api_router.get("/continue-reading")
async def get_continue_reading(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # Get recent reading progress
    progress_list = await db.reading_progress.find(
        {"user_id": user_id}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    if not progress_list:
        return {"books": []}
    
    book_ids = [p["book_id"] for p in progress_list]
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(10)
    
    # Add page info to books
    books_with_progress = []
    for book in books:
        progress = next((p for p in progress_list if p["book_id"] == book["book_id"]), None)
        if progress:
            book["current_page"] = progress.get("page", 1)
            books_with_progress.append(book)
    
    return {"books": books_with_progress}


@api_router.post("/favorites/{book_id}")
async def add_to_favorites(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # Check book exists
    book = await db.books.find_one({"book_id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    await db.favorites.update_one(
        {"user_id": user_id},
        {"$addToSet": {"book_ids": book_id}},
        upsert=True
    )
    
    return {"message": "Added to favorites"}


@api_router.delete("/favorites/{book_id}")
async def remove_from_favorites(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    await db.favorites.update_one(
        {"user_id": user_id},
        {"$pull": {"book_ids": book_id}}
    )
    
    return {"message": "Removed from favorites"}


@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    favorites = await db.favorites.find_one({"user_id": user_id}, {"_id": 0})
    
    if not favorites:
        return {"books": []}
    
    book_ids = favorites.get("book_ids", [])
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    
    return {"books": books}


# PDF Purchase for Tier 0 users
@api_router.post("/purchase-pdf/{book_id}")
async def purchase_pdf(book_id: str, request: Request, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.get("pdf_price"):
        raise HTTPException(status_code=400, detail="This book is not available for individual purchase")
    
    # Create Stripe checkout for single PDF
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    origin_url = request.headers.get("origin", "")
    success_url = f"{origin_url}/book/{book_id}?purchased=true"
    cancel_url = f"{origin_url}/book/{book_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(book["pdf_price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "book_id": book_id,
            "type": "pdf_purchase"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/purchased-books")
async def get_purchased_books(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    purchases = await db.pdf_purchases.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    if not purchases:
        return {"books": []}
    
    book_ids = [p["book_id"] for p in purchases]
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    
    return {"books": books}


# Payment Routes
@api_router.post("/payments/create-checkout")
async def create_checkout(payment: PaymentCreate, request: Request, user: dict = Depends(get_current_user)):
    tier = payment.tier
    if tier not in SUBSCRIPTION_TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    tier_info = SUBSCRIPTION_TIERS[tier]
    amount = tier_info["price"]
    
    success_url = f"{payment.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payment.origin_url}/pricing"
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "tier": str(tier),
            "tier_name": tier_info["name"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "amount": amount,
        "currency": "usd",
        "tier": tier,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if transaction and transaction.get("payment_status") != "paid":
        new_status = status.payment_status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": new_status}}
        )
        
        # If paid, upgrade user tier
        if new_status == "paid":
            tier = int(status.metadata.get("tier", 0))
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"subscription_tier": tier}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total,
        "metadata": status.metadata
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    stripe_signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            tier = int(webhook_response.metadata.get("tier", 0))
            user_id = webhook_response.metadata.get("user_id")
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            # Upgrade user
            if user_id and tier:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"subscription_tier": tier}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


# Admin Routes
@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users


@api_router.put("/admin/users/{user_id}/tier")
async def update_user_tier(user_id: str, tier: int, admin: dict = Depends(get_admin_user)):
    if tier < 0 or tier > 5:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_tier": tier}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Tier updated"}


@api_router.put("/admin/users/{user_id}/admin")
async def toggle_admin(user_id: str, is_admin: bool, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": is_admin}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Admin status updated"}


@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_books = await db.books.count_documents({})
    total_purchases = await db.pdf_purchases.count_documents({})
    total_subscriptions = await db.payment_transactions.count_documents({"payment_status": "paid"})
    
    tier_stats = {}
    for tier in range(0, 5):
        count = await db.users.count_documents({"subscription_tier": tier})
        tier_stats[str(tier)] = count
    
    return {
        "total_users": total_users,
        "total_books": total_books,
        "total_purchases": total_purchases,
        "total_subscriptions": total_subscriptions,
        "tier_distribution": tier_stats
    }


@api_router.get("/admin/purchases")
async def get_admin_purchases(user: dict = Depends(get_admin_user)):
    """Get all PDF purchases with user details"""
    purchases = []
    cursor = db.pdf_purchases.find({}, {"_id": 0}).sort("purchased_at", -1)
    async for purchase in cursor:
        # Get user email
        user_data = await db.users.find_one({"user_id": purchase.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        # Get book title
        book_data = await db.books.find_one({"book_id": purchase.get("book_id")}, {"_id": 0, "title": 1})
        purchases.append({
            **purchase,
            "user_email": user_data.get("email") if user_data else "Unknown",
            "user_name": user_data.get("name") if user_data else "Unknown",
            "book_title": book_data.get("title") if book_data else "Unknown"
        })
    return purchases


@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(user: dict = Depends(get_admin_user)):
    """Get all subscription payments with user details"""
    subscriptions = []
    cursor = db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).sort("created_at", -1)
    async for payment in cursor:
        # Get user email
        user_data = await db.users.find_one({"user_id": payment.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        subscriptions.append({
            **payment,
            "user_email": user_data.get("email") if user_data else "Unknown",
            "user_name": user_data.get("name") if user_data else "Unknown"
        })
    return subscriptions


@api_router.get("/admin/users/{user_id}/details")
async def get_user_details(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed user info including favorites, bookshelf, and purchases"""
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get favorite books
    favorite_ids = user_data.get("favorite_books", [])
    favorites = []
    for book_id in favorite_ids:
        book = await db.books.find_one({"book_id": book_id}, {"_id": 0, "book_id": 1, "title": 1})
        if book:
            favorites.append(book)
    
    # Get bookshelf
    bookshelf_ids = user_data.get("bookshelf", [])
    bookshelf = []
    for book_id in bookshelf_ids:
        book = await db.books.find_one({"book_id": book_id}, {"_id": 0, "book_id": 1, "title": 1})
        if book:
            bookshelf.append(book)
    
    # Get purchases
    purchases = []
    cursor = db.pdf_purchases.find({"user_id": user_id}, {"_id": 0})
    async for purchase in cursor:
        book = await db.books.find_one({"book_id": purchase.get("book_id")}, {"_id": 0, "title": 1})
        purchases.append({
            **purchase,
            "book_title": book.get("title") if book else "Unknown"
        })
    
    # Get subscription payments
    payments = []
    cursor = db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
    async for payment in cursor:
        payments.append(payment)
    
    return {
        **user_data,
        "favorites": favorites,
        "bookshelf_books": bookshelf,
        "purchases": purchases,
        "payment_history": payments
    }


# Tiers info endpoint (public)
@api_router.get("/tiers")
async def get_tiers():
    return SUBSCRIPTION_TIERS


# ============== User Settings Endpoints ==============

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get full user profile with subscription details"""
    # Get user data including password_hash to check if user has password
    full_user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not full_user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has a password (for email/password login)
    has_password = bool(full_user_data.get("password_hash"))
    
    # Remove password_hash from response
    user_data = {k: v for k, v in full_user_data.items() if k != "password_hash"}
    
    # Get subscription info
    tier = user_data.get("subscription_tier", 0)
    # Handle tiers > 4 as Premium (admin users may have tier 5+)
    tier_key = min(tier, 4) if tier > 0 else 0
    tier_info = SUBSCRIPTION_TIERS.get(tier_key, SUBSCRIPTION_TIERS[0])
    
    # Get latest payment for subscription date
    latest_payment = await db.payment_transactions.find_one(
        {"user_id": user["user_id"], "payment_status": "paid"},
        sort=[("created_at", -1)]
    )
    
    subscription_start = None
    subscription_end = None
    if latest_payment and tier > 0:
        subscription_start = latest_payment.get("created_at")
        # Calculate end date (30 days from start)
        if subscription_start:
            from datetime import datetime
            start_dt = datetime.fromisoformat(subscription_start.replace('Z', '+00:00'))
            end_dt = start_dt + timedelta(days=30)
            subscription_end = end_dt.isoformat()
    
    # Check cancellation status
    cancellation = await db.subscription_cancellations.find_one(
        {"user_id": user["user_id"], "status": "pending"}
    )
    
    return {
        **user_data,
        "has_password": has_password,
        "tier_info": tier_info,
        "subscription_start": subscription_start,
        "subscription_end": subscription_end,
        "cancellation_pending": cancellation is not None,
        "cancellation_effective_date": cancellation.get("effective_date") if cancellation else None
    }


@api_router.put("/user/profile")
async def update_user_profile(profile: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    """Update user profile (name, email)"""
    update_data = {}
    
    if profile.name:
        update_data["name"] = profile.name
    
    if profile.email and profile.email != user.get("email"):
        # Check if email is already taken
        existing = await db.users.find_one({"email": profile.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = profile.email
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}


@api_router.put("/user/password")
async def change_password(passwords: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change user password"""
    # Get full user data with password hash
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has a password (Google OAuth users may not)
    if not user_data.get("password_hash"):
        raise HTTPException(status_code=400, detail="Cannot change password for social login accounts")
    
    # Verify current password
    if not bcrypt.checkpw(passwords.current_password.encode('utf-8'), user_data["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_hash = bcrypt.hashpw(passwords.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password changed successfully"}


@api_router.post("/user/cancel-subscription")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel subscription at end of billing period"""
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier = user_data.get("subscription_tier", 0)
    if tier == 0:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    
    # Check if already pending cancellation
    existing = await db.subscription_cancellations.find_one(
        {"user_id": user["user_id"], "status": "pending"}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Subscription cancellation already pending")
    
    # Get latest payment to determine end date
    latest_payment = await db.payment_transactions.find_one(
        {"user_id": user["user_id"], "payment_status": "paid"},
        sort=[("created_at", -1)]
    )
    
    # Calculate effective date (30 days from last payment or now if no payment found)
    if latest_payment and latest_payment.get("created_at"):
        start_dt = datetime.fromisoformat(latest_payment["created_at"].replace('Z', '+00:00'))
        effective_date = (start_dt + timedelta(days=30)).isoformat()
    else:
        effective_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    # Create cancellation record
    cancellation_id = f"cancel_{uuid.uuid4().hex[:12]}"
    await db.subscription_cancellations.insert_one({
        "cancellation_id": cancellation_id,
        "user_id": user["user_id"],
        "previous_tier": tier,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "effective_date": effective_date
    })
    
    return {
        "message": "Subscription will be cancelled at end of billing period",
        "effective_date": effective_date
    }


@api_router.post("/user/reactivate-subscription")
async def reactivate_subscription(user: dict = Depends(get_current_user)):
    """Reactivate a pending cancellation"""
    result = await db.subscription_cancellations.delete_one(
        {"user_id": user["user_id"], "status": "pending"}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="No pending cancellation found")
    
    return {"message": "Subscription reactivated"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed on startup: {e}")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.books.create_index("book_id", unique=True)
    await db.books.create_index("darussalam_code")
    await db.user_sessions.create_index("session_token")
    
    logger.info("Darussalam Kitab Cloud API started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
