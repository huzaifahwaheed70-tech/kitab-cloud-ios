import { Capacitor } from '@capacitor/core';

/**
 * Check if running on iOS
 */
export const isIOS = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
};

/**
 * Check if running in a native Capacitor app
 */
export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

/**
 * Open URL in EXTERNAL browser (actual Safari app, not in-app browser)
 * On iOS native app: Opens in Safari app using Capacitor App plugin
 * On web: Normal redirect
 */
export const openPaymentUrl = async (url) => {
  // For iOS native app, use Capacitor App plugin to open in external Safari
  if (isIOS() && isNativeApp()) {
    try {
      // Import and use the App plugin to open URL in external browser
      const { App } = await import('@capacitor/app');
      
      // This opens the URL in the actual Safari app (external browser)
      await App.openUrl({ url: url });
      return { opened: true, external: true };
    } catch (error) {
      console.error('Capacitor App.openUrl failed:', error);
      
      // Fallback: try using the Browser plugin
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: url });
        return { opened: true, external: true };
      } catch (e2) {
        console.error('Browser.open also failed:', e2);
        // Last resort fallback
        window.location.href = url;
        return { opened: true, external: false };
      }
    }
  }
  
  // For web and Android, just navigate normally
  window.location.href = url;
  return { opened: true, external: false };
};
