import { Capacitor } from '@capacitor/core';

/**
 * Check if running on iOS or iPadOS
 * Note: iPadOS 13+ reports as Mac in user agent, so we need extra checks
 */
export const isIOS = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  
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
  // Using both navigator.platform and navigator.userAgentData for broader compatibility
  const isMacWithTouch = (
    (navigator.platform === 'MacIntel' || navigator.platform === 'iPad') && 
    navigator.maxTouchPoints > 1
  );
  if (isMacWithTouch) {
    return true;
  }
  
  // Additional check: navigator.userAgentData for newer browsers (Chrome/Edge on iPad)
  if (navigator.userAgentData?.platform === 'macOS' && navigator.maxTouchPoints > 1) {
    return true;
  }
  
  // Check for Macintosh with touch - another iPadOS identifier
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) {
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
 * For iOS/iPadOS (both native app AND web view): Returns the URL so caller can show a modal
 * The modal contains a real <a> tag that users must tap - this bypasses Apple's restriction
 * on programmatic window.open/location.href in WebViews
 * For web (non-iOS): Redirects directly
 */
export const openPaymentUrl = async (url) => {
  const iosDevice = isIOS();
  const nativeApp = isNativeApp();
  
  // Debug logging for troubleshooting
  console.log('[Browser Detection]', {
    isIOS: iosDevice,
    isNativeApp: nativeApp,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: navigator.standalone
  });
  
  // For iOS/iPadOS in native Capacitor app, ALWAYS show the modal
  // Apple WebView blocks programmatic navigation, so we need user-initiated tap
  if (iosDevice && nativeApp) {
    console.log('[Browser] iOS native app detected - showing payment modal');
    return { opened: false, external: true, url: url, showModal: true };
  }
  
  // For regular web browsers (including iOS Safari standalone), redirect normally
  window.location.href = url;
  return { opened: true, external: false, url: null };
};
