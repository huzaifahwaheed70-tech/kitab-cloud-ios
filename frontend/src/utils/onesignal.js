import { Capacitor } from '@capacitor/core';

const ONESIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID || '31bf8b91-fdf9-427b-8908-9e52914d6d11';

let isInitialized = false;
let OneSignalWeb = null;
let OneSignalNative = null;

/**
 * Check if running in native app
 */
const checkIsNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

/**
 * Initialize OneSignal for push notifications
 * Uses Capacitor plugin for native apps, react-onesignal for web
 */
export const initializeOneSignal = async () => {
  if (isInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }
  
  if (!ONESIGNAL_APP_ID) {
    console.log('[OneSignal] No app ID configured');
    return false;
  }

  const isNative = checkIsNative();
  console.log('[OneSignal] Platform detection - isNative:', isNative, 'platform:', Capacitor.getPlatform());

  try {
    if (isNative) {
      // Native app - use Capacitor plugin
      console.log('[OneSignal] Initializing native plugin...');
      const { OneSignal } = await import('@onesignal/capacitor-plugin');
      OneSignalNative = OneSignal;
      
      // Initialize OneSignal with app ID
      console.log('[OneSignal] Calling initialize with app ID:', ONESIGNAL_APP_ID);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      
      // Request permission (iOS will show prompt, Android auto-grants)
      console.log('[OneSignal] Checking notification permission...');
      const hasPermission = await OneSignal.Notifications.getPermissionAsync();
      console.log('[OneSignal] Current permission:', hasPermission);
      
      if (!hasPermission) {
        console.log('[OneSignal] Requesting permission...');
        const permissionResult = await OneSignal.Notifications.requestPermission(true);
        console.log('[OneSignal] Permission request result:', permissionResult);
      }
      
      console.log('[OneSignal Native] Initialized successfully');
      isInitialized = true;
      return true;
    } else {
      // Web - use react-onesignal
      console.log('[OneSignal] Initializing web SDK...');
      const ReactOneSignal = await import('react-onesignal');
      OneSignalWeb = ReactOneSignal.default;
      
      await OneSignalWeb.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        },
        welcomeNotification: {
          title: 'Kitab Cloud',
          message: 'Thanks for subscribing to notifications!',
        },
      });

      console.log('[OneSignal Web] Initialized successfully');
      isInitialized = true;
      return true;
    }
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    return false;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async () => {
  const isNative = checkIsNative();
  try {
    if (isNative && OneSignalNative) {
      const result = await OneSignalNative.Notifications.requestPermission(true);
      console.log('[OneSignal Native] Permission result:', result);
      return result;
    } else if (OneSignalWeb) {
      const permission = await OneSignalWeb.Notifications.requestPermission();
      console.log('[OneSignal Web] Permission result:', permission);
      return permission;
    }
    return false;
  } catch (error) {
    console.error('[OneSignal] Permission request error:', error);
    return false;
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async () => {
  const isNative = checkIsNative();
  try {
    if (isNative && OneSignalNative) {
      return await OneSignalNative.Notifications.getPermissionAsync();
    } else if (OneSignalWeb) {
      return OneSignalWeb.Notifications.permission;
    }
    return false;
  } catch (error) {
    console.error('[OneSignal] Error checking permission:', error);
    return false;
  }
};

/**
 * Associate the current user with their OneSignal subscription
 * This allows targeting specific users for notifications
 */
export const setUserForNotifications = async (userId, email, subscriptionTier) => {
  const isNative = checkIsNative();
  if (!isInitialized || !ONESIGNAL_APP_ID) {
    console.log('[OneSignal] Not initialized, skipping user setup');
    return;
  }

  try {
    if (isNative && OneSignalNative) {
      // Native: Set external user ID and tags
      await OneSignalNative.login(userId);
      
      if (email) {
        await OneSignalNative.User.addEmail(email);
      }
      
      await OneSignalNative.User.addTags({
        subscription_tier: String(subscriptionTier || 0),
        is_subscribed: subscriptionTier > 0 ? 'true' : 'false',
        user_id: userId,
      });
    } else if (OneSignalWeb) {
      // Web: Set external user ID and tags
      await OneSignalWeb.login(userId);
      
      if (email) {
        await OneSignalWeb.User.addEmail(email);
      }
      
      await OneSignalWeb.User.addTags({
        subscription_tier: String(subscriptionTier || 0),
        is_subscribed: subscriptionTier > 0 ? 'true' : 'false',
        user_id: userId,
      });
    }

    console.log('[OneSignal] User set:', userId);
    return true;
  } catch (error) {
    console.error('[OneSignal] Error setting user:', error);
    return false;
  }
};

/**
 * Update user tags (e.g., when subscription tier changes)
 */
export const updateUserTags = async (tags) => {
  const isNative = checkIsNative();
  if (!isInitialized) return;
  
  try {
    if (isNative && OneSignalNative) {
      await OneSignalNative.User.addTags(tags);
    } else if (OneSignalWeb) {
      await OneSignalWeb.User.addTags(tags);
    }
    console.log('[OneSignal] Tags updated:', tags);
    return true;
  } catch (error) {
    console.error('[OneSignal] Error updating tags:', error);
    return false;
  }
};

/**
 * Clear user association (on logout)
 */
export const clearUserForNotifications = async () => {
  const isNative = checkIsNative();
  if (!isInitialized) return;
  
  try {
    if (isNative && OneSignalNative) {
      await OneSignalNative.logout();
    } else if (OneSignalWeb) {
      await OneSignalWeb.logout();
    }
    console.log('[OneSignal] User logged out');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error clearing user:', error);
    return false;
  }
};

/**
 * Get the OneSignal ID for the current device
 */
export const getOneSignalId = async () => {
  const isNative = checkIsNative();
  if (!isInitialized) return null;
  
  try {
    if (isNative && OneSignalNative) {
      const id = await OneSignalNative.User.getOnesignalId();
      console.log('[OneSignal Native] ID:', id);
      return id;
    } else if (OneSignalWeb) {
      const id = OneSignalWeb.User.onesignalId;
      console.log('[OneSignal Web] ID:', id);
      return id;
    }
    return null;
  } catch (error) {
    console.error('[OneSignal] Error getting ID:', error);
    return null;
  }
};

export default {
  initializeOneSignal,
  requestNotificationPermission,
  areNotificationsEnabled,
  setUserForNotifications,
  updateUserTags,
  clearUserForNotifications,
  getOneSignalId,
};
