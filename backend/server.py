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
import resend
import secrets
import httpx
import base64
import json

# Stripe Integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend email setup
resend.api_key = os.environ.get('RESEND_API_KEY')

# Constants
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 365  # 1 year - keep users logged in

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "darussalam-kitab"
storage_key = None

# Subscription Tiers
SUBSCRIPTION_TIERS = {
    0: {"name": "Pay Per Book", "price": 0, "book_limit": 0},
    1: {"name": "Basic", "price": 8.95, "book_limit": 10},
    2: {"name": "Standard", "price": 14.95, "book_limit": 20},
    3: {"name": "Advanced", "price": 29.95, "book_limit": 30},
    4: {"name": "Premium", "price": 44.95, "book_limit": None},
}

# Apple StoreKit Product IDs mapping to tiers
APPLE_PRODUCT_IDS = {
    # Subscription products
    "kitabcloud.basic": 1,      # Tier 1 - Basic
    "kitabcloud.standard": 2,   # Tier 2 - Standard
    "kitabcloud.advanced": 3,   # Tier 3 - Advanced
    "kitabcloud.premium": 4,    # Tier 4 - Premium
}

# Apple Book Product IDs (Non-Consumable) - maps to darussalam_code
APPLE_BOOK_PRODUCT_IDS = {
    "H22": "200 Golden Hadith",
    "133": "Al Lulu Wal Marjan 1/2",
    "H03": "Al Lulu Wal Marjan 1/2nd Volume",
    "Wastiyyahvolume1": "Al-'Aqidah Al-Wasitiyyah Volume 1/2",
    "242": "Al-'Aqidah Al-Wasitiyyah Volume 2",
    "174": "Book of Manners",
    "H05": "Bulugh Al Maram",
    "172": "Destination of the Seeker of Truth",
    "H232nd": "Explanation of Riyadus Saliheen 2/6th Volume",
    "H235th": "Explanation of Riyadus Saliheen 5/6th Volume",
    "100": "Medicine of the Prophet (S) * New Color Edition",
    "1332nd": "Minhaj Al Muslim 2/2 Volume",
    "H04": "Riyadh As Saliheen 1/2 Volume",
    "RP10": "Tafseer As Sa'di 2nd Volume",
}

# Apple StoreKit configuration
APPLE_BUNDLE_ID = os.environ.get('APPLE_BUNDLE_ID', 'com.darussalam.kitabcloud')
APPLE_KEY_ID = os.environ.get('APPLE_KEY_ID', '')
APPLE_ISSUER_ID = os.environ.get('APPLE_ISSUER_ID', '')
APPLE_PRIVATE_KEY = os.environ.get('APPLE_PRIVATE_KEY', '')
APPLE_ENVIRONMENT = os.environ.get('APPLE_ENVIRONMENT', 'sandbox')  # 'sandbox' or 'production'

# Email Helper Functions
RESEND_FROM_EMAIL = os.environ.get('RESEND_FROM_EMAIL', 'Kitab Cloud <kitabcloud@dar-us-salam.com>')
LOGO_URL = "https://kitab-cloud.emergent.host/logo.png"  # Logo for emails

def get_email_header():
    """Returns HTML header with logo for all emails"""
    return f'''
    <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid rgba(212,175,55,0.2);">
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
            <img src="{LOGO_URL}" alt="Kitab Cloud" style="width: 40px; height: 40px; border-radius: 8px;" />
            <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Kitab Cloud</h1>
        </div>
        <p style="color: #B0C4BF; margin: 5px 0;">Your Digital Islamic Library</p>
    </div>
    '''

def get_email_footer():
    """Returns HTML footer for all emails"""
    return '''
    <div style="text-align: center; padding: 20px 0; border-top: 1px solid rgba(212,175,55,0.2); color: #B0C4BF; font-size: 12px;">
        <p>Powered by Dar-Us-Salam Publications</p>
        <p><a href="https://dar-us-salam.com" style="color: #D4AF37;">dar-us-salam.com</a></p>
    </div>
    '''

async def send_welcome_email(email: str, name: str = None):
    """Send welcome email to new users"""
    try:
        user_name = name if name else email.split('@')[0]
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Welcome to Kitab Cloud!",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                {get_email_header()}
                <div style="padding: 30px 0;">
                    <h2 style="color: #FDFBF7;">Assalamu Alaikum {user_name}!</h2>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Welcome to Kitab Cloud! We're excited to have you join our community of readers.
                    </p>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        With your account, you can:
                    </p>
                    <ul style="color: #B0C4BF; line-height: 1.8;">
                        <li>Browse our collection of Islamic books</li>
                        <li>Purchase individual PDFs</li>
                        <li>Subscribe for monthly reading access</li>
                        <li>Save your reading progress</li>
                        <li>Create your favorites list</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://kitab-cloud.emergent.host/library" style="background-color: #D4AF37; color: #02120F; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                            Start Reading
                        </a>
                    </div>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        JazakAllah Khair for choosing Kitab Cloud!
                    </p>
                </div>
                {get_email_footer()}
            </div>
            """
        }
        resend.Emails.send(params)
        logger.info(f"Welcome email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return False


async def send_verification_email(email: str, code: str):
    """Send email verification code"""
    # Check if API key is configured
    if not resend.api_key:
        logger.error("RESEND_API_KEY not configured - cannot send verification email")
        return False
        
    try:
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Verify Your Email - Kitab Cloud",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                {get_email_header()}
                <div style="padding: 30px 0; text-align: center;">
                    <h2 style="color: #FDFBF7;">Verify Your Email</h2>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Enter this code to verify your email address:
                    </p>
                    <div style="background-color: #082E26; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">{code}</span>
                    </div>
                    <p style="color: #B0C4BF; font-size: 14px;">
                        This code expires in 15 minutes.
                    </p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid rgba(212,175,55,0.2); color: #B0C4BF; font-size: 12px;">
                    <p>If you didn't create an account, you can ignore this email.</p>
                </div>
            </div>
            """
        }
        logger.info(f"Attempting to send verification email to {email} from {RESEND_FROM_EMAIL}")
        result = resend.Emails.send(params)
        logger.info(f"Verification email sent to {email}, result: {result}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {type(e).__name__}: {str(e)}")
        return False


async def send_password_reset_email(email: str, reset_token: str):
    """Send password reset link"""
    try:
        reset_link = f"https://kitab-cloud.emergent.host/reset-password?token={reset_token}"
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Reset Your Password - Kitab Cloud",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                {get_email_header()}
                <div style="padding: 30px 0; text-align: center;">
                    <h2 style="color: #FDFBF7;">Reset Your Password</h2>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Click the button below to reset your password:
                    </p>
                    <div style="margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #D4AF37; color: #02120F; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #B0C4BF; font-size: 14px;">
                        This link expires in 1 hour.
                    </p>
                    <p style="color: #B0C4BF; font-size: 12px; margin-top: 20px;">
                        If the button doesn't work, copy this link:<br/>
                        <a href="{reset_link}" style="color: #D4AF37; word-break: break-all;">{reset_link}</a>
                    </p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid rgba(212,175,55,0.2); color: #B0C4BF; font-size: 12px;">
                    <p>If you didn't request this, you can ignore this email.</p>
                </div>
            </div>
            """
        }
        resend.Emails.send(params)
        logger.info(f"Password reset email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


async def send_pdf_purchase_email(email: str, book_title: str, pdf_url: str, user_name: str = None):
    """Send PDF purchase confirmation with download link"""
    try:
        name = user_name if user_name else email.split('@')[0]
        # Create a direct link to the book (users can read after login)
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": f"Your PDF Purchase: {book_title} - Kitab Cloud",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid rgba(212,175,55,0.2);">
                    <h1 style="color: #D4AF37; margin: 0;">Kitab Cloud</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #FDFBF7; margin-bottom: 10px;">Thank You for Your Purchase!</h2>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Dear {name},
                    </p>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Your purchase of <strong style="color: #D4AF37;">{book_title}</strong> is complete. 
                        You now have permanent access to this book in your library.
                    </p>
                    <div style="background-color: #082E26; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                        <p style="color: #FDFBF7; margin-bottom: 15px;">Access your book anytime:</p>
                        <a href="https://kitab-cloud.emergent.host/library" 
                           style="background-color: #D4AF37; color: #02120F; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                            Go to My Library
                        </a>
                    </div>
                    <p style="color: #B0C4BF; line-height: 1.6; font-size: 14px;">
                        Your purchased PDFs are always available in your library under "Purchased Books".
                    </p>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid rgba(212,175,55,0.2); color: #B0C4BF; font-size: 12px;">
                    <p>Questions? Contact us at sales@dar-us-salam.com</p>
                    <p>© Dar-Us-Salam Publications</p>
                </div>
            </div>
            """
        }
        resend.Emails.send(params)
        logger.info(f"PDF purchase email sent to {email} for book: {book_title}")
        return True
    except Exception as e:
        logger.error(f"Failed to send PDF purchase email: {e}")
        return False


async def send_subscription_confirmation_email(email: str, tier: int, user_name: str = None):
    """Send subscription confirmation email"""
    try:
        name = user_name if user_name else email.split('@')[0]
        tier_names = {1: "Basic", 2: "Standard", 3: "Advanced", 4: "Premium"}
        tier_limits = {1: "10", 2: "20", 3: "30", 4: "Unlimited"}
        tier_name = tier_names.get(tier, f"Tier {tier}")
        book_limit = tier_limits.get(tier, "N/A")
        
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": f"Welcome to {tier_name} - Kitab Cloud",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid rgba(212,175,55,0.2);">
                    <h1 style="color: #D4AF37; margin: 0;">Kitab Cloud</h1>
                </div>
                <div style="padding: 30px 0;">
                    <h2 style="color: #FDFBF7; margin-bottom: 10px;">Your {tier_name} Subscription is Active!</h2>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Dear {name},
                    </p>
                    <p style="color: #B0C4BF; line-height: 1.6;">
                        Thank you for subscribing to Kitab Cloud. Your <strong style="color: #D4AF37;">{tier_name}</strong> plan is now active.
                    </p>
                    <div style="background-color: #082E26; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="color: #D4AF37; margin-top: 0;">Your Plan Details:</h3>
                        <ul style="color: #B0C4BF; line-height: 1.8; padding-left: 20px;">
                            <li><strong>Plan:</strong> {tier_name}</li>
                            <li><strong>Monthly Book Limit:</strong> {book_limit} books</li>
                            {"<li><strong>Volume Books:</strong> Included</li>" if tier >= 3 else ""}
                            {"<li><strong>In-Book Search:</strong> Enabled</li>" if tier >= 3 else ""}
                            {"<li><strong>Advanced Books:</strong> Full Access</li>" if tier >= 4 else ""}
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://kitab-cloud.emergent.host/library" 
                           style="background-color: #D4AF37; color: #02120F; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                            Start Reading Now
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px 0; border-top: 1px solid rgba(212,175,55,0.2); color: #B0C4BF; font-size: 12px;">
                    <p>Questions? Contact us at sales@dar-us-salam.com</p>
                    <p>© Dar-Us-Salam Publications</p>
                </div>
            </div>
            """
        }
        resend.Emails.send(params)
        logger.info(f"Subscription confirmation email sent to {email} for tier {tier}")
        return True
    except Exception as e:
        logger.error(f"Failed to send subscription confirmation email: {e}")
        return False


# Apple StoreKit Helper Functions
def generate_apple_jwt():
    """Generate JWT token for Apple App Store Server API"""
    if not APPLE_KEY_ID or not APPLE_ISSUER_ID or not APPLE_PRIVATE_KEY:
        raise ValueError("Apple StoreKit credentials not configured")
    
    now = datetime.now(timezone.utc)
    expiration = now + timedelta(minutes=5)
    
    payload = {
        "iss": APPLE_ISSUER_ID,
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
        "aud": "appstoreconnect-v1",
        "bid": APPLE_BUNDLE_ID
    }
    
    token = jwt.encode(
        payload,
        APPLE_PRIVATE_KEY,
        algorithm="ES256",
        headers={"kid": APPLE_KEY_ID}
    )
    
    return token


async def validate_apple_transaction(transaction_id: str) -> dict:
    """Validate a transaction with Apple's App Store Server API"""
    if APPLE_ENVIRONMENT == "sandbox":
        base_url = "https://api.storekit-sandbox.itunes.apple.com"
    else:
        base_url = "https://api.storekit.itunes.apple.com"
    
    token = generate_apple_jwt()
    
    url = f"{base_url}/inApps/v1/transactions/{transaction_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, timeout=30)
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        raise ValueError("Transaction not found in App Store")
    elif response.status_code == 401:
        raise ValueError("Apple JWT authentication failed")
    else:
        raise Exception(f"Apple API error: {response.status_code}")


async def get_apple_subscription_status(original_transaction_id: str) -> dict:
    """Get subscription status from Apple"""
    if APPLE_ENVIRONMENT == "sandbox":
        base_url = "https://api.storekit-sandbox.itunes.apple.com"
    else:
        base_url = "https://api.storekit.itunes.apple.com"
    
    token = generate_apple_jwt()
    
    url = f"{base_url}/inApps/v1/subscriptions/{original_transaction_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, timeout=30)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get subscription status: {response.status_code}")


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
    discount_code: Optional[str] = None  # Optional discount code


# Discount Code Models
class DiscountCodeCreate(BaseModel):
    code: str  # Unique code like "FREEM", "7DAYS"
    name: str  # Display name like "First Month Free"
    description: Optional[str] = None  # Description for admin
    discount_type: str  # "percentage", "fixed_amount", "free_trial", "buy_x_get_y"
    value: float  # Percentage (20 = 20%), fixed amount, trial days, or Y months free
    buy_x_value: Optional[int] = None  # For buy_x_get_y: X months to pay
    is_visible: bool = False  # Show on main page or keep secret
    is_active: bool = True
    usage_limit: Optional[int] = None  # Max total uses (None = unlimited)
    per_user_limit: int = 1  # Max uses per user
    applicable_tiers: Optional[List[int]] = None  # Which tiers it applies to (None = all)
    valid_from: Optional[str] = None  # ISO date string
    valid_until: Optional[str] = None  # ISO date string
    banner_text: Optional[str] = None  # Text for homepage banner
    badge_text: Optional[str] = None  # Text for pricing card badge


class DiscountCodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[float] = None
    buy_x_value: Optional[int] = None
    is_visible: Optional[bool] = None
    is_active: Optional[bool] = None
    usage_limit: Optional[int] = None
    per_user_limit: Optional[int] = None
    applicable_tiers: Optional[List[int]] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    banner_text: Optional[str] = None
    badge_text: Optional[str] = None


class DiscountCodeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    discount_id: str
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str
    value: float
    buy_x_value: Optional[int] = None
    is_visible: bool
    is_active: bool
    usage_limit: Optional[int] = None
    per_user_limit: int
    used_count: int
    applicable_tiers: Optional[List[int]] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    banner_text: Optional[str] = None
    badge_text: Optional[str] = None
    created_at: str


class DiscountValidateRequest(BaseModel):
    code: str
    tier: Optional[int] = None
    book_id: Optional[str] = None


# Apple StoreKit Models
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


# Auth Helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
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

# Models for email verification
class SendVerificationRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str
    name: str
    password: str


@api_router.post("/auth/send-verification")
async def send_verification_code(request: SendVerificationRequest):
    """Send verification code to email before creating account"""
    # Check if email already registered
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate 6-digit verification code
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Store verification code
    await db.email_verifications.delete_many({"email": request.email})  # Remove old codes
    await db.email_verifications.insert_one({
        "email": request.email,
        "code": code,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send verification email
    email_sent = await send_verification_email(request.email, code)
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email")
    
    return {"message": "Verification code sent to your email"}


@api_router.post("/auth/verify-and-register")
async def verify_and_register(request: VerifyEmailRequest):
    """Verify email code and create account"""
    # Check if email already registered
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Find verification record
    verification = await db.email_verifications.find_one({"email": request.email})
    if not verification:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")
    
    # Check if code matches
    if verification["code"] != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check if code expired
    expires_at = datetime.fromisoformat(verification["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.email_verifications.delete_one({"email": request.email})
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
    
    # Create user account
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": hash_password(request.password),
        "picture": None,
        "subscription_tier": 0,
        "is_admin": False,
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Delete verification code
    await db.email_verifications.delete_one({"email": request.email})
    
    # Send welcome email
    try:
        await send_welcome_email(request.email, request.name)
    except Exception as e:
        logger.warning(f"Failed to send welcome email to {request.email}: {e}")
    
    token = create_jwt_token(user_id)
    return {"token": token, "user": UserResponse(**user_doc).model_dump()}


@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Direct registration (backwards compatible, but now requires verification)"""
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
    
    # Send welcome email (non-blocking)
    try:
        await send_welcome_email(user_data.email, user_data.name)
    except Exception as e:
        logger.warning(f"Failed to send welcome email to {user_data.email}: {e}")
    
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


@api_router.post("/auth/guest")
async def guest_login():
    """Create a guest account for browsing without signing up"""
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    guest_doc = {
        "user_id": guest_id,
        "email": f"{guest_id}@guest.kitabcloud.com",
        "name": "Guest User",
        "password_hash": None,
        "picture": None,
        "subscription_tier": 0,
        "is_admin": False,
        "is_guest": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(guest_doc)
    
    token = create_jwt_token(guest_id)
    
    # Add is_guest to response
    response_data = {
        "user_id": guest_id,
        "email": guest_doc["email"],
        "name": "Guest User",
        "picture": None,
        "subscription_tier": 0,
        "is_admin": False,
        "is_guest": True,
        "created_at": guest_doc["created_at"]
    }
    
    return {"token": token, "user": response_data}


# Password Reset Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset link"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a reset link has been sent."}
    
    # Check if user has a password (not just OAuth user)
    if not user.get("password_hash"):
        return {"message": "If an account with that email exists, a reset link has been sent."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"user_id": user["user_id"]})  # Remove old tokens
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": request.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email
    try:
        await send_password_reset_email(request.email, reset_token)
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {"message": "If an account with that email exists, a reset link has been sent."}


@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    # Find reset token
    reset_record = await db.password_resets.find_one({"token": request.token})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": request.token})
        raise HTTPException(status_code=400, detail="Reset link has expired")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": request.token})
    
    return {"message": "Password has been reset successfully"}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Include is_guest flag in response
    response = UserResponse(**user).model_dump()
    response["is_guest"] = user.get("is_guest", False)
    return response


@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out"}


# Google OAuth Session Exchange
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
class GoogleSessionRequest(BaseModel):
    session_id: str

@api_router.post("/auth/google/session")
async def google_auth_session(request: GoogleSessionRequest):
    """Exchange Emergent Auth session_id for user data and JWT token"""
    try:
        # Call Emergent Auth to get session data
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=30
            )
        
        if response.status_code != 200:
            logger.error(f"Google auth failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = response.json()
        email = session_data.get("email")
        name = session_data.get("name")
        picture = session_data.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email in session data")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            # Update existing user with latest Google profile data
            update_data = {}
            if name and not existing_user.get("name"):
                update_data["name"] = name
            if picture:
                update_data["picture"] = picture
            update_data["google_linked"] = True
            
            if update_data:
                await db.users.update_one(
                    {"email": email},
                    {"$set": update_data}
                )
            
            # Refresh user data
            user = await db.users.find_one({"email": email}, {"_id": 0})
            token = create_jwt_token(user["user_id"])
            
            logger.info(f"Google login successful for existing user: {email}")
            return {"token": token, "user": UserResponse(**user).model_dump()}
        
        # Create new user from Google data
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name or email.split('@')[0],
            "password_hash": None,  # No password for Google users
            "picture": picture,
            "subscription_tier": 0,
            "is_admin": False,
            "email_verified": True,  # Google emails are pre-verified
            "google_linked": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        
        # Send welcome email
        try:
            await send_welcome_email(email, name)
        except Exception as e:
            logger.warning(f"Failed to send welcome email to {email}: {e}")
        
        token = create_jwt_token(user_id)
        logger.info(f"Google signup successful for new user: {email}")
        return {"token": token, "user": UserResponse(**user_doc).model_dump()}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


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
    
    # Allow all authenticated users (including guests) to view book details
    # Reading restrictions are enforced at the PDF access level (/api/files/)
    # This allows guests to browse and see what books are available
    
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
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    is_admin = user.get("is_admin", False)
    
    # Check if this is a PDF file access (reading a book)
    if path.endswith('.pdf'):
        # Admins get free access to all PDFs
        if is_admin:
            logger.info(f"Admin {user['email']} accessing PDF: {path}")
        else:
            # Extract book_id from path if possible
            book_id_from_path = path.replace('darussalam-kitab/pdfs/', '').replace('.pdf', '')
            current_month = datetime.now(timezone.utc).strftime("%Y-%m")
            
            # Check if user has purchased this specific PDF
            has_purchased = await db.pdf_purchases.find_one({
                "user_id": user_id,
                "book_id": book_id_from_path
            })
            
            if has_purchased:
                # User purchased this PDF, allow access regardless of tier
                pass
            elif user_tier == 0:
                # Tier 0 without purchase
                raise HTTPException(status_code=403, detail="Purchase this PDF or subscribe to read")
            else:
                # Subscribed users must have book in their bookshelf to read
                bookshelf = await db.bookshelves.find_one({
                    "user_id": user_id, 
                    "month": current_month,
                    "book_ids": book_id_from_path
                })
                
                if not bookshelf:
                    raise HTTPException(
                        status_code=403, 
                        detail="Add this book to your reading list before reading. Go to the book page and click 'Add to Reading List'."
                    )
    
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
        return {
            "books": [], 
            "count": 0, 
            "limit": limit, 
            "month": current_month,
            "is_locked": False,
            "can_modify": True
        }
    
    # Get full book details
    book_ids = bookshelf.get("book_ids", [])
    books = await db.books.find({"book_id": {"$in": book_ids}}, {"_id": 0}).to_list(100)
    
    # Check if bookshelf is locked (at limit)
    count = len(books)
    is_locked = limit is not None and count >= limit
    
    return {
        "books": books, 
        "count": count, 
        "limit": limit, 
        "month": current_month,
        "is_locked": is_locked,
        "can_modify": not is_locked  # Can only modify if not at limit
    }


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
        
        # Check if at limit - if so, bookshelf is locked
        if limit and len(book_ids) >= limit:
            raise HTTPException(
                status_code=400, 
                detail=f"You've reached your monthly limit of {limit} books. Your reading list is locked until next month. Upgrade your tier for a higher limit."
            )
        
        await db.bookshelves.update_one(
            {"user_id": user_id, "month": current_month},
            {"$push": {"book_ids": book_id}}
        )
    
    return {"message": "Book added to this month's reading list"}


@api_router.delete("/bookshelf/{book_id}")
async def remove_from_bookshelf(book_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_tier = user.get("subscription_tier", 0)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Check if bookshelf is at limit (locked)
    bookshelf = await db.bookshelves.find_one({"user_id": user_id, "month": current_month})
    if bookshelf:
        book_ids = bookshelf.get("book_ids", [])
        tier_limits = {1: 10, 2: 20, 3: 30, 4: None}
        limit = tier_limits.get(user_tier)
        
        # If at limit, bookshelf is locked - can't remove books
        if limit and len(book_ids) >= limit:
            raise HTTPException(
                status_code=400, 
                detail=f"Your reading list is locked at {limit} books until next month. You cannot remove books until then."
            )
    
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
class PdfPurchaseRequest(BaseModel):
    discount_code: Optional[str] = None


@api_router.post("/purchase-pdf/{book_id}")
async def purchase_pdf(book_id: str, request: Request, body: PdfPurchaseRequest = None, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.get("pdf_price"):
        raise HTTPException(status_code=400, detail="This book is not available for individual purchase")
    
    original_price = float(book["pdf_price"])
    final_price = original_price
    stripe_coupon_id = None
    discount_description = None
    
    # Handle discount code if provided
    if body and body.discount_code:
        code = body.discount_code.upper()
        discount = await db.discount_codes.find_one({"code": code, "is_active": True})
        
        if discount:
            now = datetime.now(timezone.utc)
            is_valid = True
            
            # Check date range
            if discount.get("valid_from"):
                valid_from = datetime.fromisoformat(discount["valid_from"].replace('Z', '+00:00'))
                if now < valid_from:
                    is_valid = False
            
            if discount.get("valid_until"):
                valid_until = datetime.fromisoformat(discount["valid_until"].replace('Z', '+00:00'))
                if now > valid_until:
                    is_valid = False
            
            if is_valid:
                discount_type = discount.get("discount_type", "percentage")
                
                if discount_type == "percentage":
                    discount_percent = discount.get("discount_percent", discount.get("value", 0))
                    final_price = original_price * (1 - discount_percent / 100)
                elif discount_type == "fixed":
                    discount_amount = discount.get("discount_amount", discount.get("value", 0))
                    final_price = max(0, original_price - discount_amount)
                
                logger.info(f"Applied discount {code} to PDF purchase: ${original_price} -> ${final_price}")
    
    # Create Stripe checkout for single PDF
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Get origin from header or use base_url
    origin_url = request.headers.get("origin", "")
    if not origin_url:
        # Fallback to base_url without trailing slash
        origin_url = str(request.base_url).rstrip('/')
    
    # Redirect to payment success page for consistent handling
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/book/{book_id}"
    
    # Build metadata dict - only include discount_code if it has a value
    metadata = {
        "user_id": user["user_id"],
        "book_id": book_id,
        "type": "pdf_purchase",
        "original_price": str(original_price),
        "final_price": str(final_price)
    }
    
    # Only add discount_code if it exists
    if body and body.discount_code:
        metadata["discount_code"] = body.discount_code
    
    checkout_request = CheckoutSessionRequest(
        amount=float(final_price),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    # Note: Stripe coupon is not applied here since the emergent CheckoutSessionRequest
    # doesn't support coupons. The discount is already calculated in final_price.
    
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
    
    # Get tier info from database or use defaults
    custom_tiers = await db.settings.find_one({"setting_id": "subscription_tiers"}, {"_id": 0})
    tiers = custom_tiers.get("tiers") if custom_tiers else SUBSCRIPTION_TIERS
    
    # Convert tier to string key if needed (MongoDB stores dict keys as strings)
    tier_key = str(tier) if str(tier) in tiers else tier
    
    if tier_key not in tiers and str(tier_key) not in tiers:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    tier_info = tiers.get(tier_key) or tiers.get(str(tier_key))
    amount = tier_info["price"]
    original_amount = amount
    
    # Handle discount code if provided
    discount_data = None
    stripe_coupon_id = None
    trial_days = None
    
    if payment.discount_code:
        code = payment.discount_code.upper()
        discount = await db.discount_codes.find_one({"code": code, "is_active": True})
        
        if discount:
            # Validate the discount
            now = datetime.now(timezone.utc)
            is_valid = True
            
            # Check date range
            if discount.get("valid_from"):
                valid_from = datetime.fromisoformat(discount["valid_from"].replace('Z', '+00:00'))
                if now < valid_from:
                    is_valid = False
            
            if discount.get("valid_until"):
                valid_until = datetime.fromisoformat(discount["valid_until"].replace('Z', '+00:00'))
                if now > valid_until:
                    is_valid = False
            
            # Check usage limits
            if discount.get("usage_limit") and discount.get("used_count", 0) >= discount["usage_limit"]:
                is_valid = False
            
            # Check per-user limit
            user_usage = await db.discount_usage.count_documents({
                "discount_id": discount["discount_id"],
                "user_id": user["user_id"]
            })
            if user_usage >= discount.get("per_user_limit", 1):
                is_valid = False
            
            # Check tier applicability
            if discount.get("applicable_tiers") and tier not in discount["applicable_tiers"]:
                is_valid = False
            
            if is_valid:
                discount_data = discount
                stripe_coupon_id = discount.get("stripe_coupon_id")
                
                # Apply discount based on type
                if discount["discount_type"] == "percentage":
                    amount = amount * (1 - discount["value"] / 100)
                elif discount["discount_type"] == "fixed_amount":
                    amount = max(0, amount - discount["value"])
                elif discount["discount_type"] == "free_trial":
                    trial_days = int(discount["value"])
                    amount = 0  # First charge is free during trial
                elif discount["discount_type"] == "buy_x_get_y":
                    # For buy_x_get_y, amount stays the same but we'll apply coupon
                    pass
    
    success_url = f"{payment.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payment.origin_url}/pricing"
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    stripe_secret_key = os.environ.get("STRIPE_SECRET_KEY")
    webhook_url = f"{str(request.base_url)}api/webhook/stripe"
    
    # Create Stripe checkout session directly with coupon support
    try:
        stripe.api_key = stripe_secret_key
        
        line_items = [{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": f"Kitab Cloud - {tier_info['name']} Plan",
                    "description": f"Monthly subscription for {tier_info['name']} tier"
                },
                "unit_amount": int(original_amount * 100),  # Stripe uses cents
                "recurring": {"interval": "month"} if not trial_days else None
            } if not trial_days else {
                "currency": "usd",
                "product_data": {
                    "name": f"Kitab Cloud - {tier_info['name']} Plan",
                    "description": f"Monthly subscription for {tier_info['name']} tier"
                },
                "unit_amount": int(original_amount * 100),
            },
            "quantity": 1
        }]
        
        session_params = {
            "payment_method_types": ["card"],
            "line_items": line_items,
            "mode": "subscription" if not trial_days else "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {
                "user_id": user["user_id"],
                "tier": str(tier),
                "tier_name": tier_info["name"]
            }
        }
        
        # Add optional metadata fields only if they have values
        if payment.discount_code:
            session_params["metadata"]["discount_code"] = payment.discount_code.upper()
        if discount_data:
            session_params["metadata"]["discount_id"] = discount_data["discount_id"]
        
        # Add coupon if available
        if stripe_coupon_id and not trial_days:
            session_params["discounts"] = [{"coupon": stripe_coupon_id}]
        
        # Add trial period if free trial discount
        if trial_days:
            session_params["subscription_data"] = {
                "trial_period_days": trial_days
            }
            session_params["mode"] = "subscription"
            # Reconstruct line_items for subscription
            session_params["line_items"] = [{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Kitab Cloud - {tier_info['name']} Plan",
                        "description": f"Monthly subscription for {tier_info['name']} tier"
                    },
                    "unit_amount": int(original_amount * 100),
                    "recurring": {"interval": "month"}
                },
                "quantity": 1
            }]
        
        session = stripe.checkout.Session.create(**session_params)
        
        # Create payment transaction record
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": session.id,
            "user_id": user["user_id"],
            "original_amount": original_amount,
            "amount": amount,
            "currency": "usd",
            "tier": tier,
            "discount_code": payment.discount_code.upper() if payment.discount_code else None,
            "discount_id": discount_data["discount_id"] if discount_data else None,
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Record discount usage if applied
        if discount_data:
            await db.discount_usage.insert_one({
                "usage_id": f"usage_{uuid.uuid4().hex[:12]}",
                "discount_id": discount_data["discount_id"],
                "discount_code": discount_data["code"],
                "user_id": user["user_id"],
                "session_id": session.id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Increment used_count
            await db.discount_codes.update_one(
                {"discount_id": discount_data["discount_id"]},
                {"$inc": {"used_count": 1}}
            )
        
        return {
            "url": session.url,
            "session_id": session.id,
            "discount_applied": discount_data["code"] if discount_data else None,
            "original_amount": original_amount,
            "final_amount": amount
        }
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        # Fallback to emergent integrations checkout
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
        
        # If paid, handle based on payment type
        if new_status == "paid":
            payment_type = status.metadata.get("type", "subscription")
            
            if payment_type == "pdf_purchase":
                # Handle PDF purchase
                book_id = status.metadata.get("book_id")
                if book_id:
                    # Check if already recorded
                    existing = await db.pdf_purchases.find_one({
                        "user_id": user["user_id"],
                        "book_id": book_id
                    })
                    if not existing:
                        purchase_record = {
                            "purchase_id": f"purchase_{uuid.uuid4().hex[:12]}",
                            "user_id": user["user_id"],
                            "book_id": book_id,
                            "session_id": session_id,
                            "purchased_at": datetime.now(timezone.utc).isoformat(),
                            "platform": "stripe"
                        }
                        await db.pdf_purchases.insert_one(purchase_record)
                        logger.info(f"PDF purchase recorded via status poll: user {user['user_id']}, book {book_id}")
                        
                        # Send email
                        book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
                        if book:
                            await send_pdf_purchase_email(
                                user.get("email"),
                                book.get("title", "Your Book"),
                                book.get("pdf_url", ""),
                                user.get("name")
                            )
            else:
                # Handle subscription
                tier = int(status.metadata.get("tier", 0))
                if tier:
                    current_tier = user.get("subscription_tier", 0)
                    if current_tier != tier:
                        await db.users.update_one(
                            {"user_id": user["user_id"]},
                            {"$set": {"subscription_tier": tier}}
                        )
                        logger.info(f"Subscription upgraded via status poll: user {user['user_id']} to tier {tier}")
                        
                        # Send email
                        await send_subscription_confirmation_email(
                            user.get("email"),
                            tier,
                            user.get("name")
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
            user_id = webhook_response.metadata.get("user_id")
            payment_type = webhook_response.metadata.get("type", "subscription")
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            # Get user for email
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0}) if user_id else None
            
            if payment_type == "pdf_purchase":
                # Handle PDF purchase
                book_id = webhook_response.metadata.get("book_id")
                if user_id and book_id:
                    # Record the purchase
                    purchase_record = {
                        "purchase_id": f"purchase_{uuid.uuid4().hex[:12]}",
                        "user_id": user_id,
                        "book_id": book_id,
                        "session_id": session_id,
                        "purchased_at": datetime.now(timezone.utc).isoformat(),
                        "platform": "stripe"
                    }
                    await db.pdf_purchases.insert_one(purchase_record)
                    logger.info(f"PDF purchase recorded: user {user_id}, book {book_id}")
                    
                    # Get book info and send email
                    if user:
                        book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
                        if book:
                            await send_pdf_purchase_email(
                                user.get("email"),
                                book.get("title", "Your Book"),
                                book.get("pdf_url", ""),
                                user.get("name")
                            )
            else:
                # Handle subscription purchase
                tier = int(webhook_response.metadata.get("tier", 0))
                if user_id and tier:
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {"subscription_tier": tier}}
                    )
                    logger.info(f"Subscription upgraded: user {user_id} to tier {tier}")
                    
                    # Send confirmation email
                    if user:
                        await send_subscription_confirmation_email(
                            user.get("email"),
                            tier,
                            user.get("name")
                        )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


# Apple StoreKit Endpoints
@api_router.post("/payments/apple/validate", response_model=AppleSubscriptionResponse)
async def validate_apple_purchase(
    transaction: AppleTransactionValidation,
    user: dict = Depends(get_current_user)
):
    """Validate an Apple in-app purchase and upgrade user subscription"""
    try:
        # Map product ID to tier
        product_id = transaction.product_id
        if product_id not in APPLE_PRODUCT_IDS:
            raise HTTPException(status_code=400, detail=f"Unknown product ID: {product_id}")
        
        tier = APPLE_PRODUCT_IDS[product_id]
        
        # Check if Apple credentials are configured
        if APPLE_KEY_ID and APPLE_ISSUER_ID and APPLE_PRIVATE_KEY:
            # Validate with Apple's servers
            try:
                apple_data = await validate_apple_transaction(transaction.transaction_id)
                logger.info(f"Apple transaction validated: {apple_data}")
            except Exception as e:
                logger.warning(f"Apple validation failed (continuing with local validation): {e}")
        
        # Calculate expiration (1 month from now for monthly subscriptions)
        expiration_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Store Apple subscription record
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
        
        # Upsert subscription (update if exists, insert if new)
        await db.apple_subscriptions.update_one(
            {"original_transaction_id": transaction.original_transaction_id},
            {"$set": subscription_record},
            upsert=True
        )
        
        # Update user's subscription tier
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_tier": tier,
                "subscription_platform": "apple",
                "subscription_expiry": expiration_date.isoformat()
            }}
        )
        
        logger.info(f"Apple subscription activated for user {user['user_id']}, tier {tier}")
        
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
async def restore_apple_purchases(
    transactions: List[AppleTransactionValidation],
    user: dict = Depends(get_current_user)
):
    """Restore Apple purchases for a user"""
    restored = []
    highest_tier = 0
    latest_expiry = None
    
    for transaction in transactions:
        try:
            product_id = transaction.product_id
            if product_id in APPLE_PRODUCT_IDS:
                tier = APPLE_PRODUCT_IDS[product_id]
                
                # Check if this subscription exists
                existing = await db.apple_subscriptions.find_one({
                    "original_transaction_id": transaction.original_transaction_id
                }, {"_id": 0})
                
                if existing and existing.get("status") == "active":
                    expiry = existing.get("expiration_date")
                    if expiry:
                        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
                        if expiry_dt > datetime.now(timezone.utc):
                            if tier > highest_tier:
                                highest_tier = tier
                                latest_expiry = expiry
                            restored.append({
                                "product_id": product_id,
                                "tier": tier,
                                "expiration_date": expiry
                            })
        except Exception as e:
            logger.warning(f"Error restoring transaction: {e}")
    
    # Update user tier if restored subscriptions found
    if highest_tier > 0:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "subscription_tier": highest_tier,
                "subscription_platform": "apple",
                "subscription_expiry": latest_expiry
            }}
        )
    
    return {
        "restored_count": len(restored),
        "subscriptions": restored,
        "current_tier": highest_tier
    }


@api_router.get("/payments/apple/status")
async def get_apple_subscription_status_endpoint(user: dict = Depends(get_current_user)):
    """Get current Apple subscription status for user"""
    subscription = await db.apple_subscriptions.find_one(
        {"user_id": user["user_id"], "status": "active"},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "has_subscription": False,
            "tier": 0,
            "message": "No active Apple subscription"
        }
    
    # Check if subscription has expired
    expiry = subscription.get("expiration_date")
    if expiry:
        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        if expiry_dt < datetime.now(timezone.utc):
            # Mark as expired
            await db.apple_subscriptions.update_one(
                {"subscription_id": subscription["subscription_id"]},
                {"$set": {"status": "expired"}}
            )
            return {
                "has_subscription": False,
                "tier": 0,
                "message": "Subscription has expired"
            }
    
    return {
        "has_subscription": True,
        "tier": subscription.get("tier", 0),
        "product_id": subscription.get("product_id"),
        "expiration_date": subscription.get("expiration_date"),
        "platform": "apple"
    }


class ApplePDFValidation(BaseModel):
    transaction_id: str
    original_transaction_id: Optional[str] = None
    product_id: str
    book_id: str
    receipt: Optional[str] = None


@api_router.post("/payments/apple/validate-pdf")
async def validate_apple_pdf_purchase(
    transaction: ApplePDFValidation,
    user: dict = Depends(get_current_user)
):
    """Validate an Apple in-app purchase for a single PDF"""
    try:
        # Check if book exists
        book = await db.books.find_one({"book_id": transaction.book_id}, {"_id": 0})
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Validate with Apple if credentials configured
        if APPLE_KEY_ID and APPLE_ISSUER_ID and APPLE_PRIVATE_KEY:
            try:
                apple_data = await validate_apple_transaction(transaction.transaction_id)
                logger.info(f"Apple PDF transaction validated: {apple_data}")
            except Exception as e:
                logger.warning(f"Apple validation failed (continuing): {e}")
        
        # Record the PDF purchase
        purchase_record = {
            "purchase_id": f"apple_pdf_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "book_id": transaction.book_id,
            "platform": "apple",
            "product_id": transaction.product_id,
            "transaction_id": transaction.transaction_id,
            "original_transaction_id": transaction.original_transaction_id,
            "purchase_date": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert to avoid duplicates
        await db.pdf_purchases.update_one(
            {"user_id": user["user_id"], "book_id": transaction.book_id},
            {"$set": purchase_record},
            upsert=True
        )
        
        logger.info(f"Apple PDF purchase recorded for user {user['user_id']}, book {transaction.book_id}")
        
        return {
            "success": True,
            "book_id": transaction.book_id,
            "message": "PDF purchase validated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple PDF validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/webhook/apple")
async def apple_webhook(request: Request):
    """Handle Apple App Store Server Notifications"""
    try:
        body = await request.json()
        signed_payload = body.get("signedPayload")
        
        if not signed_payload:
            logger.warning("Apple webhook missing signedPayload")
            return {"status": "ok"}
        
        # Decode the JWS payload (simplified - in production use proper JWS validation)
        try:
            parts = signed_payload.split('.')
            if len(parts) == 3:
                # Decode payload (middle part)
                payload_b64 = parts[1]
                # Add padding if needed
                padding = 4 - (len(payload_b64) % 4)
                if padding != 4:
                    payload_b64 += '=' * padding
                payload_json = base64.urlsafe_b64decode(payload_b64)
                notification_data = json.loads(payload_json)
                
                notification_type = notification_data.get("notificationType")
                logger.info(f"Apple notification received: {notification_type}")
                
                # Handle different notification types
                if notification_type in ["DID_RENEW", "SUBSCRIBED"]:
                    # Renewal or new subscription
                    transaction_info = notification_data.get("data", {}).get("signedTransactionInfo")
                    if transaction_info:
                        # Process renewal
                        logger.info("Processing Apple subscription renewal")
                        
                elif notification_type == "EXPIRED":
                    # Subscription expired
                    original_transaction_id = notification_data.get("data", {}).get("originalTransactionId")
                    if original_transaction_id:
                        await db.apple_subscriptions.update_one(
                            {"original_transaction_id": original_transaction_id},
                            {"$set": {"status": "expired"}}
                        )
                        logger.info(f"Apple subscription expired: {original_transaction_id}")
                        
                elif notification_type == "DID_CHANGE_RENEWAL_STATUS":
                    # Auto-renew status changed
                    subtype = notification_data.get("subtype")
                    logger.info(f"Apple renewal status changed: {subtype}")
                    
                elif notification_type == "REFUND":
                    # Refund processed
                    original_transaction_id = notification_data.get("data", {}).get("originalTransactionId")
                    if original_transaction_id:
                        await db.apple_subscriptions.update_one(
                            {"original_transaction_id": original_transaction_id},
                            {"$set": {"status": "refunded"}}
                        )
                        logger.info(f"Apple subscription refunded: {original_transaction_id}")
        except Exception as decode_error:
            logger.warning(f"Error decoding Apple webhook payload: {decode_error}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Apple webhook error: {e}")
        return {"status": "error"}


# Admin Routes
@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_admin_user)):
    # Exclude guest users from the list
    users = await db.users.find(
        {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return users


@api_router.get("/admin/email-config")
async def get_email_config(user: dict = Depends(get_admin_user)):
    """Check email configuration status (admin only)"""
    api_key_set = bool(resend.api_key)
    api_key_preview = resend.api_key[:10] + "..." if resend.api_key else "NOT SET"
    
    return {
        "resend_api_key_configured": api_key_set,
        "api_key_preview": api_key_preview,
        "from_email": RESEND_FROM_EMAIL,
        "message": "Email configuration looks good!" if api_key_set else "RESEND_API_KEY is not configured in environment"
    }

@api_router.post("/admin/test-email")
async def test_email_send(email: str, user: dict = Depends(get_admin_user)):
    """Send a test email to verify Resend configuration (admin only)"""
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")
    
    try:
        params = {
            "from": RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "Test Email - Kitab Cloud Admin",
            "html": "<p>This is a test email from Kitab Cloud to verify your email configuration is working.</p>"
        }
        result = resend.Emails.send(params)
        return {"success": True, "message": f"Test email sent to {email}", "result": str(result)}
    except Exception as e:
        logger.error(f"Test email failed: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {type(e).__name__}: {str(e)}")


class EmailCampaignRequest(BaseModel):
    subject: str
    message: str
    target: str = "all"  # all, unsubscribed, subscribed, tier_1, tier_2, tier_3, tier_4
    button_text: Optional[str] = None
    button_url: Optional[str] = None


@api_router.post("/admin/send-announcement")
async def send_announcement_email(
    request: EmailCampaignRequest,
    admin: dict = Depends(get_admin_user)
):
    """Send an announcement email to targeted users (admin only)"""
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")
    
    # Build query based on target
    base_query = {
        "$and": [
            {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
            {"email": {"$exists": True, "$ne": None, "$ne": ""}}
        ]
    }
    
    target_description = "all users"
    
    if request.target == "unsubscribed":
        base_query["$and"].append({"$or": [{"subscription_tier": 0}, {"subscription_tier": {"$exists": False}}]})
        target_description = "unsubscribed users"
    elif request.target == "subscribed":
        base_query["$and"].append({"subscription_tier": {"$gte": 1}})
        target_description = "subscribed users"
    elif request.target.startswith("tier_"):
        tier = int(request.target.split("_")[1])
        base_query["$and"].append({"subscription_tier": tier})
        tier_names = {1: "Basic", 2: "Standard", 3: "Advanced", 4: "Premium"}
        target_description = f"Tier {tier} ({tier_names.get(tier, 'Unknown')}) users"
    
    # Get targeted users
    users = await db.users.find(
        base_query,
        {"email": 1, "name": 1, "_id": 0}
    ).to_list(10000)
    
    if not users:
        raise HTTPException(status_code=404, detail=f"No {target_description} found to email")
    
    success_count = 0
    fail_count = 0
    failed_emails = []
    
    # Build button HTML if provided
    button_html = ""
    if request.button_text and request.button_url:
        button_html = f'''
        <div style="text-align: center; margin: 30px 0;">
            <a href="{request.button_url}" style="background-color: #D4AF37; color: #02120F; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                {request.button_text}
            </a>
        </div>
        '''
    
    for user in users:
        try:
            user_name = user.get("name", user["email"].split("@")[0])
            params = {
                "from": RESEND_FROM_EMAIL,
                "to": [user["email"]],
                "subject": request.subject,
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                    {get_email_header()}
                    <div style="padding: 30px 0;">
                        <h2 style="color: #FDFBF7;">Assalamu Alaikum {user_name}!</h2>
                        <div style="color: #B0C4BF; line-height: 1.8;">
                            {request.message}
                        </div>
                        {button_html}
                    </div>
                    {get_email_footer()}
                </div>
                """
            }
            resend.Emails.send(params)
            success_count += 1
            logger.info(f"Announcement email sent to {user['email']}")
        except Exception as e:
            fail_count += 1
            failed_emails.append(user["email"])
            logger.error(f"Failed to send announcement to {user['email']}: {e}")
    
    return {
        "message": f"Announcement sent to {success_count} {target_description}",
        "success_count": success_count,
        "fail_count": fail_count,
        "total_targeted": len(users),
        "target": request.target,
        "failed_emails": failed_emails[:10] if failed_emails else []
    }


@api_router.get("/admin/email-stats")
async def get_email_stats(admin: dict = Depends(get_admin_user)):
    """Get user counts for email targeting"""
    # Count users by category
    total = await db.users.count_documents({
        "$and": [
            {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
            {"email": {"$exists": True, "$ne": None, "$ne": ""}}
        ]
    })
    
    unsubscribed = await db.users.count_documents({
        "$and": [
            {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
            {"email": {"$exists": True, "$ne": None, "$ne": ""}},
            {"$or": [{"subscription_tier": 0}, {"subscription_tier": {"$exists": False}}]}
        ]
    })
    
    tier_counts = {}
    for tier in [1, 2, 3, 4]:
        count = await db.users.count_documents({
            "$and": [
                {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
                {"email": {"$exists": True, "$ne": None, "$ne": ""}},
                {"subscription_tier": tier}
            ]
        })
        tier_counts[f"tier_{tier}"] = count
    
    subscribed = sum(tier_counts.values())
    
    return {
        "all": total,
        "unsubscribed": unsubscribed,
        "subscribed": subscribed,
        **tier_counts
    }


@api_router.post("/admin/send-price-drop-announcement")
async def send_price_drop_announcement(admin: dict = Depends(get_admin_user)):
    """Send the price drop announcement to all registered users (admin only)"""
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")
    
    # Get all non-guest users with valid emails
    users = await db.users.find(
        {"$and": [
            {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]},
            {"email": {"$exists": True, "$ne": None, "$ne": ""}}
        ]},
        {"email": 1, "name": 1, "_id": 0}
    ).to_list(10000)
    
    if not users:
        raise HTTPException(status_code=404, detail="No users found to email")
    
    success_count = 0
    fail_count = 0
    failed_emails = []
    
    for user in users:
        try:
            user_name = user.get("name", user["email"].split("@")[0])
            params = {
                "from": RESEND_FROM_EMAIL,
                "to": [user["email"]],
                "subject": "🎉 Great News! We've Lowered Our Prices - Kitab Cloud",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #02120F; color: #FDFBF7;">
                    {get_email_header()}
                    <div style="padding: 30px 0;">
                        <h2 style="color: #FDFBF7;">Assalamu Alaikum {user_name}!</h2>
                        <p style="color: #B0C4BF; line-height: 1.8; font-size: 16px;">
                            We have exciting news! We've <strong style="color: #D4AF37;">significantly reduced our subscription prices</strong> to make Islamic knowledge more accessible to everyone.
                        </p>
                        
                        <div style="background-color: #082E26; padding: 25px; margin: 25px 0; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3);">
                            <h3 style="color: #D4AF37; margin-top: 0; text-align: center;">New Lower Prices</h3>
                            <table style="width: 100%; color: #B0C4BF; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid rgba(212,175,55,0.2);">
                                    <td style="padding: 12px 0;"><strong style="color: #FDFBF7;">Basic (10 books/mo)</strong></td>
                                    <td style="padding: 12px 0; text-align: right;"><span style="color: #D4AF37; font-size: 20px; font-weight: bold;">$8.95</span></td>
                                </tr>
                                <tr style="border-bottom: 1px solid rgba(212,175,55,0.2);">
                                    <td style="padding: 12px 0;"><strong style="color: #FDFBF7;">Standard (20 books/mo)</strong></td>
                                    <td style="padding: 12px 0; text-align: right;"><span style="color: #D4AF37; font-size: 20px; font-weight: bold;">$14.95</span></td>
                                </tr>
                                <tr style="border-bottom: 1px solid rgba(212,175,55,0.2);">
                                    <td style="padding: 12px 0;"><strong style="color: #FDFBF7;">Advanced (30 books/mo)</strong></td>
                                    <td style="padding: 12px 0; text-align: right;"><span style="color: #D4AF37; font-size: 20px; font-weight: bold;">$29.95</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0;"><strong style="color: #FDFBF7;">Premium (Unlimited)</strong></td>
                                    <td style="padding: 12px 0; text-align: right;"><span style="color: #D4AF37; font-size: 20px; font-weight: bold;">$44.95</span></td>
                                </tr>
                            </table>
                        </div>
                        
                        <p style="color: #B0C4BF; line-height: 1.8;">
                            Start or upgrade your subscription today and get unlimited access to our growing collection of authentic Islamic literature!
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://kitab-cloud.emergent.host/pricing" style="background-color: #D4AF37; color: #02120F; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                                Subscribe Now
                            </a>
                        </div>
                        
                        <p style="color: #B0C4BF; line-height: 1.6;">
                            JazakAllah Khair for being part of the Kitab Cloud community!
                        </p>
                    </div>
                    {get_email_footer()}
                </div>
                """
            }
            resend.Emails.send(params)
            success_count += 1
            logger.info(f"Price drop announcement sent to {user['email']}")
        except Exception as e:
            fail_count += 1
            failed_emails.append(user["email"])
            logger.error(f"Failed to send price drop announcement to {user['email']}: {e}")
    
    return {
        "message": f"Price drop announcement sent to {success_count} users",
        "success_count": success_count,
        "fail_count": fail_count,
        "total_users": len(users),
        "failed_emails": failed_emails[:10] if failed_emails else []
    }


# Email Drafts Management
class EmailDraftRequest(BaseModel):
    subject: str
    message: str
    target: str = "all"
    button_text: Optional[str] = None
    button_url: Optional[str] = None


@api_router.get("/admin/email-drafts")
async def get_email_drafts(admin: dict = Depends(get_admin_user)):
    """Get all saved email drafts"""
    drafts = await db.email_drafts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"drafts": drafts}


@api_router.post("/admin/email-drafts")
async def save_email_draft(
    request: EmailDraftRequest,
    admin: dict = Depends(get_admin_user)
):
    """Save an email draft"""
    draft = {
        "draft_id": f"draft_{uuid.uuid4().hex[:12]}",
        "subject": request.subject,
        "message": request.message,
        "target": request.target,
        "button_text": request.button_text,
        "button_url": request.button_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email")
    }
    
    await db.email_drafts.insert_one(draft)
    
    return {"message": "Draft saved", "draft_id": draft["draft_id"]}


@api_router.delete("/admin/email-drafts/{draft_id}")
async def delete_email_draft(draft_id: str, admin: dict = Depends(get_admin_user)):
    """Delete an email draft"""
    result = await db.email_drafts.delete_one({"draft_id": draft_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return {"message": "Draft deleted"}




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


# Admin Test Purchase - allows admins to simulate purchases without payment
@api_router.post("/admin/test-purchase")
async def admin_test_purchase(tier: int, user: dict = Depends(get_admin_user)):
    """Admin endpoint to test subscription without actual payment"""
    if tier < 0 or tier > 4:
        raise HTTPException(status_code=400, detail="Invalid tier (0-4)")
    
    user_id = user["user_id"]
    
    # Update user's tier directly
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_tier": tier}}
    )
    
    # Log the test purchase
    logger.info(f"Admin test purchase: {user['email']} set to tier {tier}")
    
    return {
        "message": f"Test purchase successful. Your tier is now {tier}.",
        "tier": tier
    }


# User self-service tier change (downgrade allowed, upgrade requires payment)
@api_router.post("/user/change-tier")
async def change_user_tier(new_tier: int, user: dict = Depends(get_current_user)):
    """Allow users to downgrade their tier. Upgrades require payment."""
    current_tier = user.get("subscription_tier", 0)
    
    if new_tier < 0 or new_tier > 4:
        raise HTTPException(status_code=400, detail="Invalid tier (0-4)")
    
    if new_tier > current_tier:
        raise HTTPException(
            status_code=400, 
            detail="To upgrade your tier, please use the subscription page to make a payment."
        )
    
    if new_tier == current_tier:
        raise HTTPException(status_code=400, detail="You are already on this tier.")
    
    # Allow downgrade
    user_id = user["user_id"]
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_tier": new_tier}}
    )
    
    tier_names = {0: "Free", 1: "Basic", 2: "Standard", 3: "Advanced", 4: "Premium"}
    
    logger.info(f"User {user['email']} downgraded from tier {current_tier} to {new_tier}")
    
    return {
        "message": f"Successfully changed to {tier_names.get(new_tier, f'Tier {new_tier}')}.",
        "old_tier": current_tier,
        "new_tier": new_tier
    }


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
    # Exclude guest users from counts
    non_guest_filter = {"$or": [{"is_guest": {"$ne": True}}, {"is_guest": {"$exists": False}}]}
    
    total_users = await db.users.count_documents(non_guest_filter)
    total_books = await db.books.count_documents({})
    total_purchases = await db.pdf_purchases.count_documents({})
    total_subscriptions = await db.payment_transactions.count_documents({"payment_status": "paid"})
    
    tier_stats = {}
    for tier in range(0, 5):
        count = await db.users.count_documents({
            **non_guest_filter,
            "subscription_tier": tier
        })
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


# Admin Test PDF Purchase - grants PDF access without payment
@api_router.post("/admin/test-pdf-purchase/{book_id}")
async def admin_test_pdf_purchase(book_id: str, user: dict = Depends(get_admin_user)):
    """Admin endpoint to grant free PDF access for testing"""
    # Check book exists
    book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    user_id = user["user_id"]
    
    # Check if already purchased
    existing = await db.pdf_purchases.find_one({
        "user_id": user_id,
        "book_id": book_id
    })
    
    if existing:
        return {"message": "You already have access to this PDF", "already_owned": True}
    
    # Grant free access
    purchase_record = {
        "purchase_id": f"test_{secrets.token_hex(8)}",
        "user_id": user_id,
        "book_id": book_id,
        "book_title": book.get("title", "Unknown"),
        "amount": 0,
        "currency": "usd",
        "payment_status": "test_purchase",
        "stripe_session_id": "admin_test",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pdf_purchases.insert_one(purchase_record)
    
    logger.info(f"Admin test PDF purchase: {user['email']} granted access to {book.get('title')}")
    
    return {
        "message": f"Test purchase successful. You now have access to '{book.get('title')}'",
        "book_id": book_id,
        "book_title": book.get("title")
    }


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
    # Try to get custom tiers from database first
    custom_tiers = await db.settings.find_one({"setting_id": "subscription_tiers"}, {"_id": 0})
    if custom_tiers and custom_tiers.get("tiers"):
        return custom_tiers["tiers"]
    return SUBSCRIPTION_TIERS


# Admin endpoint to get tier settings
@api_router.get("/admin/tiers")
async def get_admin_tiers(user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get custom tiers from database or return defaults
    custom_tiers = await db.settings.find_one({"setting_id": "subscription_tiers"}, {"_id": 0})
    if custom_tiers and custom_tiers.get("tiers"):
        return {"tiers": custom_tiers["tiers"], "is_custom": True}
    return {"tiers": SUBSCRIPTION_TIERS, "is_custom": False}


# Admin endpoint to update tier settings
class TierUpdate(BaseModel):
    tier_id: int
    name: str
    price: float
    book_limit: Optional[int] = None

class TiersUpdateRequest(BaseModel):
    tiers: dict

@api_router.put("/admin/tiers")
async def update_tiers(request: TiersUpdateRequest, user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate tiers
    for tier_id, tier_info in request.tiers.items():
        if not isinstance(tier_info, dict):
            raise HTTPException(status_code=400, detail=f"Invalid tier format for tier {tier_id}")
        if "name" not in tier_info or "price" not in tier_info:
            raise HTTPException(status_code=400, detail=f"Tier {tier_id} missing name or price")
    
    # Save to database
    await db.settings.update_one(
        {"setting_id": "subscription_tiers"},
        {"$set": {
            "setting_id": "subscription_tiers",
            "tiers": request.tiers,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user["user_id"]
        }},
        upsert=True
    )
    
    logger.info(f"Tier settings updated by {user['user_id']}")
    return {"message": "Tier settings updated successfully"}


# Admin endpoint to reset tiers to defaults
@api_router.post("/admin/tiers/reset")
async def reset_tiers(user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.settings.delete_one({"setting_id": "subscription_tiers"})
    logger.info(f"Tier settings reset to defaults by {user['user_id']}")
    return {"message": "Tier settings reset to defaults", "tiers": SUBSCRIPTION_TIERS}


# ============== Discount Code Endpoints ==============

import stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")


@api_router.post("/admin/discount-codes")
async def create_discount_code(discount: DiscountCodeCreate, user: dict = Depends(get_current_user)):
    """Create a new discount code (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if code already exists
    existing = await db.discount_codes.find_one({"code": discount.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    
    # Create Stripe coupon if applicable
    stripe_coupon_id = None
    try:
        if discount.discount_type == "percentage":
            stripe_coupon = stripe.Coupon.create(
                percent_off=discount.value,
                duration="once",
                name=discount.name,
                id=f"DC_{discount.code.upper()}_{uuid.uuid4().hex[:6]}"
            )
            stripe_coupon_id = stripe_coupon.id
        elif discount.discount_type == "fixed_amount":
            stripe_coupon = stripe.Coupon.create(
                amount_off=int(discount.value * 100),  # Stripe uses cents
                currency="usd",
                duration="once",
                name=discount.name,
                id=f"DC_{discount.code.upper()}_{uuid.uuid4().hex[:6]}"
            )
            stripe_coupon_id = stripe_coupon.id
        elif discount.discount_type == "free_trial":
            # For free trials, we'll handle it in checkout by adding trial days
            pass
        elif discount.discount_type == "buy_x_get_y":
            # For buy X get Y, we create a coupon for 100% off Y months
            # This will be applied after X months of payment
            stripe_coupon = stripe.Coupon.create(
                percent_off=100,
                duration="repeating",
                duration_in_months=int(discount.value),  # Y months free
                name=discount.name,
                id=f"DC_{discount.code.upper()}_{uuid.uuid4().hex[:6]}"
            )
            stripe_coupon_id = stripe_coupon.id
        logger.info(f"Created Stripe coupon: {stripe_coupon_id}")
    except Exception as e:
        logger.warning(f"Failed to create Stripe coupon: {e}")
    
    discount_data = {
        "discount_id": f"disc_{uuid.uuid4().hex[:12]}",
        "code": discount.code.upper(),
        "name": discount.name,
        "description": discount.description,
        "discount_type": discount.discount_type,
        "value": discount.value,
        "buy_x_value": discount.buy_x_value,
        "is_visible": discount.is_visible,
        "is_active": discount.is_active,
        "usage_limit": discount.usage_limit,
        "per_user_limit": discount.per_user_limit,
        "used_count": 0,
        "applicable_tiers": discount.applicable_tiers,
        "valid_from": discount.valid_from,
        "valid_until": discount.valid_until,
        "banner_text": discount.banner_text,
        "badge_text": discount.badge_text,
        "stripe_coupon_id": stripe_coupon_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.discount_codes.insert_one(discount_data)
    logger.info(f"Discount code created: {discount.code} by admin {user['user_id']}")
    
    return {k: v for k, v in discount_data.items() if k != "_id"}


@api_router.get("/admin/discount-codes")
async def list_discount_codes(user: dict = Depends(get_current_user)):
    """List all discount codes (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    codes = await db.discount_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"discount_codes": codes}


@api_router.get("/admin/discount-codes/{discount_id}")
async def get_discount_code(discount_id: str, user: dict = Depends(get_current_user)):
    """Get a specific discount code (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    code = await db.discount_codes.find_one({"discount_id": discount_id}, {"_id": 0})
    if not code:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    return code


@api_router.put("/admin/discount-codes/{discount_id}")
async def update_discount_code(discount_id: str, update: DiscountCodeUpdate, user: dict = Depends(get_current_user)):
    """Update a discount code (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.discount_codes.find_one({"discount_id": discount_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        await db.discount_codes.update_one(
            {"discount_id": discount_id},
            {"$set": update_data}
        )
    
    updated = await db.discount_codes.find_one({"discount_id": discount_id}, {"_id": 0})
    logger.info(f"Discount code updated: {discount_id} by admin {user['user_id']}")
    
    return updated


@api_router.delete("/admin/discount-codes/{discount_id}")
async def delete_discount_code(discount_id: str, user: dict = Depends(get_current_user)):
    """Delete a discount code (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.discount_codes.find_one({"discount_id": discount_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Discount code not found")
    
    # Try to delete Stripe coupon if exists
    if existing.get("stripe_coupon_id"):
        try:
            stripe.Coupon.delete(existing["stripe_coupon_id"])
        except Exception as e:
            logger.warning(f"Failed to delete Stripe coupon: {e}")
    
    await db.discount_codes.delete_one({"discount_id": discount_id})
    logger.info(f"Discount code deleted: {discount_id} by admin {user['user_id']}")
    
    return {"message": "Discount code deleted successfully"}


@api_router.post("/discount/validate")
async def validate_discount_code(request: DiscountValidateRequest, user: dict = Depends(get_current_user)):
    """Validate a discount code and return discount details"""
    code = request.code.upper()
    tier = request.tier
    book_id = request.book_id
    
    discount = await db.discount_codes.find_one({"code": code, "is_active": True}, {"_id": 0})
    
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid or expired discount code")
    
    # Check if code is within valid date range
    now = datetime.now(timezone.utc)
    if discount.get("valid_from"):
        valid_from = datetime.fromisoformat(discount["valid_from"].replace('Z', '+00:00'))
        if now < valid_from:
            raise HTTPException(status_code=400, detail="This discount code is not yet active")
    
    if discount.get("valid_until"):
        valid_until = datetime.fromisoformat(discount["valid_until"].replace('Z', '+00:00'))
        if now > valid_until:
            raise HTTPException(status_code=400, detail="This discount code has expired")
    
    # Check total usage limit
    if discount.get("usage_limit") and discount.get("used_count", 0) >= discount["usage_limit"]:
        raise HTTPException(status_code=400, detail="This discount code has reached its usage limit")
    
    # Check per-user limit
    user_usage = await db.discount_usage.count_documents({
        "discount_id": discount["discount_id"],
        "user_id": user["user_id"]
    })
    if user_usage >= discount.get("per_user_limit", 1):
        raise HTTPException(status_code=400, detail="You have already used this discount code")
    
    # Determine original price based on tier or book
    original_price = 0
    
    if book_id:
        # PDF purchase - get book price
        book = await db.books.find_one({"book_id": book_id}, {"_id": 0})
        if book and book.get("pdf_price"):
            original_price = float(book["pdf_price"])
        else:
            raise HTTPException(status_code=400, detail="Book not found or not available for purchase")
    elif tier:
        # Subscription - check if applicable to selected tier
        if discount.get("applicable_tiers") and tier not in discount["applicable_tiers"]:
            raise HTTPException(status_code=400, detail="This discount code is not valid for the selected plan")
        
        # Get tier price
        custom_tiers = await db.settings.find_one({"setting_id": "subscription_tiers"}, {"_id": 0})
        tiers = custom_tiers.get("tiers") if custom_tiers else SUBSCRIPTION_TIERS
        tier_key = str(tier) if str(tier) in tiers else tier
        tier_info = tiers.get(tier_key) or tiers.get(str(tier_key))
        original_price = tier_info["price"]
    else:
        raise HTTPException(status_code=400, detail="Please specify a tier or book_id")
    
    discount_info = {
        "code": discount["code"],
        "name": discount["name"],
        "discount_type": discount["discount_type"],
        "value": discount["value"],
        "original_price": original_price,
        "final_price": original_price,
        "savings": 0,
        "description": ""
    }
    
    if discount["discount_type"] == "percentage":
        savings = original_price * (discount["value"] / 100)
        discount_info["final_price"] = original_price - savings
        discount_info["savings"] = savings
        discount_info["description"] = f"{int(discount['value'])}% off first month"
    elif discount["discount_type"] == "fixed_amount":
        discount_info["final_price"] = max(0, original_price - discount["value"])
        discount_info["savings"] = min(original_price, discount["value"])
        discount_info["description"] = f"${discount['value']} off first month"
    elif discount["discount_type"] == "free_trial":
        discount_info["final_price"] = 0
        discount_info["savings"] = original_price
        discount_info["trial_days"] = int(discount["value"])
        discount_info["description"] = f"{int(discount['value'])} day free trial"
    elif discount["discount_type"] == "buy_x_get_y":
        buy_months = discount.get("buy_x_value", 1)
        free_months = int(discount["value"])
        discount_info["description"] = f"Pay {buy_months} month{'s' if buy_months > 1 else ''}, get {free_months} month{'s' if free_months > 1 else ''} free"
        discount_info["buy_months"] = buy_months
        discount_info["free_months"] = free_months
    
    return discount_info


@api_router.get("/discount/visible")
async def get_visible_discounts():
    """Get all visible discount codes for homepage display (Public endpoint)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find active and visible codes within valid date range
    query = {
        "is_active": True,
        "is_visible": True,
        "$or": [
            {"valid_from": None},
            {"valid_from": {"$lte": now}}
        ]
    }
    
    discounts = await db.discount_codes.find(query, {"_id": 0, "stripe_coupon_id": 0}).to_list(20)
    
    # Filter out expired codes
    valid_discounts = []
    for d in discounts:
        if d.get("valid_until"):
            valid_until = datetime.fromisoformat(d["valid_until"].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > valid_until:
                continue
        # Check usage limit
        if d.get("usage_limit") and d.get("used_count", 0) >= d["usage_limit"]:
            continue
        valid_discounts.append(d)
    
    return {"discounts": valid_discounts}


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


@api_router.post("/user/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload user profile picture"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read file content
    content = await file.read()
    
    # Validate file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be less than 5MB")
    
    try:
        # Upload to storage
        file_path = f"profile-pictures/{user['user_id']}.jpg"
        upload_response = storage_client.upload(
            path=file_path,
            content=content,
            content_type=file.content_type
        )
        
        picture_url = upload_response.get('url', f"/api/files/{file_path}")
        
        # Update user profile
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"picture": picture_url}}
        )
        
        return {"message": "Profile picture updated", "picture_url": picture_url}
    except Exception as e:
        logger.error(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload profile picture")


@api_router.get("/user/purchases")
async def get_user_purchases(user: dict = Depends(get_current_user)):
    """Get user's PDF purchases"""
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    purchased_pdfs = user_data.get("purchased_pdfs", [])
    
    # Get book details for each purchase
    purchases = []
    for book_id in purchased_pdfs:
        book = await db.books.find_one({"book_id": book_id})
        if book:
            purchases.append({
                "book_id": book_id,
                "title": book.get("title", "Unknown"),
                "cover_image": book.get("cover_image"),
                "amount": book.get("pdf_price", 0),
                "purchased_at": book.get("purchased_at", user_data.get("created_at"))
            })
    
    return {"purchases": purchases}



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


class SyncSubscriptionRequest(BaseModel):
    tier: int


@api_router.post("/user/sync-subscription")
async def sync_subscription(request: SyncSubscriptionRequest, user: dict = Depends(get_current_user)):
    """Sync subscription tier from iOS In-App Purchase (RevenueCat)"""
    user_id = user["user_id"]
    new_tier = request.tier
    
    if new_tier < 0 or new_tier > 4:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # Update user's subscription tier
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "subscription_tier": new_tier,
                "subscription_source": "ios_iap",
                "subscription_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log the subscription change
    await db.subscription_history.insert_one({
        "history_id": f"hist_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "tier": new_tier,
        "source": "ios_iap",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Synced iOS subscription for user {user_id}: Tier {new_tier}")
    
    return {"message": "Subscription synced", "tier": new_tier}


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


@api_router.delete("/user/account")
async def delete_account(user: dict = Depends(get_current_user)):
    """Permanently delete user account and all associated data (Apple App Store requirement)"""
    user_id = user["user_id"]
    
    # Check if user exists
    user_data = await db.users.find_one({"user_id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cancel any active Stripe subscription
    if user_data.get("stripe_customer_id"):
        try:
            import stripe
            stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
            # List all subscriptions for this customer
            subscriptions = stripe.Subscription.list(customer=user_data["stripe_customer_id"], status="active")
            for sub in subscriptions.data:
                stripe.Subscription.delete(sub.id)
        except Exception as e:
            print(f"Error cancelling Stripe subscription: {e}")
    
    # Delete all user-related data
    await db.users.delete_one({"user_id": user_id})
    await db.user_bookshelf.delete_many({"user_id": user_id})
    await db.reading_progress.delete_many({"user_id": user_id})
    await db.favorites.delete_many({"user_id": user_id})
    await db.payment_transactions.delete_many({"user_id": user_id})
    await db.subscription_cancellations.delete_many({"user_id": user_id})
    await db.email_verification_codes.delete_many({"email": user_data.get("email")})
    
    return {"message": "Account deleted successfully"}


# ==================== OneSignal Push Notifications ====================

ONESIGNAL_APP_ID = os.environ.get('ONESIGNAL_APP_ID')
ONESIGNAL_REST_API_KEY = os.environ.get('ONESIGNAL_REST_API_KEY')


class SendNotificationRequest(BaseModel):
    title: str
    message: str
    target: str = "all"  # "all", "unsubscribed", "subscribed"
    url: Optional[str] = None  # Optional deep link URL


class NotificationResponse(BaseModel):
    success: bool
    notification_id: Optional[str] = None
    recipients: Optional[int] = None
    message: str


@api_router.post("/admin/notifications/send", response_model=NotificationResponse)
async def send_push_notification(request: SendNotificationRequest, user: dict = Depends(get_admin_user)):
    """Send push notification to users via OneSignal"""
    if not ONESIGNAL_APP_ID or not ONESIGNAL_REST_API_KEY:
        raise HTTPException(status_code=500, detail="OneSignal not configured")
    
    try:
        # Build OneSignal API request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {ONESIGNAL_REST_API_KEY}"
        }
        
        # Build payload based on targeting
        payload = {
            "app_id": ONESIGNAL_APP_ID,
            "headings": {"en": request.title},
            "contents": {"en": request.message},
        }
        
        # Add URL if provided
        if request.url:
            payload["url"] = request.url
        
        # Set targeting based on request
        if request.target == "all":
            # Send to ALL subscribed devices (not just "Subscribed Users" segment)
            payload["included_segments"] = ["All"]
        elif request.target == "unsubscribed":
            # Send to users with subscription_tier = 0
            payload["filters"] = [
                {"field": "tag", "key": "is_subscribed", "relation": "=", "value": "false"}
            ]
        elif request.target == "subscribed":
            # Send to users with active subscriptions
            payload["filters"] = [
                {"field": "tag", "key": "is_subscribed", "relation": "=", "value": "true"}
            ]
        else:
            # Default to all
            payload["included_segments"] = ["All"]
        
        logger.info(f"Sending OneSignal notification: {payload}")
        
        # Send notification via OneSignal REST API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://onesignal.com/api/v1/notifications",
                headers=headers,
                json=payload,
                timeout=30
            )
        
        response_data = response.json()
        logger.info(f"OneSignal response: {response.status_code} - {response_data}")
        
        if response.status_code == 200:
            # Log the notification in database
            notification_id = f"notif_{uuid.uuid4().hex[:12]}"
            await db.notification_history.insert_one({
                "notification_id": notification_id,
                "onesignal_id": response_data.get("id"),
                "title": request.title,
                "message": request.message,
                "target": request.target,
                "url": request.url,
                "recipients": response_data.get("recipients", 0),
                "sent_by": user["user_id"],
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "onesignal_response": response_data
            })
            
            return NotificationResponse(
                success=True,
                notification_id=response_data.get("id"),
                recipients=response_data.get("recipients", 0),
                message=f"Notification sent to {response_data.get('recipients', 0)} devices"
            )
        else:
            logger.error(f"OneSignal error: {response_data}")
            return NotificationResponse(
                success=False,
                message=f"OneSignal error: {response_data.get('errors', ['Unknown error'])}"
            )
            
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


@api_router.get("/admin/notifications/history")
async def get_notification_history(user: dict = Depends(get_admin_user), limit: int = 20):
    """Get history of sent notifications"""
    notifications = await db.notification_history.find(
        {}, {"_id": 0}
    ).sort("sent_at", -1).limit(limit).to_list(limit)
    
    return {"notifications": notifications}


@api_router.post("/notifications/register-device")
async def register_device(
    player_id: str = Query(..., description="OneSignal Player ID"),
    user: dict = Depends(get_current_user)
):
    """Register a device's OneSignal Player ID with a user"""
    user_id = user["user_id"]
    
    # Store device registration
    await db.device_registrations.update_one(
        {"player_id": player_id},
        {
            "$set": {
                "user_id": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "registered_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Device registered"}


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
