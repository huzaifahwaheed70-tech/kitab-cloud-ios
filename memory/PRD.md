# Darussalam Kitab Cloud - Product Requirements Document

## App Overview
**Name:** Darussalam Kitab Cloud  
**Description:** Digital Library App for Dar-Us-Salam Publications with membership tiers  
**Publisher:** Dar-Us-Salam Publications (sales@dar-us-salam.com)

## Tech Stack
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Native Wrapper:** Capacitor v7 (iOS & Android)
- **Payments:** 
  - **Web/Android:** Stripe Checkout
  - **iOS:** RevenueCat Apple In-App Purchase (IAP)
- **Emails:** Resend
- **Storage:** Emergent Object Storage
- **Push Notifications:** OneSignal (react-onesignal + @onesignal/capacitor-plugin)
- **File System (Native):** @capacitor/filesystem (PDF downloads)

## Core Features (Implemented)
- [x] User authentication (email/password)
- [x] Guest browsing mode
- [x] 5-tier subscription system (0=Pay-per-book, 1-4=Monthly plans)
- [x] Admin dashboard for book/user management
- [x] PDF reading in-app
- [x] Individual PDF purchases (Web/Android only)
- [x] Monthly reading limits (configurable by admin)
- [x] Email verification via Resend
- [x] Account deletion (Apple compliance)
- [x] Privacy Policy page
- [x] ErrorBoundary for crash handling
- [x] App Transport Security (ATS) configuration
- [x] **Discount Code System** (Web/Android only - Apple has their own)
- [x] **Pre-checkout Discount Popup** (Web/Android only)
- [x] **Admin Push Notifications via OneSignal**
- [x] **RevenueCat Apple IAP for iOS Subscriptions** (Dec 2025)
- [x] **Admin Test Purchases** (for PDFs and subscriptions without payment)
- [x] **Monthly Reading List Locks** (enforced limits until new month)
- [x] **Subscription Downgrades** via Settings
- [x] **PDF Download to Device** (Capacitor Filesystem API for native apps)

## iOS App Store Compliance (CRITICAL)
### What's HIDDEN on iOS:
- PDF purchases (completely hidden - Apple Guideline 3.1.1)
- Physical book purchases (completely hidden)
- Discount codes (Apple handles their own via App Store Connect)
- External payment links

### What's SHOWN on iOS:
- Subscription prices (via RevenueCat IAP)
- Subscribe buttons (use RevenueCat, not Stripe)
- Restore Purchases button
- All book content and reading features

### RevenueCat Integration:
- **iOS API Key:** appl_ektcemLtYrefFQBihwgtwStQpKB
- **Products:** kitab_tier_1_monthly, kitab_tier_2_monthly, kitab_tier_3_monthly, kitab_tier_4_monthly
- **Entitlements:** tier_1, tier_2, tier_3, tier_4
- **Backend Sync:** POST /api/user/sync-subscription

## Discount Code System (Web/Android Only)
### Features:
- Create/manage discount codes from Admin Dashboard
- 4 discount types: percentage, fixed amount, free trial, buy X get Y
- Per-code and per-user usage limits
- Date-based validity
- Visible codes (shown on homepage/pricing) vs Secret codes
- Stripe coupon integration
- Promotional banners on Landing and Pricing pages
- **Pre-checkout popup** asks users for discount code before Stripe redirect

### API Endpoints:
- `POST /api/admin/discount-codes` - Create discount
- `GET /api/admin/discount-codes` - List all discounts
- `PUT /api/admin/discount-codes/{id}` - Update discount
- `DELETE /api/admin/discount-codes/{id}` - Delete discount
- `POST /api/discount/validate` - Validate a code for checkout
- `GET /api/discount/visible` - Get visible codes for homepage

## Push Notifications System
### Features:
- Admin can send push notifications from Admin Dashboard > Notifications tab
- Target audiences: Everyone, Unsubscribed users only, Subscribed users only
- Optional deep link URL to direct users to specific pages
- Character limits: Title (50), Message (200)
- Preview section shows how notification will appear
- History of sent notifications

### API Endpoints:
- `POST /api/admin/notifications/send` - Send push notification via OneSignal
- `GET /api/admin/notifications/history` - Get notification history

### OneSignal Configuration:
- **App ID:** 31bf8b91-fdf9-427b-8908-9e52914d6d11
- **Frontend:** react-onesignal (web) + @onesignal/capacitor-plugin (native)
- **User tagging:** subscription_tier, is_subscribed tags for targeting

## Database Schema
- **users:** email, hashed_password, is_admin, is_guest, subscription_tier, bookshelf
- **books:** title, darussalam_code, tier_level, category, cover_url, pdf_url, purchase_link, pdf_price
- **tier_settings:** Dynamic pricing/limits per tier
- **discount_codes:** code, name, type, value, is_visible, is_active, usage limits, validity dates
- **discount_usage:** discount_id, user_id, session_id, created_at
- **notification_history:** notification_id, onesignal_id, title, message, target, recipients, sent_at
- **device_registrations:** player_id, user_id, registered_at

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`
- `/api/books/all`, `/api/books/{id}`
- `/api/user/cancel-subscription`
- `/api/user/sync-subscription` (RevenueCat iOS sync)
- `/api/payments/create-checkout` (supports discount_code parameter)
- `/api/admin/*` (admin routes including discount and notification management)

## Production URLs
- **Web/API:** https://kitab-cloud.emergent.host
- **Custom Domain:** https://duskitab.com
- **iOS/Android builds:** Via Codemagic (connected to GitHub)

## Store Compliance Status
### Google Play
- [x] Compliant description
- [x] Stripe payments working

### Apple App Store
- [x] Privacy Policy accessible in-app
- [x] Account Deletion feature implemented
- [x] RevenueCat IAP for subscriptions (Guideline 3.1.1 compliant)
- [x] PDF/Physical book purchases HIDDEN on iOS
- [x] No external payment links on iOS
- [x] No discount codes on iOS (Apple handles their own)
- [x] ATS configured for HTTPS
- [x] ErrorBoundary for crash handling
- [ ] **PENDING:** Codemagic build fixing (RevenueCat SPM signing issue)

## Environment Variables
### Backend (.env)
- MONGO_URL
- DB_NAME
- STRIPE_API_KEY
- STRIPE_SECRET_KEY
- EMERGENT_LLM_KEY
- JWT_SECRET_KEY
- RESEND_API_KEY
- ONESIGNAL_APP_ID
- ONESIGNAL_REST_API_KEY

### Frontend (.env)
- REACT_APP_BACKEND_URL
- REACT_APP_ONESIGNAL_APP_ID

## Test Credentials
- **Email:** huzaifahwaheed70@gmail.com
- **Password:** admin123

## Backlog (Future Features)
- [ ] (P2) Reading statistics dashboard
- [ ] Configure OneSignal dashboard for web push

## Known Issues / User Verification Required
### Resend Emails on Production
- Preview environment is working correctly
- Production may have missing `RESEND_API_KEY` or unverified domain
- Admin can check config via: `GET /api/admin/email-config`
- Admin can test via: `POST /api/admin/test-email?email=test@example.com`

### Codemagic iOS Build
- Using native `xcode-project` CLI to handle SPM + RevenueCat provisioning
- User verification pending

---
*Last updated: June 2026*
