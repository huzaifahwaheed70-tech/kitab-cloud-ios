# Auth Testing Playbook for Kitab Cloud

## Auth-Gated App Testing Playbook

### Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  subscription_tier: 0,
  is_admin: false,
  created_at: new Date()
});
print('User ID: ' + userId);
print('Email: test.user.' + Date.now() + '@example.com');
"
```

### Step 2: Test Backend API

```bash
# Test login endpoint
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"huzaifahwaheed70@gmail.com","password":"admin123"}'

# Test auth/me with token
TOKEN="<insert_token_from_login>"
curl -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"

# Test Google session exchange (will fail with invalid session)
curl -X POST "$API_URL/api/auth/google/session" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test_invalid"}'
```

### Step 3: Browser Testing

```javascript
// For Playwright tests - Set auth token and navigate
await page.evaluate(() => {
    localStorage.setItem('auth_token', 'YOUR_JWT_TOKEN');
});
await page.goto("https://kitab-cloud.preview.emergentagent.com/library");
```

### Quick Debug

```bash
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
"

# Check for Google-linked users
mongosh --eval "
use('test_database');
db.users.find({google_linked: true}).pretty();
"
```

### Checklist
- [ ] User document has user_id field (custom UUID)
- [ ] All queries use `{"_id": 0}` projection
- [ ] API returns user data (not 401/404)
- [ ] Google button visible on Login page
- [ ] Google button visible on Register page
- [ ] AuthCallback handles session_id in URL hash

### Success Indicators
✅ /api/auth/me returns user data with valid token
✅ /api/auth/google/session returns "Invalid session" for bad session_id
✅ Dashboard loads after successful login
✅ Google button redirects to auth.emergentagent.com

### Failure Indicators
❌ "User not found" errors
❌ 401 Unauthorized responses
❌ Redirect to login page unexpectedly
❌ Google button missing from auth pages

## Test Credentials
- Admin Email: `huzaifahwaheed70@gmail.com`
- Admin Password: `admin123`

## Google OAuth Flow
1. User clicks "Continue with Google"
2. Redirects to `https://auth.emergentagent.com/?redirect=<origin>/library`
3. User authenticates with Google
4. Redirects back to `<origin>/library#session_id=<session_id>`
5. AuthCallback component detects session_id, exchanges it via `/api/auth/google/session`
6. JWT token stored, user redirected to library
