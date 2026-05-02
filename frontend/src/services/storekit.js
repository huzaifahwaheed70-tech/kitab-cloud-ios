import { Capacitor } from '@capacitor/core';

// Dynamically import the Capacitor Purchases plugin
let CapacitorPurchases = null;

// Apple Product IDs matching backend - Subscriptions
export const APPLE_SUBSCRIPTION_IDS = {
  1: 'com.darussalam.kitabcloud.basic.monthly',
  2: 'com.darussalam.kitabcloud.standard.monthly',
  3: 'com.darussalam.kitabcloud.advanced.monthly',
  4: 'com.darussalam.kitabcloud.premium.monthly',
};

// Check if running on iOS native app
export const isIOS = () => {
  try {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    console.log('StoreKit: Platform check:', { platform, isNative });
    return isNative && platform === 'ios';
  } catch (e) {
    console.log('StoreKit: Platform check error:', e);
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

// Initialize the purchases plugin
async function getPlugin() {
  if (CapacitorPurchases) {
    return CapacitorPurchases;
  }
  
  try {
    const module = await import('@capgo/capacitor-purchases');
    CapacitorPurchases = module.CapacitorPurchases;
    return CapacitorPurchases;
  } catch (e) {
    console.error('Failed to load CapacitorPurchases:', e);
    return null;
  }
}

// StoreKit service for iOS in-app purchases
class StoreKitService {
  constructor() {
    this.products = [];
    this.isInitialized = false;
    this.pluginAvailable = false;
  }

  // Check if plugin is available
  async checkPluginAvailable() {
    if (!isIOS()) {
      console.log('StoreKit: Not on iOS');
      return false;
    }

    try {
      const plugin = await getPlugin();
      if (plugin) {
        this.pluginAvailable = true;
        return true;
      }
    } catch (e) {
      console.error('StoreKit: Plugin check error:', e);
    }
    
    this.pluginAvailable = false;
    return false;
  }

  // Initialize StoreKit
  async initialize() {
    console.log('StoreKit: Initializing...');
    
    if (!isIOS()) {
      console.log('StoreKit: Not on iOS, skipping');
      return false;
    }

    try {
      const plugin = await getPlugin();
      if (!plugin) {
        console.log('StoreKit: Plugin not available');
        return false;
      }

      // Setup the plugin - no API key needed for StoreKit (only for RevenueCat)
      // For pure StoreKit, we just need to load products
      
      // Get all subscription product IDs
      const productIds = Object.values(APPLE_SUBSCRIPTION_IDS);
      
      console.log('StoreKit: Loading products:', productIds);
      
      const result = await plugin.getProducts({ 
        productIdentifiers: productIds 
      });
      
      this.products = result.products || [];
      this.isInitialized = true;
      
      console.log('StoreKit: Loaded products:', this.products);
      return true;
    } catch (error) {
      console.error('StoreKit: Initialization error:', error);
      return false;
    }
  }

  // Get available subscription products
  getProducts() {
    return this.products;
  }

  // Purchase a subscription
  async purchaseSubscription(tier, authToken, apiUrl) {
    console.log('StoreKit: Starting subscription purchase for tier:', tier);
    
    if (!isIOS()) {
      throw new Error('StoreKit is only available on iOS');
    }

    const productId = APPLE_SUBSCRIPTION_IDS[tier];
    if (!productId) {
      throw new Error(`No product ID configured for tier ${tier}`);
    }

    try {
      const plugin = await getPlugin();
      if (!plugin) {
        throw new Error('In-App Purchase plugin not available. Please ensure you have the latest version of the app.');
      }

      console.log('StoreKit: Purchasing product:', productId);
      
      // Make the purchase
      const result = await plugin.purchaseProduct({
        productIdentifier: productId
      });
      
      console.log('StoreKit: Purchase result:', result);

      if (result.transaction) {
        // Validate purchase with backend
        const validation = await this.validatePurchase({
          transactionId: result.transaction.transactionIdentifier,
          originalTransactionId: result.transaction.originalTransactionIdentifier || result.transaction.transactionIdentifier,
          productId: productId
        }, authToken, apiUrl);
        
        return validation;
      } else {
        throw new Error('Purchase did not complete');
      }
    } catch (error) {
      console.error('StoreKit: Purchase error:', error);
      
      if (error.message?.includes('cancel') || error.code === 'USER_CANCELLED' || error.code === 2) {
        throw new Error('User cancelled');
      }
      throw error;
    }
  }

  // Purchase a single PDF
  async purchasePDF(bookId, productId, authToken, apiUrl) {
    console.log('StoreKit: Starting PDF purchase:', { bookId, productId });
    
    if (!isIOS()) {
      throw new Error('StoreKit is only available on iOS');
    }

    try {
      const plugin = await getPlugin();
      if (!plugin) {
        throw new Error('In-App Purchase plugin not available');
      }

      console.log('StoreKit: Purchasing PDF product:', productId);
      
      const result = await plugin.purchaseProduct({
        productIdentifier: productId
      });
      
      console.log('StoreKit: PDF purchase result:', result);

      if (result.transaction) {
        // Validate with backend
        const response = await fetch(`${apiUrl}/api/payments/apple/validate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            transaction_id: result.transaction.transactionIdentifier,
            original_transaction_id: result.transaction.originalTransactionIdentifier || result.transaction.transactionIdentifier,
            product_id: productId,
            book_id: bookId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Validation failed');
        }

        return response.json();
      } else {
        throw new Error('Purchase did not complete');
      }
    } catch (error) {
      console.error('StoreKit: PDF purchase error:', error);
      if (error.message?.includes('cancel') || error.code === 'USER_CANCELLED') {
        throw new Error('User cancelled');
      }
      throw error;
    }
  }

  // Validate purchase with backend
  async validatePurchase(purchaseResult, authToken, apiUrl) {
    console.log('StoreKit: Validating purchase with backend...');
    
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
    console.log('StoreKit: Restoring purchases...');
    
    if (!isIOS()) {
      throw new Error('StoreKit is only available on iOS');
    }

    try {
      const plugin = await getPlugin();
      if (!plugin) {
        throw new Error('Plugin not available');
      }

      const result = await plugin.restoreTransactions();
      console.log('StoreKit: Restore result:', result);
      
      if (result.transactions && result.transactions.length > 0) {
        const response = await fetch(`${apiUrl}/api/payments/apple/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(result.transactions.map(t => ({
            transaction_id: t.transactionIdentifier,
            original_transaction_id: t.originalTransactionIdentifier || t.transactionIdentifier,
            product_id: t.productIdentifier
          })))
        });

        if (!response.ok) {
          throw new Error('Failed to restore purchases on server');
        }

        return response.json();
      }

      return { restored_count: 0, subscriptions: [] };
    } catch (error) {
      console.error('StoreKit: Restore error:', error);
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
      console.error('StoreKit: Status error:', error);
      throw error;
    }
  }
}

// Singleton instance
const storeKitService = new StoreKitService();
export default storeKitService;

// Export for compatibility
export const APPLE_PRODUCT_IDS = APPLE_SUBSCRIPTION_IDS;
