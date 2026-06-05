import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const REVENUECAT_IOS_API_KEY = 'appl_ektcemLtYrefFQBihwgtwStQpKB';

let isInitialized = false;

// Product ID to tier mapping
const PRODUCT_TO_TIER = {
  'kitab_tier_1_monthly': 1,
  'kitab_tier_2_monthly': 2,
  'kitab_tier_3_monthly': 3,
  'kitab_tier_4_monthly': 4,
};

// Tier to product ID mapping
const TIER_TO_PRODUCT = {
  1: 'kitab_tier_1_monthly',
  2: 'kitab_tier_2_monthly',
  3: 'kitab_tier_3_monthly',
  4: 'kitab_tier_4_monthly',
};

/**
 * Check if running on iOS native app
 */
export const isIOSNative = () => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  } catch (e) {
    return false;
  }
};

/**
 * Initialize RevenueCat SDK (iOS only)
 */
export const initializeRevenueCat = async () => {
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return true;
  }

  if (!isIOSNative()) {
    console.log('[RevenueCat] Not iOS native, skipping initialization');
    return false;
  }

  try {
    console.log('[RevenueCat] Initializing...');
    
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    await Purchases.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
    });

    isInitialized = true;
    console.log('[RevenueCat] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[RevenueCat] Initialization error:', error);
    return false;
  }
};

/**
 * Set the user ID for RevenueCat (call after user logs in)
 */
export const setRevenueCatUser = async (userId) => {
  if (!isInitialized || !isIOSNative()) return;

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('[RevenueCat] User logged in:', userId);
  } catch (error) {
    console.error('[RevenueCat] Error setting user:', error);
  }
};

/**
 * Clear RevenueCat user (call on logout)
 */
export const clearRevenueCatUser = async () => {
  if (!isInitialized || !isIOSNative()) return;

  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
  } catch (error) {
    console.error('[RevenueCat] Error logging out:', error);
  }
};

/**
 * Get available subscription packages
 */
export const getSubscriptionPackages = async () => {
  if (!isInitialized || !isIOSNative()) {
    console.log('[RevenueCat] Not initialized or not iOS');
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[RevenueCat] Offerings:', offerings);

    if (offerings.current && offerings.current.availablePackages) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.error('[RevenueCat] Error getting offerings:', error);
    return [];
  }
};

/**
 * Purchase a subscription by tier number
 */
export const purchaseSubscription = async (tier) => {
  if (!isInitialized || !isIOSNative()) {
    throw new Error('RevenueCat not available');
  }

  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current || !offerings.current.availablePackages) {
      throw new Error('No offerings available');
    }

    // Find the package for the requested tier
    const productId = TIER_TO_PRODUCT[tier];
    const targetPackage = offerings.current.availablePackages.find(
      pkg => pkg.product.identifier === productId
    );

    if (!targetPackage) {
      throw new Error(`No package found for tier ${tier}`);
    }

    console.log('[RevenueCat] Purchasing package:', targetPackage);
    
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: targetPackage 
    });

    console.log('[RevenueCat] Purchase successful:', customerInfo);
    
    // Determine the tier from active entitlements
    const purchasedTier = getActiveTier(customerInfo);
    
    return {
      success: true,
      tier: purchasedTier,
      customerInfo
    };
  } catch (error) {
    console.error('[RevenueCat] Purchase error:', error);
    
    // Check if user cancelled
    if (error.code === 1 || error.message?.includes('cancelled')) {
      return { success: false, cancelled: true };
    }
    
    throw error;
  }
};

/**
 * Get the active subscription tier from customer info
 */
export const getActiveTier = (customerInfo) => {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return 0;
  }

  const activeEntitlements = customerInfo.entitlements.active;
  
  // Check each tier (highest first)
  for (let tier = 4; tier >= 1; tier--) {
    if (activeEntitlements[`tier_${tier}`]) {
      return tier;
    }
  }
  
  return 0;
};

/**
 * Get current customer info and subscription status
 */
export const getCustomerInfo = async () => {
  if (!isInitialized || !isIOSNative()) {
    return null;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Error getting customer info:', error);
    return null;
  }
};

/**
 * Check if user has an active subscription
 */
export const hasActiveSubscription = async () => {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;
  
  return getActiveTier(customerInfo) > 0;
};

/**
 * Restore purchases (useful if user reinstalls app)
 */
export const restorePurchases = async () => {
  if (!isInitialized || !isIOSNative()) {
    throw new Error('RevenueCat not available');
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const tier = getActiveTier(customerInfo);
    
    return {
      success: true,
      tier,
      customerInfo
    };
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error);
    throw error;
  }
};

export default {
  isIOSNative,
  initializeRevenueCat,
  setRevenueCatUser,
  clearRevenueCatUser,
  getSubscriptionPackages,
  purchaseSubscription,
  getActiveTier,
  getCustomerInfo,
  hasActiveSubscription,
  restorePurchases,
};
