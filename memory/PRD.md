# Darussalam Kitab Cloud - Product Requirements Document

## App Overview
**Name:** Darussalam Kitab Cloud  
**Description:** Digital Library App for Dar-Us-Salam Publications with membership tiers  
**Publisher:** Dar-Us-Salam Publications (sales@dar-us-salam.com)

## Tech Stack
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Native Wrapper:** Capacitor (iOS & Android)
- **Payments:** Stripe (external browser checkout for iOS compliance)
- **Emails:** Resend
- **Storage:** Emergent Object Storage

## Core Features (Implemented)
- [x] User authentication (email/password)
- [x] Guest browsing mode
- [x] 5-tier subscription system (0=Pay-per-book, 1-4=Monthly plans)
- [x] Admin dashboard for book/user management
- [x] PDF reading in-app
- [x] Individual PDF purchases
- [x] Monthly reading limits (configurable by admin)
- [x] Email verification via Resend
- [x] Account deletion (Apple compliance)
- [x] Privacy Policy page
- [x] External browser payment modal (iOS WebView bypass)
- [x] ErrorBoundary for crash handling
- [x] App Transport Security (ATS) configuration
- [x] **Discount Code System** (NEW - May 2026)

## Discount Code System (NEW)
### Features:
- Create/manage discount codes from Admin Dashboard
- 4 discount types: percentage, fixed amount, free trial, buy X get Y
- Per-code and per-user usage limits
- Date-based validity
- Visible codes (shown on homepage/pricing) vs Secret codes
- Stripe coupon integration
- Promotional banners on Landing and Pricing pages

### API Endpoints:
- `POST /api/admin/discount-codes` - Create discount
- `GET /api/admin/discount-codes` - List all discounts
- `PUT /api/admin/discount-codes/{id}` - Update discount
- `DELETE /api/admin/discount-codes/{id}` - Delete discount
- `POST /api/discount/validate` - Validate a code for checkout
- `GET /api/discount/visible` - Get visible codes for homepage

### Database Collections:
- `discount_codes` - Stores discount code configurations
- `discount_usage` - Tracks per-user usage

## Database Schema
- **users:** email, hashed_password, is_admin, is_guest, subscription_tier, bookshelf
- **books:** title, darussalam_code, tier_level, category, cover_url, pdf_url, purchase_link, pdf_price
- **tier_settings:** Dynamic pricing/limits per tier
- **discount_codes:** code, name, type, value, is_visible, is_active, usage limits, validity dates
- **discount_usage:** discount_id, user_id, session_id, created_at

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`
- `/api/books/all`, `/api/books/{id}`
- `/api/user/cancel-subscription`
- `/api/payments/create-checkout` (now supports discount_code parameter)
- `/api/admin/*` (admin routes including discount management)

## Production URLs
- **Web/API:** https://kitab-cloud.emergent.host
- **Custom Domain:** https://duskitab.com
- **iOS/Android builds:** Via Codemagic (connected to GitHub)

## Store Compliance Status
### Google Play
- [x] Removed promotional language ("premier", "sophisticated", "Best")
- [x] Removed user count claims ("thousands of readers")
- [x] Changed "exclusive" to neutral language
- [ ] **ACTION REQUIRED:** Update Google Play Console metadata with compliant description

### Apple App Store
- [x] Privacy Policy accessible in-app
- [x] Account Deletion feature implemented
- [x] External browser payment (avoids IAP for digital goods)
- [x] ATS configured for HTTPS
- [x] ErrorBoundary for crash handling
- [x] All StoreKit/IAP code removed
- [x] Prices shown (Apple confirmed external payment OK for US storefront)
- [ ] **PENDING:** iPad blank screen verification from TestFlight
- [ ] **ACTION REQUIRED:** Fix Support URL in App Store Connect
- [ ] **ACTION REQUIRED:** Remove China mainland from distribution OR provide publishing license

## Environment Variables
### Backend (.env)
- MONGO_URL
- DB_NAME
- STRIPE_API_KEY
- STRIPE_SECRET_KEY (added May 2026)
- EMERGENT_LLM_KEY
- JWT_SECRET_KEY
- RESEND_API_KEY

## Test Credentials
- **Email:** huzaifahwaheed70@gmail.com
- **Password:** admin123

## Backlog (Future Features)
- [ ] (P2) Reading statistics dashboard

---
*Last updated: May 2026*
