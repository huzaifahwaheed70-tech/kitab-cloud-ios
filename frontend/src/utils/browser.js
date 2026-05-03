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
 * For iOS native app: Returns the URL so caller can show it in a modal
 * For web: Redirects directly
 */
export const openPaymentUrl = async (url) => {
  // For web and Android, just navigate normally
  if (!isIOS() || !isNativeApp()) {
    window.location.href = url;
    return { opened: true, external: false, url: null };
  }
  
  // For iOS native app, return the URL so we can show a modal with a tappable link
  // iOS allows user-tapped links to open externally, but blocks programmatic navigation
  return { opened: false, external: true, url: url, showModal: true };
};
