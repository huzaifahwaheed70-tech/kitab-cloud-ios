# Test Credentials for Kitab Cloud

## Admin Account
- **Email:** huzaifahwaheed70@gmail.com
- **Password:** admin123
- **Role:** Admin (is_admin: true)
- **Subscription Tier:** 4 (Premium)

## Test User Accounts
N/A - Create via registration or Google OAuth

## Google OAuth
- Google OAuth is integrated via Emergent-managed Google Auth
- Users can sign up/login with any Google account
- No test Google accounts are pre-configured
- Google-linked users have `google_linked: true` flag in database

## API Testing
```bash
# Login to get token
API_URL=https://kitab-cloud.preview.emergentagent.com
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"huzaifahwaheed70@gmail.com","password":"admin123"}'

# Use token for protected endpoints
TOKEN="<token_from_login>"
curl -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

## Guest Mode
- No credentials needed
- Click "Continue as Guest" on login/register page
- Limited browsing capabilities (cannot purchase or subscribe)
