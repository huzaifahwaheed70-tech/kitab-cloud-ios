# Apple StoreKit Integration Instructions

## Overview
This folder contains the native iOS StoreKit plugin files needed for in-app purchases.

## Setup Steps

### 1. App Store Connect Configuration
1. Go to https://appstoreconnect.apple.com
2. Navigate to your app > In-App Purchases
3. Create 4 Auto-Renewable Subscriptions:
   - `com.darussalam.kitabcloud.basic.monthly` - $20/month
   - `com.darussalam.kitabcloud.standard.monthly` - $40/month
   - `com.darussalam.kitabcloud.advanced.monthly` - $60/month
   - `com.darussalam.kitabcloud.premium.monthly` - $80/month
4. Create a Subscription Group (e.g., "Kitab Cloud Subscriptions")
5. Add all subscriptions to this group

### 2. Server Notifications
1. In App Store Connect > App Information > App Store Server Notifications
2. Set Production URL: `https://your-domain.com/api/webhook/apple`
3. Set Sandbox URL: `https://your-domain.com/api/webhook/apple`

### 3. Generate API Key (for server-side validation)
1. Go to Users and Access > Integrations > In-App Purchase
2. Generate a new key
3. Download the .p8 file
4. Note the Key ID and Issuer ID
5. Add to your backend .env:
   ```
   APPLE_KEY_ID=your_key_id
   APPLE_ISSUER_ID=your_issuer_id
   APPLE_PRIVATE_KEY=contents_of_p8_file
   APPLE_ENVIRONMENT=sandbox  # or production
   APPLE_BUNDLE_ID=com.darussalam.kitabcloud
   ```

### 4. Add Plugin to Xcode Project
After running `npx cap sync ios`:

1. Open `ios/App/App.xcworkspace` in Xcode
2. Copy these files to `ios/App/App/`:
   - `StoreKitPlugin.swift`
   - `StoreKitPlugin.m`
3. Add them to the App target
4. In `ios/App/App/AppDelegate.swift`, add import and registration (if needed)

### 5. Enable In-App Purchase Capability
1. In Xcode, select your project
2. Go to Signing & Capabilities
3. Click "+ Capability"
4. Add "In-App Purchase"

### 6. Testing
- Use Sandbox testers (create in App Store Connect > Users and Access > Sandbox)
- Test purchases in TestFlight or on a physical device
- Sandbox transactions are free and can be tested repeatedly

## File Descriptions

### StoreKitPlugin.swift
The main Swift implementation using StoreKit 2 API:
- `loadProducts()` - Fetches available subscription products
- `purchaseProduct(productId)` - Initiates purchase flow
- `restorePurchases()` - Restores previous purchases
- `getSubscriptionStatus()` - Checks active subscriptions

### StoreKitPlugin.m
Objective-C bridge file required by Capacitor to expose the Swift plugin to JavaScript.

## Frontend Usage

```javascript
import { Capacitor, registerPlugin } from '@capacitor/core';

const StoreKit = registerPlugin('StoreKit');

// Check if on iOS
if (Capacitor.getPlatform() === 'ios') {
  // Load products
  const { products } = await StoreKit.loadProducts();
  
  // Purchase
  const result = await StoreKit.purchaseProduct({ productId: 'com.darussalam.kitabcloud.basic.monthly' });
  
  // Then validate with backend
  await fetch('/api/payments/apple/validate', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: result.transactionId,
      original_transaction_id: result.originalTransactionId,
      product_id: result.productId
    })
  });
}
```
