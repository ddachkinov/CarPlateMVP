const webpush = require('web-push');

// Generate VAPID keys if not set:
// npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@carplate.app';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configured with VAPID keys');
} else {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
  console.warn('   Run: npx web-push generate-vapid-keys');
  console.warn('   Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env');
}

/**
 * Send push notification to a single subscription
 * @param {Object} subscription - Push subscription object {endpoint, keys: {p256dh, auth}}
 * @param {Object} payload - Notification data
 * @returns {Promise<boolean>} - Success status
 */
const sendPushNotification = async (subscription, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Cannot send push notification: VAPID keys not configured');
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    // Handle subscription errors (expired, invalid, etc.)
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`📱 Push subscription expired/invalid: ${subscription.endpoint.substring(0, 50)}...`);
      // Return error code so caller can remove subscription
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    console.error('❌ Failed to send push notification:', error.message);
    return false;
  }
};

/**
 * Send push notifications to all of a user's subscriptions
 * @param {Array} pushSubscriptions - Array of push subscription objects
 * @param {Object} notificationData - Notification payload
 * @returns {Promise<Object>} - {sent: number, failed: number, expired: []}
 */
const sendPushToUser = async (pushSubscriptions, notificationData) => {
  if (!pushSubscriptions || pushSubscriptions.length === 0) {
    return { sent: 0, failed: 0, expired: [] };
  }

  const results = {
    sent: 0,
    failed: 0,
    expired: [] // Array of subscription endpoints to remove
  };

  // Send to all devices in parallel
  await Promise.all(
    pushSubscriptions.map(async (sub) => {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        };

        const success = await sendPushNotification(subscription, notificationData);
        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        if (error.message === 'SUBSCRIPTION_EXPIRED') {
          results.expired.push(sub.endpoint);
        } else {
          results.failed++;
        }
      }
    })
  );

  return results;
};

/**
 * Create notification payload for new message
 * @param {Object} message - Message object
 * @param {string} plate - License plate
 * @returns {Object} - Notification payload
 */
const createMessageNotification = (message, plate) => {
  return {
    title: `New message for ${plate}`,
    body: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `message-${message._id}`,
    data: {
      messageId: message._id,
      plate: plate,
      url: '/?tab=inbox' // URL to open when notification is clicked
    },
    actions: [
      {
        action: 'view',
        title: 'View Message'
      }
    ]
  };
};

module.exports = {
  sendPushNotification,
  sendPushToUser,
  createMessageNotification,
  VAPID_PUBLIC_KEY
};
