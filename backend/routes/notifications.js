const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { VAPID_PUBLIC_KEY } = require('../services/pushService');

/**
 * GET /api/notifications/vapid-public-key
 * Get the public VAPID key for push notifications
 */
router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }

  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'userId and subscription are required' });
  }

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if subscription already exists
  const existingIndex = user.pushSubscriptions.findIndex(
    sub => sub.endpoint === subscription.endpoint
  );

  if (existingIndex >= 0) {
    // Update existing subscription
    user.pushSubscriptions[existingIndex] = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: req.get('user-agent') || 'Unknown',
      subscribedAt: new Date()
    };
  } else {
    // Add new subscription
    user.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: req.get('user-agent') || 'Unknown',
      subscribedAt: new Date()
    });
  }

  await user.save();

  console.log(`📱 User ${userId} subscribed to push notifications (${user.pushSubscriptions.length} total)`);

  res.json({
    success: true,
    message: 'Subscribed to push notifications',
    subscriptionCount: user.pushSubscriptions.length
  });
}));

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const { userId, endpoint } = req.body;

  if (!userId || !endpoint) {
    return res.status(400).json({ error: 'userId and endpoint are required' });
  }

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Remove the subscription
  const initialLength = user.pushSubscriptions.length;
  user.pushSubscriptions = user.pushSubscriptions.filter(
    sub => sub.endpoint !== endpoint
  );

  if (user.pushSubscriptions.length === initialLength) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  await user.save();

  console.log(`📱 User ${userId} unsubscribed from push notifications (${user.pushSubscriptions.length} remaining)`);

  res.json({
    success: true,
    message: 'Unsubscribed from push notifications',
    subscriptionCount: user.pushSubscriptions.length
  });
}));

/**
 * GET /api/notifications/preferences/:userId
 * Get user's notification preferences
 */
router.get('/preferences/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    push: user.notificationPreferences?.push ?? true,
    email: user.notificationPreferences?.email ?? true,
    emailDelay: user.notificationPreferences?.emailDelay ?? 30,
    subscriptionCount: user.pushSubscriptions.length
  });
}));

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', asyncHandler(async (req, res) => {
  const { userId, push, email, emailDelay } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update preferences
  if (push !== undefined) user.notificationPreferences.push = push;
  if (email !== undefined) user.notificationPreferences.email = email;
  if (emailDelay !== undefined) user.notificationPreferences.emailDelay = emailDelay;

  await user.save();

  console.log(`⚙️  User ${userId} updated notification preferences`);

  res.json({
    success: true,
    preferences: user.notificationPreferences
  });
}));

module.exports = router;
