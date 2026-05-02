import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Check if running on iOS native app
 */
export const isIOS = () => {
  try {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    return isNative && platform === 'ios';
  } catch (e) {
    return false;
  }
};

/**
 * Check if running on any native platform
 */
export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

/**
 * Open URL - On iOS, opens in external Safari browser
 * On other platforms, uses normal navigation
 */
export const openPaymentUrl = async (url) => {
  if (isIOS()) {
    try {
      // On iOS, open in external Safari browser (required by Apple for payments)
      await Browser.open({ 
        url, 
        windowName: '_system',  // Forces external browser
        presentationStyle: 'fullscreen'
      });
      return { opened: true, external: true };
    } catch (error) {
      console.error('Failed to open external browser:', error);
      // Fallback to window.open with _system target
      window.open(url, '_system');
      return { opened: true, external: true };
    }
  } else {
    // On web and Android, navigate normally (in-app is fine)
    window.location.href = url;
    return { opened: true, external: false };
  }
};
