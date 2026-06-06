import { Capacitor } from '@capacitor/core';

/**
 * Check if running in iOS native Capacitor app
 */
export const isIOSNativeApp = () => {
  try {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    return isNative && platform === 'ios';
  } catch (e) {
    return false;
  }
};

/**
 * Check if running in any native Capacitor app (iOS or Android)
 */
export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

/**
 * Check if external purchases (PDF, physical books) should be hidden
 * Returns true for iOS native app - these purchases are NOT allowed on iOS
 * Subscriptions use RevenueCat IAP instead
 */
export const shouldHideExternalPurchases = () => {
  return isIOSNativeApp();
};

/**
 * Check if discount codes should be hidden
 * Returns true for iOS - Apple handles their own discounts via App Store Connect
 */
export const shouldHideDiscounts = () => {
  return isIOSNativeApp();
};

/**
 * Prices CAN be shown on iOS since we use RevenueCat IAP for subscriptions
 * This returns false - prices are always visible
 */
export const shouldHidePrices = () => {
  return false;
};

/**
 * Get the website URL for purchases
 */
export const getWebsiteUrl = () => {
  return 'https://kitab-cloud.emergent.host';
};

/**
 * Open the website for purchasing
 */
export const openWebsiteForPurchase = (path = '/pricing') => {
  const url = `${getWebsiteUrl()}${path}`;
  window.open(url, '_blank');
};
