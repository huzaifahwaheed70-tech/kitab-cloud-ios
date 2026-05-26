import OneSignal from 'react-onesignal';
import axios from 'axios';

const ONESIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID;
const API = `${process.env.REACT_APP_BACKEND_URL || 'https://kitab-cloud.emergent.host'}/api`;

let isInitialized = false;

/**
 * Initialize OneSignal for push notifications
 * Should be called once when the app loads
 */
export const initializeOneSignal = async () => {
  if (isInitialized || !ONESIGNAL_APP_ID) {
    console.log('[OneSignal] Skipping init - already initialized or no app ID');
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false, // We'll use custom UI
      },
      welcomeNotification: {
        title: 'Kitab Cloud',
        message: 'Thanks for subscribing to notifications!',
      },
    });

    isInitialized = true;
    console.log('[OneSignal] Initialized successfully');

    // Set up permission change handler
    OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
      console.log('[OneSignal] Permission changed:', permission);
    });

    return true;
  } catch (error) {
    console.error('[OneSignal] Initialization error:', error);
    return false;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await OneSignal.Notifications.requestPermission();
    console.log('[OneSignal] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[OneSignal] Permission request error:', error);
    return false;
  }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async () => {
  try {
    const permission = await OneSignal.Notifications.permission;
    return permission;
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
  if (!isInitialized || !ONESIGNAL_APP_ID) {
    console.log('[OneSignal] Not initialized, skipping user setup');
    return;
  }

  try {
    // Set external user ID (links OneSignal subscription to your user)
    await OneSignal.login(userId);
    
    // Set user email
    if (email) {
      await OneSignal.User.addEmail(email);
    }
    
    // Set tags for targeting
    await OneSignal.User.addTags({
      subscription_tier: String(subscriptionTier || 0),
      is_subscribed: subscriptionTier > 0 ? 'true' : 'false',
      user_id: userId,
    });

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
  if (!isInitialized) return;
  
  try {
    await OneSignal.User.addTags(tags);
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
  if (!isInitialized) return;
  
  try {
    await OneSignal.logout();
    console.log('[OneSignal] User logged out');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error clearing user:', error);
    return false;
  }
};

/**
 * Get the OneSignal Player ID (device token) for the current device
 */
export const getPlayerId = async () => {
  if (!isInitialized) return null;
  
  try {
    const onesignalId = OneSignal.User.onesignalId;
    console.log('[OneSignal] Player ID:', onesignalId);
    return onesignalId;
  } catch (error) {
    console.error('[OneSignal] Error getting player ID:', error);
    return null;
  }
};

/**
 * Register device with backend (for server-side notification tracking)
 */
export const registerDeviceWithBackend = async (token, userId) => {
  try {
    const playerId = await getPlayerId();
    if (!playerId) return;
    
    await axios.post(
      `${API}/notifications/register-device`,
      {
        player_id: playerId,
        user_id: userId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );
    
    console.log('[OneSignal] Device registered with backend');
    return true;
  } catch (error) {
    console.error('[OneSignal] Error registering device:', error);
    return false;
  }
};

export default {
  initializeOneSignal,
  requestNotificationPermission,
  areNotificationsEnabled,
  setUserForNotifications,
  updateUserTags,
  clearUserForNotifications,
  getPlayerId,
  registerDeviceWithBackend,
};
