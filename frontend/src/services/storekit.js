/**
 * StoreKit Service for Apple In-App Purchases
 * Uses @capgo/native-purchases for iOS StoreKit 2
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
    this.NativePurchases = null;
    this.PURCHASE_TYPE = null;
    this.initialized = false;
    this.products = {};
  }

  /**
   * Check if we're running on iOS native app
   */
  isIOSNativeApp() {
    try {
      return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    } catch (e) {
      return false;
    }
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
      const module = await import('@capgo/native-purchases');
      this.NativePurchases = module.NativePurchases;
      this.PURCHASE_TYPE = module.PURCHASE_TYPE;
      
      // Check if billing is supported
      const { isBillingSupported } = await this.NativePurchases.isBillingSupported();
      if (!isBillingSupported) {
        console.error('[StoreKit] Billing not supported on this device');
        return false;
      }

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
  async fetchProducts(productIds, type = 'SUBS') {
    if (!this.isIOSNativeApp()) {
      return [];
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.NativePurchases) {
      console.error('[StoreKit] Plugin not available');
      return [];
    }

    try {
      const purchaseType = type === 'SUBS' ? this.PURCHASE_TYPE.SUBS : this.PURCHASE_TYPE.INAPP;
      
      const { products } = await this.NativePurchases.getProducts({
        productIdentifiers: productIds,
        productType: purchaseType
      });
      
      // Cache products
      products.forEach(product => {
        this.products[product.productIdentifier] = product;
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
    return this.fetchProducts(subscriptionIds, 'SUBS');
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
    
    const products = await this.fetchProducts([productId], 'INAPP');
    return products.length > 0 ? products[0] : null;
  }

  /**
   * Purchase a subscription
   */
  async purchaseSubscription(tier) {
    if (!this.isIOSNativeApp()) {
      throw new Error('StoreKit not available');
    }

    // Ensure initialized
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult) {
        throw new Error('StoreKit initialization failed');
      }
    }

    const productId = SUBSCRIPTION_PRODUCTS[tier];
    if (!productId) {
      throw new Error(`Invalid subscription tier: ${tier}`);
    }

    try {
      console.log('[StoreKit] Purchasing subscription:', productId);
      
      const result = await this.NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: this.PURCHASE_TYPE.SUBS
      });

      console.log('[StoreKit] Purchase result:', result);

      // Return the transaction for backend verification
      return {
        success: true,
        productId: productId,
        transactionId: result.transactionId || result.transaction?.transactionIdentifier,
        receipt: result.receipt || '',
      };
    } catch (error) {
      console.error('[StoreKit] Purchase failed:', error);
      
      // Check if user cancelled
      if (error.code === 'USER_CANCELLED' || 
          error.message?.includes('cancelled') || 
          error.message?.includes('canceled')) {
        throw new Error('Purchase cancelled');
      }
      
      throw error;
    }
  }

  /**
   * Purchase a book (non-consumable)
   */
  async purchaseBook(darussalamCode) {
    if (!this.isIOSNativeApp()) {
      throw new Error('StoreKit not available');
    }

    // Ensure initialized
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult) {
        throw new Error('StoreKit initialization failed');
      }
    }

    const productId = BOOK_PRODUCT_IDS[darussalamCode];
    if (!productId) {
      throw new Error(`No Apple product ID for book: ${darussalamCode}`);
    }

    try {
      console.log('[StoreKit] Purchasing book:', productId);
      
      const result = await this.NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: this.PURCHASE_TYPE.INAPP
      });

      console.log('[StoreKit] Book purchase result:', result);

      return {
        success: true,
        productId: productId,
        transactionId: result.transactionId || result.transaction?.transactionIdentifier,
        receipt: result.receipt || '',
      };
    } catch (error) {
      console.error('[StoreKit] Book purchase failed:', error);
      
      if (error.code === 'USER_CANCELLED' || 
          error.message?.includes('cancelled') ||
          error.message?.includes('canceled')) {
        throw new Error('Purchase cancelled');
      }
      
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases() {
    if (!this.isIOSNativeApp()) {
      throw new Error('StoreKit not available');
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.NativePurchases) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const result = await this.NativePurchases.restorePurchases();
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
    if (!this.isIOSNativeApp()) {
      return [];
    }

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.NativePurchases) {
      return [];
    }

    try {
      const { transactions } = await this.NativePurchases.getLatestTransaction({
        productIdentifier: Object.values(SUBSCRIPTION_PRODUCTS)[0]
      });
      return transactions || [];
    } catch (error) {
      console.error('[StoreKit] Failed to get active subscriptions:', error);
      return [];
    }
  }

  /**
   * Format price for display
   */
  formatPrice(product) {
    if (!product) return '';
    return product.priceString || product.localizedPrice || `$${product.price}`;
  }
}

// Singleton instance
export const storeKitService = new StoreKitService();
export default storeKitService;
