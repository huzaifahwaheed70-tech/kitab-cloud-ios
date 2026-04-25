import { Capacitor, registerPlugin } from '@capacitor/core';

// Apple Product IDs matching backend - Subscriptions
export const APPLE_SUBSCRIPTION_IDS = {
  1: 'com.darussalam.kitabcloud.basic.monthly',
  2: 'com.darussalam.kitabcloud.standard.monthly',
  3: 'com.darussalam.kitabcloud.advanced.monthly',
  4: 'com.darussalam.kitabcloud.premium.monthly',
};

// Reverse lookup for subscriptions
export const TIER_FROM_PRODUCT_ID = {
  'com.darussalam.kitabcloud.basic.monthly': 1,
  'com.darussalam.kitabcloud.standard.monthly': 2,
  'com.darussalam.kitabcloud.advanced.monthly': 3,
  'com.darussalam.kitabcloud.premium.monthly': 4,
};

// Check if running on iOS native app
export const isIOS = () => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch (e) {
    return false;
  }
};

// Check if running on any native platform
export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

// StoreKit service for iOS in-app purchases
class StoreKitService {
  constructor() {
    this.products = [];
    this.isInitialized = false;
    this.storeKit = null;
  }

  // Get the native plugin (lazy initialization)
  async getPlugin() {
    if (this.storeKit) {
      return this.storeKit;
    }

    if (!isIOS()) {
      console.log('StoreKit: Not on iOS');
      return null;
    }

    try {
      this.storeKit = registerPlugin('StoreKit');
      return this.storeKit;
    } catch (e) {
      console.error('StoreKit plugin registration failed:', e);
      return null;
    }
  }

  // Initialize StoreKit (called when app starts on iOS)
  async initialize() {
    const plugin = await this.getPlugin();
    if (!plugin) {
      return false;
    }

    try {
      const result = await plugin.loadProducts();
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
    const productId = APPLE_SUBSCRIPTION_IDS[tier];
    return this.products.find(p => p.id === productId);
  }

  // Purchase a subscription
  async purchaseSubscription(tier, authToken, apiUrl) {
    const plugin = await this.getPlugin();
    if (!plugin) {
      throw new Error('StoreKit not available. Please make sure you are using the iOS app.');
    }

    const productId = APPLE_SUBSCRIPTION_IDS[tier];
    if (!productId) {
      throw new Error(`No product ID for tier ${tier}`);
    }

    try {
      console.log('Purchasing subscription:', productId);
      
      // Initiate purchase through native StoreKit
      const result = await plugin.purchaseProduct({ productId });
      
      console.log('Purchase result:', result);

      if (result.transactionId) {
        // Validate purchase with backend
        const validation = await this.validatePurchase({
          transactionId: result.transactionId,
          originalTransactionId: result.originalTransactionId,
          productId: result.productId || productId
        }, authToken, apiUrl);
        return validation;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('StoreKit purchase error:', error);
      // Check for user cancellation
      if (error.code === 'USER_CANCELLED' || error.message?.includes('cancelled') || error.message?.includes('cancel')) {
        throw new Error('User cancelled');
      }
      throw error;
    }
  }

  // Purchase a single PDF (non-consumable)
  async purchasePDF(bookId, productId, authToken, apiUrl) {
    const plugin = await this.getPlugin();
    if (!plugin) {
      throw new Error('StoreKit not available. Please make sure you are using the iOS app.');
    }

    try {
      console.log('Purchasing PDF:', productId);
      
      // Initiate purchase through native StoreKit
      const result = await plugin.purchaseProduct({ productId });
      
      console.log('Purchase result:', result);

      if (result.transactionId) {
        // Validate purchase with backend
        const response = await fetch(`${apiUrl}/api/payments/apple/validate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            transaction_id: result.transactionId,
            original_transaction_id: result.originalTransactionId,
            product_id: result.productId || productId,
            book_id: bookId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Validation failed');
        }

        return response.json();
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('StoreKit PDF purchase error:', error);
      if (error.code === 'USER_CANCELLED' || error.message?.includes('cancelled')) {
        throw new Error('User cancelled');
      }
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
        product_id: purchaseResult.productId
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
    const plugin = await this.getPlugin();
    if (!plugin) {
      throw new Error('StoreKit not available');
    }

    try {
      const result = await plugin.restorePurchases();
      
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

  // Get native subscription status
  async getNativeSubscriptionStatus() {
    const plugin = await this.getPlugin();
    if (!plugin) {
      return { hasActiveSubscription: false, subscriptions: [] };
    }

    try {
      return await plugin.getSubscriptionStatus();
    } catch (error) {
      console.error('StoreKit status error:', error);
      return { hasActiveSubscription: false, subscriptions: [] };
    }
  }

  // Get subscription status from backend
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

// Also export for legacy compatibility
export const APPLE_PRODUCT_IDS = APPLE_SUBSCRIPTION_IDS;
