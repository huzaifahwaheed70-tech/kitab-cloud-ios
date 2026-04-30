# Dar-Us-Salam Kitab Cloud - Product Requirements Document

## Original Problem Statement
Create a high-end Digital Library App for Dar-Us-Salam Publications with membership tiers. The app should have a Netflix-style book grid, tier-based access, and an admin dashboard.

## User Personas
1. **Pay-Per-Book User (Tier 0)** - Purchases individual PDFs without subscription
2. **Casual Reader (Basic/Standard)** - 10-20 books/month, standard library access
3. **Dedicated Student (Advanced)** - 30 books/month, Volume books, in-book search
4. **Scholar (Premium)** - Unlimited books, all features including advanced books

## Core Requirements
- Netflix-style book grid with cover images
- Search by book title
- 5-tier subscription model (Tier 0-4)
- Monthly reading list limits per tier
- In-app PDF reader with copy protection
- Favorites and Continue Reading features
- In-book search for Tier 3+
- Admin dashboard for book management
- Stripe payment integration (LIVE)
- Email/Password authentication (Google OAuth removed per user request)
- User Settings page with subscription management
- Password reset via email (Resend integration)
- Welcome emails for new users

## What's Been Implemented (April 2026)

### Core Features
- ✅ Full-stack app: React frontend + FastAPI backend + MongoDB
- ✅ Authentication: Email/Password JWT (Google OAuth removed)
- ✅ Stripe payment integration (LIVE key active)
- ✅ Emergent Object Storage for PDFs and book covers
- ✅ Netflix-style library with tier-based access
- ✅ PDF viewer with embedded reader + copy/paste protection
- ✅ Auto-generated book covers from PDF first page
- ✅ Monthly bookshelf with tier-specific limits
- ✅ Favorites system
- ✅ Continue Reading section (reading progress tracking)
- ✅ In-book text search for Tier 3+ (searches PDF text content)
- ✅ Save page/bookmark functionality
- ✅ Volume and Advanced book restrictions
- ✅ Tier 0 - Individual PDF purchase option
- ✅ Admin dashboard (books, users management)
- ✅ PWA support with service worker
- ✅ Capacitor integration for native iOS/Android wrapping
- ✅ Custom logo (user-provided open book icon) throughout app

### Email Integration (April 2026)
- ✅ Resend email service integration
- ✅ Welcome emails sent to new users on registration
- ✅ Password reset flow with email links
- ✅ Forgot Password page (/forgot-password)
- ✅ Reset Password page (/reset-password?token=xxx)
- ✅ 1-hour expiry on password reset tokens

### User Settings
- ✅ Profile tab: Edit name and email
- ✅ Security tab: Change password (for email/password users)
- ✅ Subscription tab: View current plan, price, book limit
- ✅ Cancel subscription (end of billing period)
- ✅ Reactivate cancelled subscription
- ✅ Settings accessible from user menu (desktop & mobile)

### Bug Fixes
- ✅ Fixed book cover images not displaying (created public /api/covers/ endpoint)
- ✅ Fixed mobile PDF reader navigation (controls above Emergent badge)
- ✅ Fixed save page functionality (correct API parameter format)
- ✅ Fixed password form not showing for email/password users
- ✅ Removed Google OAuth completely (was causing login bugs)
- ✅ Updated logo throughout the app to use user's custom logo
- ✅ Mobile UI improvements: larger tap targets (44-48px minimum), centered PDF navigation, better spacing (April 2026)

## Subscription Tiers
| Tier | Name | Price | Book Limit | Features |
|------|------|-------|------------|----------|
| 0 | Pay Per Book | - | - | Buy individual PDFs |
| 1 | Basic | $20/mo | 10 | Standard library |
| 2 | Standard | $40/mo | 20 | Standard library |
| 3 | Advanced | $60/mo | 30 | Volume books, In-book search |
| 4 | Premium | $80/mo | Unlimited | All books + Advanced |

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React
- **Database**: MongoDB
- **Authentication**: JWT (Email/Password only)
- **Payments**: 
  - Stripe (Web - LIVE)
  - Apple StoreKit (iOS - Backend ready, needs native plugin)
- **Emails**: Resend
- **File Storage**: Emergent Object Storage
- **PDF Processing**: PyMuPDF (cover generation), react-pdf (viewing)
- **Native Wrapper**: Capacitor (for iOS/Android builds)

## Key API Endpoints
- `/api/auth/register` - User registration (sends welcome email)
- `/api/auth/login` - Email/password login
- `/api/auth/logout` - Logout
- `/api/auth/me` - Get current user
- `/api/auth/forgot-password` - Request password reset email
- `/api/auth/reset-password` - Reset password with token
- `/api/books/*` - Book CRUD and access
- `/api/covers/{path}` - Public cover images (no auth required)
- `/api/files/{path}` - Protected file access (PDFs)
- `/api/bookshelf/*` - Monthly reading list management
- `/api/favorites/*` - Favorites management
- `/api/reading-progress/*` - Reading progress tracking
- `/api/continue-reading` - Recent reading history
- `/api/payments/create-checkout` - Stripe checkout (Web)
- `/api/payments/status/{session_id}` - Stripe payment status
- `/api/payments/apple/validate` - Apple StoreKit validation (iOS)
- `/api/payments/apple/restore` - Restore Apple purchases (iOS)
- `/api/payments/apple/status` - Apple subscription status (iOS)
- `/api/webhook/stripe` - Stripe webhook
- `/api/webhook/apple` - Apple App Store Server Notifications
- `/api/user/profile` - User profile management
- `/api/user/password` - Password change
- `/api/user/cancel-subscription` - Cancel subscription
- `/api/user/reactivate-subscription` - Reactivate subscription
- `/api/admin/*` - Admin dashboard operations

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Fix cover images not displaying
- ✅ Complete 4-tier subscription model
- ✅ Remove scan request features
- ✅ User settings page
- ✅ Cancel subscription functionality
- ✅ Live Stripe integration
- ✅ Password reset via email (Resend)
- ✅ Welcome emails for new users
- ✅ Remove Google OAuth (user requested)

### P1 (High Priority) - NEXT
- Test and deploy StoreKit on iOS (native plugin files created, need Xcode integration + pod install)
- Custom domain deployment (duskitab.com)
- Configure Resend with verified domain for production emails (currently using sandbox which only sends to verified account email)

### P2 (Medium Priority)
- Email notifications for subscription changes
- Book recommendations
- Reading statistics dashboard
- Email receipts for purchases

### P3 (Future)
- User reviews and ratings
- Social sharing features

## Testing
- Backend: 43+ API tests passing (pytest)
- Frontend: All features verified via browser automation
- Test credentials: huzaifahwaheed70@gmail.com / admin123
- Test reports: /app/test_reports/iteration_1.json, iteration_2.json, iteration_3.json

## Notes
- Stripe is using LIVE key - real payments are processed
- Offline reading NOT implemented (user decision to protect content)
- Support email: sales@dar-us-salam.com
- Resend emails use sandbox domain (onboarding@resend.dev) - user needs to verify duskitab.com domain in Resend for production emails
- Capacitor configured for native mobile builds via Codemagic
