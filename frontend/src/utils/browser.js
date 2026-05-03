import { Capacitor, registerPlugin } from '@capacitor/core';

// Register the custom native plugin
const ExternalBrowser = registerPlugin('ExternalBrowser');

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
 * Open URL in the device's DEFAULT external browser
 * On iOS: Uses native UIApplication.shared.open() to open in Safari/Brave/Chrome
 * On web: Normal redirect
 */
export const openPaymentUrl = async (url) => {
  // For iOS native app, use our custom native plugin
  if (isIOS() && isNativeApp()) {
    try {
      // Call native Swift code that uses UIApplication.shared.open()
      // This opens in the user's default browser (Safari, Brave, Chrome, etc.)
      await ExternalBrowser.openUrl({ url: url });
      return { opened: true, external: true };
    } catch (error) {
      console.error('Native ExternalBrowser failed:', error);
      
      // Fallback: try anchor click method
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => document.body.removeChild(anchor), 100);
      return { opened: true, external: true };
    }
  }
  
  // For web and Android, just navigate normally
  window.location.href = url;
  return { opened: true, external: false };
};
