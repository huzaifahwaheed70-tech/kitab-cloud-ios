import { Capacitor } from '@capacitor/core';

/**
 * Check if running on iOS or iPadOS
 * Note: iPadOS 13+ reports as Mac in user agent, so we need extra checks
 */
export const isIOS = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  
  // Check for iPhone/iPod (these still identify correctly)
  if (/iPhone|iPod/.test(ua) && !window.MSStream) {
    return true;
  }
  
  // Check for iPad - older iPadOS versions
  if (/iPad/.test(ua)) {
    return true;
  }
  
  // iPadOS 13+ identifies as Mac, but has touch support
  // Check if it's a Mac with touch (which means it's actually an iPad)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  
  // Also check for the standalone mode on iOS
  if (navigator.standalone !== undefined) {
    return true;
  }
  
  return false;
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
 * For iOS/iPadOS native app: Returns the URL so caller can show it in a modal
 * For web: Redirects directly
 */
export const openPaymentUrl = async (url) => {
  // For web and Android, just navigate normally
  if (!isIOS() || !isNativeApp()) {
    window.location.href = url;
    return { opened: true, external: false, url: null };
  }
  
  // For iOS/iPadOS native app, return the URL so we can show a modal with a tappable link
  // iOS/iPadOS allows user-tapped links to open externally, but blocks programmatic navigation
  return { opened: false, external: true, url: url, showModal: true };
};
