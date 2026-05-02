/**
 * Check if running on iOS (native app or Safari)
 */
export const isIOS = () => {
  // Check user agent for iOS
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
};

/**
 * Check if running inside a WebView (Capacitor/Cordova app)
 */
export const isWebView = () => {
  const ua = navigator.userAgent || '';
  // Check for common WebView indicators
  return (
    ua.includes('wv') || // Android WebView
    (isIOS() && !ua.includes('Safari')) || // iOS WebView (no Safari in UA)
    window.webkit?.messageHandlers || // iOS WKWebView
    window.ReactNativeWebView || // React Native
    document.documentElement.classList.contains('capacitor') // Capacitor
  );
};

/**
 * Open URL in external browser on iOS WebView
 * On other platforms, uses normal navigation
 */
export const openPaymentUrl = async (url) => {
  // For iOS (both native and WebView), open in external browser
  if (isIOS()) {
    // Try multiple methods to ensure it opens in Safari
    
    // Method 1: Try Capacitor Browser plugin if available
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return { opened: true, external: true };
    } catch (e) {
      // Capacitor not available, continue to fallbacks
    }
    
    // Method 2: Use window.open with _blank (often opens Safari on iOS)
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      return { opened: true, external: true };
    }
    
    // Method 3: Direct location change as last resort
    window.location.href = url;
    return { opened: true, external: false };
  }
  
  // For web and Android, just navigate normally
  window.location.href = url;
  return { opened: true, external: false };
};
