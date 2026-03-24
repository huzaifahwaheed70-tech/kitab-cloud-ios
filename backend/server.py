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
    1: {"name": "Basic", "price": 25.00, "book_limit": 15},
    2: {"name": "Standard", "price": 35.00, "book_limit": 35},
    3: {"name": "Advanced", "price": 50.00, "book_limit": 60},
    4: {"name": "Premium", "price": 60.00, "book_limit": 75},
    5: {"name": "Unlimited", "price": 75.00, "book_limit": None},
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
    tier_level: int = Field(ge=1, le=5)
    description: Optional[str] = None
    price: Optional[float] = None

class BookResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    book_id: str
    title: str
    darussalam_code: str
    tier_level: int
    description: Optional[str] = None
    cover_url: Optional[str] = None
    pdf_url: Optional[str] = None
    price: Optional[float] = None
    created_at: str

class ScanRequestCreate(BaseModel):
    book_title: Optional[str] = None
    darussalam_code: Optional[str] = None
    notes: Optional[str] = None

class ScanRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    user_id: str
    user_email: str
    book_title: Optional[str] = None
    darussalam_code: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: str

class PaymentCreate(BaseModel):
    tier: int = Field(ge=1, le=5)
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
        except:
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


@api_router.post("/books/{book_id}/upload-cover")
async def upload_cover(book_id: str, file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    book = await db.books.find_one({"book_id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/covers/{book_id}.{ext}"
    data = await file.read()
    
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    await db.books.update_one(
        {"book_id": book_id},
        {"$set": {"cover_url": result["path"]}}
    )
    
    return {"cover_url": result["path"]}


@api_router.post("/books/{book_id}/upload-pdf")
async def upload_pdf(book_id: str, file: UploadFile = File(...), user: dict = Depends(get_admin_user)):
    book = await db.books.find_one({"book_id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    path = f"{APP_NAME}/pdfs/{book_id}.pdf"
    data = await file.read()
    
    result = put_object(path, data, "application/pdf")
    
    await db.books.update_one(
        {"book_id": book_id},
        {"$set": {"pdf_url": result["path"]}}
    )
    
    return {"pdf_url": result["path"]}


@api_router.get("/files/{path:path}")
async def get_file(path: str, user: dict = Depends(get_current_user)):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"File fetch error: {e}")
        raise HTTPException(status_code=404, detail="File not found")


# Bookshelf Routes
@api_router.get("/bookshelf")
async def get_bookshelf(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    bookshelf = await db.bookshelves.find_one({"user_id": user_id}, {"_id": 0})
    
    if not bookshelf:
        return {"books": [], "count": 0, "limit": 15 if user.get("subscription_tier", 0) == 1 else None}
    
    # Get full book details
    book_ids = bookshelf.get("book_ids", [])
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    
    limit = 15 if user.get("subscription_tier", 0) == 1 else None
    return {"books": books, "count": len(books), "limit": limit}


@api_router.post("/bookshelf/{book_id}")
async def add_to_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    
    # Check book exists and user has access
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book["tier_level"] > user_tier:
        raise HTTPException(status_code=403, detail="You don't have access to this book")
    
    bookshelf = await db.bookshelves.find_one({"user_id": user_id})
    
    if not bookshelf:
        await db.bookshelves.insert_one({
            "user_id": user_id,
            "book_ids": [book_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        book_ids = bookshelf.get("book_ids", [])
        
        if book_id in book_ids:
            raise HTTPException(status_code=400, detail="Book already in bookshelf")
        
        # Check tier limits: Tier 1=15, Tier 2=35, Tier 3=60, Tier 4=75, Tier 5=unlimited
        tier_limits = {1: 15, 2: 35, 3: 60, 4: 75, 5: None}
        limit = tier_limits.get(user_tier)
        if limit and len(book_ids) >= limit:
            raise HTTPException(status_code=400, detail=f"Bookshelf limit reached ({limit} books). Upgrade to add more.")
        
        await db.bookshelves.update_one(
            {"user_id": user_id},
            {"$push": {"book_ids": book_id}}
        )
    
    return {"message": "Book added to bookshelf"}


@api_router.delete("/bookshelf/{book_id}")
async def remove_from_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    result = await db.bookshelves.update_one(
        {"user_id": user_id},
        {"$pull": {"book_ids": book_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Book not in bookshelf")
    
    return {"message": "Book removed from bookshelf"}


# Scan Requests Routes
@api_router.post("/scan-requests", response_model=ScanRequestResponse)
async def create_scan_request(req: ScanRequestCreate, user: dict = Depends(get_current_user)):
    if not req.book_title and not req.darussalam_code:
        raise HTTPException(status_code=400, detail="Please provide book title or code")
    
    request_id = f"scan_{uuid.uuid4().hex[:12]}"
    request_doc = {
        "request_id": request_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "book_title": req.book_title,
        "darussalam_code": req.darussalam_code,
        "notes": req.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.scan_requests.insert_one(request_doc)
    return ScanRequestResponse(**request_doc)


@api_router.get("/scan-requests")
async def get_my_scan_requests(user: dict = Depends(get_current_user)):
    requests = await db.scan_requests.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests


@api_router.get("/admin/scan-requests")
async def get_all_scan_requests(user: dict = Depends(get_admin_user)):
    requests = await db.scan_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests


@api_router.put("/admin/scan-requests/{request_id}")
async def update_scan_request(request_id: str, status: str, user: dict = Depends(get_admin_user)):
    result = await db.scan_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Status updated"}


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
    pending_scans = await db.scan_requests.count_documents({"status": "pending"})
    
    tier_stats = {}
    for tier in range(0, 6):
        count = await db.users.count_documents({"subscription_tier": tier})
        tier_stats[str(tier)] = count
    
    return {
        "total_users": total_users,
        "total_books": total_books,
        "pending_scans": pending_scans,
        "tier_distribution": tier_stats
    }


# Tiers info endpoint (public)
@api_router.get("/tiers")
async def get_tiers():
    return SUBSCRIPTION_TIERS


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
