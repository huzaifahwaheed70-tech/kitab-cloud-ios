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

## Database Schema
- **users:** email, hashed_password, is_admin, is_guest, subscription_tier, bookshelf
- **books:** title, darussalam_code, tier_level, category, cover_url, pdf_url, purchase_link, pdf_price
- **tier_settings:** Dynamic pricing/limits per tier

## Key API Endpoints
- `/api/auth/login`, `/api/auth/register`
- `/api/books/all`, `/api/books/{id}`
- `/api/user/cancel-subscription`
- `/api/payments/create-checkout`
- `/api/admin/*` (admin routes)

## Production URLs
- **Web/API:** https://kitab-cloud.emergent.host
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
- [ ] **PENDING:** iPad blank screen verification from TestFlight

## Backlog (Future Features)
- [ ] (P2) Reading statistics dashboard
- [ ] Ship-to-Scan feature expansion

## Test Credentials
- **Email:** huzaifahwaheed70@gmail.com
- **Password:** admin123

---
*Last updated: December 2025*
