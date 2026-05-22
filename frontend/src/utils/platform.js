import { Capacitor } from '@capacitor/core';

/**
 * Check if running in iOS native Capacitor app
 * Used to hide prices per Apple Reader App guidelines (3.1.1)
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
 * Check if prices should be hidden
 * Returns true for iOS native app (Apple compliance)
 * Returns false for web and Android (prices shown normally)
 */
export const shouldHidePrices = () => {
  return isIOSNativeApp();
};
