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
 * Check if purchases should be disabled (iOS App Store compliance)
 * Returns true for iOS native app - users must purchase on website
 */
export const shouldDisablePurchases = () => {
  return isIOSNativeApp();
};

/**
 * Get the website URL for purchases
 */
export const getWebsiteUrl = () => {
  return 'https://duskitab.com';
};

/**
 * Open the website for purchasing
 */
export const openWebsiteForPurchase = (path = '/pricing') => {
  const url = `${getWebsiteUrl()}${path}`;
  window.open(url, '_blank');
};
