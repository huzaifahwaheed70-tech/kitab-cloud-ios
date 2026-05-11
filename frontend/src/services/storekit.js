/**
 * StoreKit Service for Apple In-App Purchases
 * Handles subscriptions and one-time book purchases on iOS
 */

import { Capacitor } from '@capacitor/core';

// Product IDs matching App Store Connect
export const SUBSCRIPTION_PRODUCTS = {
  1: 'kitabcloud.basic',      // Tier 1 - Basic
  2: 'kitabcloud.standard',   // Tier 2 - Standard
  3: 'kitabcloud.advanced',   // Tier 3 - Advanced
  4: 'kitabcloud.premium',    // Tier 4 - Premium
};

// Map book darussalam_code to Apple Product ID
export const BOOK_PRODUCT_IDS = {
  'H22': 'H22',
  '133': '133',
  'H03': 'H03',
  'Wastiyyahvolume1': 'Wastiyyahvolume1',
  '242': '242',
  '174': '174',
  'H05': 'H05',
  '172': '172',
  'H232nd': 'H232nd',
  'H235th': 'H235th',
  '100': '100',
  '1332nd': '1332nd',
  'H04': 'H04',
  'RP10': 'RP10',
};

class StoreKitService {
  constructor() {
    this.purchases = null;
    this.initialized = false;
    this.products = {};
  }

  /**
   * Check if we're running on iOS native app
   */
  isIOSNativeApp() {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Initialize the StoreKit plugin
   */
  async initialize() {
    if (!this.isIOSNativeApp()) {
      console.log('[StoreKit] Not on iOS native app, skipping initialization');
      return false;
    }

    if (this.initialized) {
      return true;
    }

    try {
      // Dynamically import the plugin only on iOS
      const { Purchases } = await import('@capgo/capacitor-purchases');
      this.purchases = Purchases;
      
      // Setup purchase listener
      await this.purchases.addListener('purchaseCompleted', (info) => {
        console.log('[StoreKit] Purchase completed:', info);
      });

      await this.purchases.addListener('purchaseFailed', (info) => {
        console.error('[StoreKit] Purchase failed:', info);
      });

      this.initialized = true;
      console.log('[StoreKit] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[StoreKit] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Fetch available products from App Store
   */
  async fetchProducts(productIds) {
    if (!this.isIOSNativeApp() || !this.purchases) {
      return [];
    }

    try {
      const { products } = await this.purchases.getProducts({ 
        productIds: productIds 
      });
      
      // Cache products
      products.forEach(product => {
        this.products[product.identifier] = product;
      });

      console.log('[StoreKit] Fetched products:', products);
      return products;
    } catch (error) {
      console.error('[StoreKit] Failed to fetch products:', error);
      return [];
    }
  }

  /**
   * Fetch subscription products
   */
  async fetchSubscriptionProducts() {
    const subscriptionIds = Object.values(SUBSCRIPTION_PRODUCTS);
    return this.fetchProducts(subscriptionIds);
  }

  /**
   * Fetch book product by darussalam code
   */
  async fetchBookProduct(darussalamCode) {
    const productId = BOOK_PRODUCT_IDS[darussalamCode];
    if (!productId) {
      console.warn('[StoreKit] No Apple product ID for book:', darussalamCode);
      return null;
    }
    
    const products = await this.fetchProducts([productId]);
    return products.length > 0 ? products[0] : null;
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(tier) {
    if (!this.isIOSNativeApp() || !this.purchases) {
      throw new Error('StoreKit not available');
    }

    const productId = SUBSCRIPTION_PRODUCTS[tier];
    if (!productId) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    try {
      console.log('[StoreKit] Purchasing subscription:', productId);
      
      const result = await this.purchases.purchaseProduct({
        productIdentifier: productId,
      });

      console.log('[StoreKit] Purchase result:', result);

      // Return the transaction for backend verification
      return {
        success: true,
        productId: productId,
        transactionId: result.transactionIdentifier,
        receipt: result.receipt,
      };
    } catch (error) {
      console.error('[StoreKit] Purchase failed:', error);
      
      // Check if user cancelled
      if (error.code === 'USER_CANCELLED' || error.message?.includes('cancelled')) {
        throw new Error('Purchase cancelled');
      }
      
      throw error;
    }
  }

  /**
   * Purchase a book (non-consumable)
   */
  async purchaseBook(darussalamCode) {
    if (!this.isIOSNativeApp() || !this.purchases) {
      throw new Error('StoreKit not available');
    }

    const productId = BOOK_PRODUCT_IDS[darussalamCode];
    if (!productId) {
      throw new Error(`No Apple product ID for book: ${darussalamCode}`);
    }

    try {
      console.log('[StoreKit] Purchasing book:', productId);
      
      const result = await this.purchases.purchaseProduct({
        productIdentifier: productId,
      });

      console.log('[StoreKit] Book purchase result:', result);

      return {
        success: true,
        productId: productId,
        transactionId: result.transactionIdentifier,
        receipt: result.receipt,
      };
    } catch (error) {
      console.error('[StoreKit] Book purchase failed:', error);
      
      if (error.code === 'USER_CANCELLED' || error.message?.includes('cancelled')) {
        throw new Error('Purchase cancelled');
      }
      
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases() {
    if (!this.isIOSNativeApp() || !this.purchases) {
      throw new Error('StoreKit not available');
    }

    try {
      const result = await this.purchases.restorePurchases();
      console.log('[StoreKit] Restore result:', result);
      return result;
    } catch (error) {
      console.error('[StoreKit] Restore failed:', error);
      throw error;
    }
  }

  /**
   * Get active subscriptions
   */
  async getActiveSubscriptions() {
    if (!this.isIOSNativeApp() || !this.purchases) {
      return [];
    }

    try {
      const { activeSubscriptions } = await this.purchases.getActiveSubscriptions();
      return activeSubscriptions || [];
    } catch (error) {
      console.error('[StoreKit] Failed to get active subscriptions:', error);
      return [];
    }
  }

  /**
   * Get purchased products (books)
   */
  async getPurchasedProducts() {
    if (!this.isIOSNativeApp() || !this.purchases) {
      return [];
    }

    try {
      const { purchasedProducts } = await this.purchases.getPurchasedProducts();
      return purchasedProducts || [];
    } catch (error) {
      console.error('[StoreKit] Failed to get purchased products:', error);
      return [];
    }
  }

  /**
   * Format price for display
   */
  formatPrice(product) {
    if (!product) return '';
    return product.priceString || `$${product.price}`;
  }
}

// Singleton instance
export const storeKitService = new StoreKitService();
export default storeKitService;
