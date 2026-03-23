# Dar-Us-Salam Kitab Cloud - Product Requirements Document

## Original Problem Statement
Create a high-end Digital Library App for Dar-Us-Salam Publications with Scan-on-Demand service featuring 5 membership tiers.

## User Personas
1. **Casual Reader** - Basic tier, access to foundational texts
2. **Dedicated Student** - Standard/Advanced tier, broader collection access
3. **Scholar/Collector** - Premium/Unlimited tier, full archive + Ship-to-Scan

## Core Requirements
- Netflix-style book grid with cover images
- Search by Darussalam Code (e.g., C21, E20)
- Tier-based book access (1-5)
- Bookshelf limits: Basic=15, Standard=35, Advanced=60, Premium=75, Unlimited=∞
- In-app PDF reader
- Request a Scan form for all users
- Ship-to-Scan portal (Premium & Unlimited only)
- Admin dashboard for book/user/request management

## What's Been Implemented (Jan 2026)
- ✅ Full-stack app: React frontend + FastAPI backend + MongoDB
- ✅ Authentication: Google OAuth + Email/Password JWT
- ✅ Stripe payment integration for 5 subscription tiers
- ✅ Emergent Object Storage for PDFs and book covers
- ✅ Netflix-style library with tier-based access
- ✅ PDF viewer with embedded reader
- ✅ Bookshelf with tier-specific limits
- ✅ Request a Scan functionality
- ✅ Ship-to-Scan portal (Tier 4+5)
- ✅ Admin dashboard (books, users, scan requests)
- ✅ "First Islamic Bookstore in the World" branding

## Subscription Tiers
| Tier | Name | Price | Book Limit | Ship-to-Scan |
|------|------|-------|------------|--------------|
| 1 | Basic | $25/mo | 15 | No |
| 2 | Standard | $35/mo | 35 | No |
| 3 | Advanced | $50/mo | 60 | No |
| 4 | Premium | $60/mo | 75 | Yes |
| 5 | Unlimited | $75/mo | Unlimited | Yes |

## Prioritized Backlog
### P0 (Critical)
- Add sample books to database for demonstration

### P1 (High Priority)
- Email notifications for scan request status
- User account settings page
- Cancel subscription functionality

### P2 (Medium Priority)
- Mobile PWA manifest
- Offline book reading
- Reading progress tracking
- Book recommendations

## Next Tasks
1. Add sample books via admin dashboard
2. Test full payment flow with Stripe
3. Upload book covers and PDFs
4. User acceptance testing
