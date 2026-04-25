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
import secrets
import httpx
import base64
import json
from io import BytesIO
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "darussalam-kitab"

APPLE_VERIFY_URL = "https://buy.itunes.apple.com/verifyReceipt"
APPLE_VERIFY_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt"
APPLE_SHARED_SECRET = os.getenv("APPLE_SHARED_SECRET")

APPLE_PRODUCT_IDS = {
    "kitabcloud.basic": 1,
    "kitabcloud.standard": 2,
    "kitabcloud.advanced": 3,
    "kitabcloud.premium": 4,
}

APPLE_BUNDLE_ID = os.environ.get('APPLE_BUNDLE_ID', 'host.emergent.kitabcloud')
APPLE_KEY_ID = os.environ.get('APPLE_KEY_ID', '')
APPLE_ISSUER_ID = os.environ.get('APPLE_ISSUER_ID', '')
APPLE_PRIVATE_KEY = os.environ.get('APPLE_PRIVATE_KEY', '')
APPLE_ENVIRONMENT = os.environ.get('APPLE_ENVIRONMENT', 'sandbox')

storage_key = None

SUBSCRIPTION_TIERS = {
    0: {"name": "Pay Per Book", "price": 0, "book_limit": 0},
    1: {"name": "Basic", "price": 20.00, "book_limit": 10},
    2: {"name": "Standard", "price": 40.00, "book_limit": 20},
    3: {"name": "Advanced", "price": 60.00, "book_limit": 30},
    4: {"name": "Premium", "price": 80.00, "book_limit": None},
}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    is_volume: bool = False
    is_advanced: bool = False
    description: Optional[str] = None
    original_price: Optional[float] = None
    pdf_price: Optional[float] = None
    purchase_link: Optional[str] = None

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

class ApplePaymentVerify(BaseModel):
    receipt: dict

class AppleTransactionValidation(BaseModel):
    transaction_id: str
    original_transaction_id: str
    product_id: str
    signed_data: Optional[str] = None

class AppleSubscriptionResponse(BaseModel):
    success: bool
    subscription_tier: Optional[int] = None
    expiration_date: Optional[str] = None
    message: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

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

@api_router.get("/")
async def root():
    return {"message": "Darussalam Kitab Cloud API"}

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

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        return {"message": "If an account with that email exists, a reset link has been sent."}

    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.password_resets.delete_many({"user_id": user["user_id"]})
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": request.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "If an account with that email exists, a reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    reset_record = await db.password_resets.find_one({"token": request.token})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": request.token})
        raise HTTPException(status_code=400, detail="Reset link has expired")

    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_resets.delete_one({"token": request.token})

    return {"message": "Password has been reset successfully"}

@api_router.get("/auth/session")
async def get_session(request: Request, session_id: str = Query(...)):
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
        if picture and user.get("picture") != picture:
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": picture}})
            user["picture"] = picture

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    jwt_token = create_jwt_token(user_id)

    return {
        "user": UserResponse(**user).model_dump(),
        "token": jwt_token,
        "set_cookie": True
    }

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
async def get_all_books_preview(search: Optional[str] = None):
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

    cover_path = None
    try:
        import fitz
        pdf_doc = fitz.open(stream=data, filetype="pdf")
        if pdf_doc.page_count > 0:
            page = pdf_doc[0]
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            thumb_path = f"{APP_NAME}/covers/{book_id}.png"
            thumb_result = put_object(thumb_path, img_data, "image/png")
            cover_path = thumb_result["path"]
            logger.info(f"Generated thumbnail for book {book_id}")
        pdf_doc.close()
    except Exception as e:
        logger.warning(f"Failed to generate thumbnail: {e}")

    update_data = {"pdf_url": result["path"]}
    if cover_path:
        update_data["cover_url"] = cover_path

    await db.books.update_one({"book_id": book_id}, {"$set": update_data})
    return {"pdf_url": result["path"], "cover_url": cover_path}

@api_router.get("/covers/{path:path}")
async def get_cover_image(path: str):
    try:
        full_path = f"darussalam-kitab/covers/{path}"
        data, content_type = get_object(full_path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"Cover fetch error: {e}")
        raise HTTPException(status_code=404, detail="Cover not found")

@api_router.get("/files/{path:path}")
async def get_file(path: str, user: dict = Depends(get_current_user)):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"File fetch error: {e}")
        raise HTTPException(status_code=404, detail="File not found")

@api_router.get("/bookshelf")
async def get_bookshelf(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    bookshelf = await db.bookshelves.find_one({"user_id": user_id, "month": current_month}, {"_id": 0})
    tier_limits = {0: 0, 1: 10, 2: 20, 3: 30, 4: None}
    limit = tier_limits.get(user_tier, 0)

    if not bookshelf:
        return {"books": [], "count": 0, "limit": limit, "month": current_month}

    book_ids = bookshelf.get("book_ids", [])
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    return {"books": books, "count": len(books), "limit": limit, "month": current_month}

@api_router.post("/bookshelf/{book_id}")
async def add_to_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)

    if user_tier == 0:
        raise HTTPException(status_code=403, detail="Subscribe to add books to your monthly reading list")

    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book.get("is_volume") and user_tier < 3:
        raise HTTPException(status_code=403, detail="Volume books require Tier 3 or higher")
    if book.get("is_advanced") and user_tier < 4:
        raise HTTPException(status_code=403, detail="Advanced books require Tier 4 (Premium)")

    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    bookshelf = await db.bookshelves.find_one({"user_id": user_id, "month": current_month})
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

@api_router.post("/reading-progress/{book_id}")
async def save_reading_progress(book_id: str, page: int, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    await db.reading_progress.update_one(
        {"user_id": user_id, "book_id": book_id},
        {
            "$set": {"page": page, "updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    return {"message": "Progress saved", "page": page}

@api_router.get("/reading-progress/{book_id}")
async def get_reading_progress(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    progress = await db.reading_progress.find_one({"user_id": user_id, "book_id": book_id}, {"_id": 0})
    return {"page": progress.get("page", 1) if progress else 1}

@api_router.get("/continue-reading")
async def get_continue_reading(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    progress_list = await db.reading_progress.find({"user_id": user_id}).sort("updated_at", -1).limit(5).to_list(5)
    if not progress_list:
        return {"books": []}
    book_ids = [p["book_id"] for p in progress_list]
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(10)
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
    book = await db.books.find_one({"book_id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    await db.favorites.update_one({"user_id": user_id}, {"$addToSet": {"book_ids": book_id}}, upsert=True)
    return {"message": "Added to favorites"}

@api_router.delete("/favorites/{book_id}")
async def remove_from_favorites(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    await db.favorites.update_one({"user_id": user_id}, {"$pull": {"book_ids": book_id}})
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

@api_router.post("/purchase-pdf/{book_id}")
async def purchase_pdf(book_id: str, request: Request, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if not book.get("pdf_price"):
        raise HTTPException(status_code=400, detail="This book is not available for individual purchase")

    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    success_url = f"https://kitab-cloud.emergent.host/#/book/{book_id}?purchased=true"
    cancel_url = f"https://kitab-cloud.emergent.host/#/book/{book_id}"
    checkout_request = CheckoutSessionRequest(
        amount=float(book["pdf_price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["user_id"], "book_id": book_id, "type": "pdf_purchase"}
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
        metadata={"user_id": user["user_id"], "tier": str(tier), "tier_name": tier_info["name"]}
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)
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
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if transaction and transaction.get("payment_status") != "paid":
        new_status = status.payment_status
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": new_status}})
        if new_status == "paid":
            tier = int(status.metadata.get("tier", 0))
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"subscription_tier": tier}})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total,
        "metadata": status.metadata
    }

@api_router.post("/payments/apple")
async def verify_apple_payment(data: ApplePaymentVerify, user: dict = Depends(get_current_user)):
    receipt = data.receipt
    if not receipt:
        raise HTTPException(status_code=400, detail="Missing receipt")

    payload = {"receipt-data": receipt.get("receipt"), "password": APPLE_SHARED_SECRET}
    response = requests.post(APPLE_VERIFY_URL, json=payload)
    result = response.json()

    if result.get("status") == 21007:
        response = requests.post(APPLE_VERIFY_SANDBOX, json=payload)
        result = response.json()

    if result.get("status") != 0:
        raise HTTPException(status_code=400, detail=f"Invalid receipt: {result}")

    latest = result.get("latest_receipt_info", [])
    if not latest:
        raise HTTPException(status_code=400, detail="No purchases found")

    product_id = latest[-1]["product_id"]
    tier = APPLE_PRODUCT_IDS.get(product_id, 0)
    if tier == 0:
        raise HTTPException(status_code=400, detail="Unknown product ID")

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"subscription_tier": tier}})
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "product_id": product_id,
        "tier": tier,
        "payment_status": "paid",
        "platform": "apple",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "tier": tier}

@api_router.post("/payments/apple/validate", response_model=AppleSubscriptionResponse)
async def validate_apple_purchase(transaction: AppleTransactionValidation, user: dict = Depends(get_current_user)):
    try:
        product_id = transaction.product_id
        if product_id not in APPLE_PRODUCT_IDS:
            raise HTTPException(status_code=400, detail=f"Unknown product ID: {product_id}")

        tier = APPLE_PRODUCT_IDS[product_id]
        expiration_date = datetime.now(timezone.utc) + timedelta(days=30)

        subscription_record = {
            "subscription_id": f"apple_sub_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "platform": "apple",
            "product_id": product_id,
            "transaction_id": transaction.transaction_id,
            "original_transaction_id": transaction.original_transaction_id,
            "tier": tier,
            "status": "active",
            "purchase_date": datetime.now(timezone.utc).isoformat(),
            "expiration_date": expiration_date.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.apple_subscriptions.update_one(
            {"original_transaction_id": transaction.original_transaction_id},
            {"$set": subscription_record},
            upsert=True
        )
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_tier": tier, "subscription_platform": "apple", "subscription_expiry": expiration_date.isoformat()}}
        )

        return AppleSubscriptionResponse(
            success=True,
            subscription_tier=tier,
            expiration_date=expiration_date.isoformat(),
            message="Subscription activated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/apple/restore")
async def restore_apple_purchases(transactions: List[AppleTransactionValidation], user: dict = Depends(get_current_user)):
    restored = []
    highest_tier = 0
    latest_expiry = None

    for transaction in transactions:
        try:
            product_id = transaction.product_id
            if product_id in APPLE_PRODUCT_IDS:
                tier = APPLE_PRODUCT_IDS[product_id]
                existing = await db.apple_subscriptions.find_one(
                    {"original_transaction_id": transaction.original_transaction_id}, {"_id": 0}
                )
                if existing and existing.get("status") == "active":
                    expiry = existing.get("expiration_date")
                    if expiry:
                        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                        if expiry_dt > datetime.now(timezone.utc):
                            if tier > highest_tier:
                                highest_tier = tier
                                latest_expiry = expiry
                            restored.append({"product_id": product_id, "tier": tier, "expiration_date": expiry})
        except Exception as e:
            logger.warning(f"Error restoring transaction: {e}")

    if highest_tier > 0:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_tier": highest_tier, "subscription_platform": "apple", "subscription_expiry": latest_expiry}}
        )

    return {"restored_count": len(restored), "subscriptions": restored, "current_tier": highest_tier}

@api_router.get("/payments/apple/status")
async def get_apple_subscription_status_endpoint(user: dict = Depends(get_current_user)):
    subscription = await db.apple_subscriptions.find_one({"user_id": user["user_id"], "status": "active"}, {"_id": 0})
    if not subscription:
        return {"has_subscription": False, "tier": 0, "message": "No active Apple subscription"}

    expiry = subscription.get("expiration_date")
    if expiry:
        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        if expiry_dt < datetime.now(timezone.utc):
            await db.apple_subscriptions.update_one(
                {"subscription_id": subscription["subscription_id"]},
                {"$set": {"status": "expired"}}
            )
            return {"has_subscription": False, "tier": 0, "message": "Subscription has expired"}

    return {
        "has_subscription": True,
        "tier": subscription.get("tier", 0),
        "product_id": subscription.get("product_id"),
        "expiration_date": subscription.get("expiration_date"),
        "platform": "apple"
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
            await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid"}})
            if user_id and tier:
                await db.users.update_one({"user_id": user_id}, {"$set": {"subscription_tier": tier}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

@api_router.post("/webhook/apple")
async def apple_webhook(request: Request):
    try:
        body = await request.json()
        signed_payload = body.get("signedPayload")
        if not signed_payload:
            return {"status": "ok"}
        try:
            parts = signed_payload.split('.')
            if len(parts) == 3:
                payload_b64 = parts[1]
                padding = 4 - (len(payload_b64) % 4)
                if padding != 4:
                    payload_b64 += '=' * padding
                payload_json = base64.urlsafe_b64decode(payload_b64)
                notification_data = json.loads(payload_json)
                notification_type = notification_data.get("notificationType")
                logger.info(f"Apple notification received: {notification_type}")
                if notification_type == "EXPIRED":
                    original_transaction_id = notification_data.get("data", {}).get("originalTransactionId")
                    if original_transaction_id:
                        await db.apple_subscriptions.update_one(
                            {"original_transaction_id": original_transaction_id},
                            {"$set": {"status": "expired"}}
                        )
                elif notification_type == "REFUND":
                    original_transaction_id = notification_data.get("data", {}).get("originalTransactionId")
                    if original_transaction_id:
                        await db.apple_subscriptions.update_one(
                            {"original_transaction_id": original_transaction_id},
                            {"$set": {"status": "refunded"}}
                        )
        except Exception as decode_error:
            logger.warning(f"Error decoding Apple webhook payload: {decode_error}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Apple webhook error: {e}")
        return {"status": "error"}

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return users

@api_router.put("/admin/users/{user_id}/tier")
async def update_user_tier(user_id: str, tier: int, admin: dict = Depends(get_admin_user)):
    if tier < 0 or tier > 5:
        raise HTTPException(status_code=400, detail="Invalid tier")
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"subscription_tier": tier}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Tier updated"}

@api_router.put("/admin/users/{user_id}/admin")
async def toggle_admin(user_id: str, is_admin: bool, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"is_admin": is_admin}})
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
    purchases = []
    cursor = db.pdf_purchases.find({}, {"_id": 0}).sort("purchased_at", -1)
    async for purchase in cursor:
        user_data = await db.users.find_one({"user_id": purchase.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
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
    subscriptions = []
    cursor = db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).sort("created_at", -1)
    async for payment in cursor:
        user_data = await db.users.find_one({"user_id": payment.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        subscriptions.append({
            **payment,
            "user_email": user_data.get("email") if user_data else "Unknown",
            "user_name": user_data.get("name") if user_data else "Unknown"
        })
    return subscriptions

@api_router.get("/admin/users/{user_id}/details")
async def get_user_details(user_id: str, admin: dict = Depends(get_admin_user)):
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    favorite_ids = user_data.get("favorite_books", [])
    favorites = []
    for book_id in favorite_ids:
        book = await db.books.find_one({"book_id": book_id}, {"_id": 0, "book_id": 1, "title": 1})
        if book:
            favorites.append(book)

    bookshelf_ids = user_data.get("bookshelf", [])
    bookshelf = []
    for book_id in bookshelf_ids:
        book = await db.books.find_one({"book_id": book_id}, {"_id": 0, "book_id": 1, "title": 1})
        if book:
            bookshelf.append(book)

    purchases = []
    cursor = db.pdf_purchases.find({"user_id": user_id}, {"_id": 0})
    async for purchase in cursor:
        book = await db.books.find_one({"book_id": purchase.get("book_id")}, {"_id": 0, "title": 1})
        purchases.append({**purchase, "book_title": book.get("title") if book else "Unknown"})

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

@api_router.get("/tiers")
async def get_tiers():
    return SUBSCRIPTION_TIERS

@api_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    full_user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not full_user_data:
        raise HTTPException(status_code=404, detail="User not found")

    has_password = bool(full_user_data.get("password_hash"))
    user_data = {k: v for k, v in full_user_data.items() if k != "password_hash"}
    tier = user_data.get("subscription_tier", 0)
    tier_key = min(tier, 4) if tier > 0 else 0
    tier_info = SUBSCRIPTION_TIERS.get(tier_key, SUBSCRIPTION_TIERS[0])

    latest_payment = await db.payment_transactions.find_one(
        {"user_id": user["user_id"], "payment_status": "paid"},
        sort=[("created_at", -1)]
    )

    subscription_start = None
    subscription_end = None
    if latest_payment and tier > 0:
        subscription_start = latest_payment.get("created_at")
        if subscription_start:
            start_dt = datetime.fromisoformat(subscription_start.replace('Z', '+00:00'))
            end_dt = start_dt + timedelta(days=30)
            subscription_end = end_dt.isoformat()

    cancellation = await db.subscription_cancellations.find_one({"user_id": user["user_id"], "status": "pending"})

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
    update_data = {}
    if profile.name:
        update_data["name"] = profile.name
    if profile.email and profile.email != user.get("email"):
        existing = await db.users.find_one({"email": profile.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = profile.email
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    return {"message": "Profile updated successfully"}

@api_router.put("/user/password")
async def change_password(passwords: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    if not user_data.get("password_hash"):
        raise HTTPException(status_code=400, detail="Cannot change password for social login accounts")
    if not bcrypt.checkpw(passwords.current_password.encode('utf-8'), user_data["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = bcrypt.hashpw(passwords.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}

@api_router.post("/user/cancel-subscription")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    tier = user_data.get("subscription_tier", 0)
    if tier == 0:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")
    existing = await db.subscription_cancellations.find_one({"user_id": user["user_id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Subscription cancellation already pending")
    latest_payment = await db.payment_transactions.find_one(
        {"user_id": user["user_id"], "payment_status": "paid"},
        sort=[("created_at", -1)]
    )
    if latest_payment and latest_payment.get("created_at"):
        start_dt = datetime.fromisoformat(latest_payment["created_at"].replace('Z', '+00:00'))
        effective_date = (start_dt + timedelta(days=30)).isoformat()
    else:
        effective_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    cancellation_id = f"cancel_{uuid.uuid4().hex[:12]}"
    await db.subscription_cancellations.insert_one({
        "cancellation_id": cancellation_id,
        "user_id": user["user_id"],
        "previous_tier": tier,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "effective_date": effective_date
    })
    return {"message": "Subscription will be cancelled at end of billing period", "effective_date": effective_date}

@api_router.post("/user/reactivate-subscription")
async def reactivate_subscription(user: dict = Depends(get_current_user)):
    result = await db.subscription_cancellations.delete_one({"user_id": user["user_id"], "status": "pending"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="No pending cancellation found")
    return {"message": "Subscription reactivated"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://kitab-cloud.emergent.host",
        "http://localhost:3000",
        "capacitor://localhost",
        "https://localhost",
        "http://localhost",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed on startup: {e}")

    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.books.create_index("book_id", unique=True)
    await db.books.create_index("darussalam_code")
    await db.user_sessions.create_index("session_token")
    logger.info("Darussalam Kitab Cloud API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()