# Dar-Us-Salam Kitab Cloud - Product Requirements Document

## Original Problem Statement
Create a high-end Digital Library App for Dar-Us-Salam Publications with a "Scan-on-Demand" service featuring membership tiers. The app should have a Netflix-style book grid, tier-based access, and an admin dashboard.

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
- Stripe payment integration
- Google OAuth + Email/Password authentication

## What's Been Implemented (March 2026)

### Core Features
- ✅ Full-stack app: React frontend + FastAPI backend + MongoDB
- ✅ Authentication: Google OAuth + Email/Password JWT
- ✅ Stripe payment integration for 5 subscription tiers (test mode)
- ✅ Emergent Object Storage for PDFs and book covers
- ✅ Netflix-style library with tier-based access
- ✅ PDF viewer with embedded reader + copy/paste protection
- ✅ Auto-generated book covers from PDF first page
- ✅ Monthly bookshelf with tier-specific limits
- ✅ Favorites system
- ✅ Continue Reading section (reading progress tracking)
- ✅ In-book search UI for Tier 3+ users
- ✅ Volume and Advanced book restrictions
- ✅ Tier 0 - Individual PDF purchase option
- ✅ Admin dashboard (books, users management)
- ✅ PWA support with service worker

### Bug Fixes
- ✅ Fixed book cover images not displaying (created public /api/covers/ endpoint)
- ✅ Removed deprecated "Request a Scan" and "Ship-to-Scan" features
- ✅ Updated admin dashboard with new book fields (is_volume, is_advanced, original_price, pdf_price)

## Subscription Tiers (Updated)
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
- **Authentication**: JWT + Google OAuth (Emergent-managed)
- **Payments**: Stripe (test mode)
- **File Storage**: Emergent Object Storage
- **PDF Processing**: PyMuPDF (cover generation)

## Key API Endpoints
- `/api/auth/*` - Authentication (register, login, logout, session)
- `/api/books/*` - Book CRUD and access
- `/api/covers/{path}` - Public cover images (no auth required)
- `/api/files/{path}` - Protected file access (PDFs)
- `/api/bookshelf/*` - Monthly reading list management
- `/api/favorites/*` - Favorites management
- `/api/reading-progress/*` - Reading progress tracking
- `/api/continue-reading` - Recent reading history
- `/api/payments/*` - Stripe checkout and status
- `/api/admin/*` - Admin dashboard operations

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Fix cover images not displaying
- ✅ Complete 4-tier subscription model
- ✅ Remove scan request features

### P1 (High Priority)
- Live Stripe API key integration (deferred by user)
- User account settings page
- Cancel subscription functionality

### P2 (Medium Priority)
- Full in-book search implementation (backend text extraction)
- Offline book reading via PWA
- Email notifications
- Book recommendations

### P3 (Future)
- Native iOS/Android apps (user interested after web complete)
- User reviews and ratings
- Social sharing features

## Testing
- Backend: 17 API tests passing (pytest)
- Frontend: All features verified via browser automation
- Test credentials: huzaifahwaheed70@gmail.com / admin123

## Notes
- Stripe is using test key (sk_test_emergent) - no real payments
- Support email: sales@dar-us-salam.com
