import { Capacitor } from '@capacitor/core';

// Apple Product IDs matching backend
export const APPLE_PRODUCT_IDS = {
  1: 'com.darussalam.kitabcloud.basic.monthly',
  2: 'com.darussalam.kitabcloud.standard.monthly',
  3: 'com.darussalam.kitabcloud.advanced.monthly',
  4: 'com.darussalam.kitabcloud.premium.monthly',
};

// Check if running on iOS native app
export const isIOS = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

// Check if running on any native platform
export const isNative = () => {
  return Capacitor.isNativePlatform();
};

// StoreKit service for iOS in-app purchases
class StoreKitService {
  constructor() {
    this.products = [];
    this.isInitialized = false;
  }

  // Initialize StoreKit (called when app starts on iOS)
  async initialize() {
    if (!isIOS()) {
      console.log('StoreKit: Not on iOS, skipping initialization');
      return false;
    }

    try {
      // Check if StoreKit plugin is available
      const { StoreKit } = await import('@capacitor/core').then(m => m.registerPlugin('StoreKit'));
      this.storeKit = StoreKit;
      
      // Load products
      const result = await this.storeKit.loadProducts();
      this.products = result.products || [];
      this.isInitialized = true;
      
      console.log('StoreKit initialized with products:', this.products);
      return true;
    } catch (error) {
      console.error('StoreKit initialization failed:', error);
      return false;
    }
  }

  // Get available subscription products
  getProducts() {
    return this.products;
  }

  // Get product by tier
  getProductForTier(tier) {
    const productId = APPLE_PRODUCT_IDS[tier];
    return this.products.find(p => p.id === productId);
  }

  // Purchase a subscription
  async purchaseSubscription(tier, authToken, apiUrl) {
    if (!isIOS()) {
      throw new Error('StoreKit purchases only available on iOS');
    }

    const productId = APPLE_PRODUCT_IDS[tier];
    if (!productId) {
      throw new Error(`No product ID for tier ${tier}`);
    }

    try {
      // Initiate purchase through native StoreKit
      const result = await this.storeKit.purchaseProduct({ productId });
      
      if (result.success) {
        // Validate purchase with backend
        const validation = await this.validatePurchase(result, authToken, apiUrl);
        return validation;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('StoreKit purchase error:', error);
      throw error;
    }
  }

  // Validate purchase with backend
  async validatePurchase(purchaseResult, authToken, apiUrl) {
    const response = await fetch(`${apiUrl}/api/payments/apple/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        transaction_id: purchaseResult.transactionId,
        original_transaction_id: purchaseResult.originalTransactionId,
        product_id: purchaseResult.productId || APPLE_PRODUCT_IDS[purchaseResult.tier],
        signed_data: purchaseResult.signedData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Validation failed');
    }

    return response.json();
  }

  // Restore purchases
  async restorePurchases(authToken, apiUrl) {
    if (!isIOS()) {
      throw new Error('StoreKit restore only available on iOS');
    }

    try {
      const result = await this.storeKit.restorePurchases();
      
      if (result.transactions && result.transactions.length > 0) {
        // Send restored transactions to backend
        const response = await fetch(`${apiUrl}/api/payments/apple/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(result.transactions.map(t => ({
            transaction_id: t.transactionId,
            original_transaction_id: t.originalTransactionId,
            product_id: t.productId
          })))
        });

        if (!response.ok) {
          throw new Error('Failed to restore purchases on server');
        }

        return response.json();
      }

      return { restored_count: 0, subscriptions: [] };
    } catch (error) {
      console.error('StoreKit restore error:', error);
      throw error;
    }
  }

  // Get subscription status
  async getSubscriptionStatus(authToken, apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/payments/apple/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get subscription status');
      }

      return response.json();
    } catch (error) {
      console.error('StoreKit status error:', error);
      throw error;
    }
  }
}

// Singleton instance
const storeKitService = new StoreKitService();
export default storeKitService;
