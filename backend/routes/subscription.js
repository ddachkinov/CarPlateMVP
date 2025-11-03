const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  isConfigured,
  createCheckoutSession,
  createPortalSession,
  verifyWebhook
} = require('../services/stripeService');

// ⚠️ MVP MOCK: Remove this when Stripe is configured
const MOCK_PREMIUM_ENABLED = process.env.MOCK_PREMIUM === 'true';

/**
 * POST /api/subscription/create-checkout-session
 * Create a Stripe checkout session for premium subscription
 *
 * ⚠️ MVP MOCK: Falls back to mock mode if Stripe not configured and MOCK_PREMIUM=true
 */
router.post('/create-checkout-session', asyncHandler(async (req, res) => {
  // ⚠️ MVP MOCK: Allow mock upgrades for testing
  if (!isConfigured() && !MOCK_PREMIUM_ENABLED) {
    return res.status(503).json({ error: 'Premium subscriptions not available' });
  }

  // ⚠️ MVP MOCK: If Stripe not configured but mock enabled, simulate upgrade
  if (!isConfigured() && MOCK_PREMIUM_ENABLED) {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId and email are required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mock: Instantly grant premium
    await User.updateOne(
      { userId },
      {
        premium: true,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        email
      }
    );

    console.log(`🧪 MOCK: Granted premium to user ${userId}`);

    // Return mock success - redirect back to app
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.json({
      sessionId: 'mock_session_' + Date.now(),
      url: `${frontendUrl}?subscription=success&mock=true`
    });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user is already premium
  if (user.premium && user.subscriptionStatus === 'active') {
    return res.status(400).json({ error: 'User already has active premium subscription' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const successUrl = `${frontendUrl}?subscription=success`;
  const cancelUrl = `${frontendUrl}?subscription=canceled`;

  try {
    const session = await createCheckoutSession(userId, email, successUrl, cancelUrl);

    res.json({
      sessionId: session.sessionId,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}));

/**
 * POST /api/subscription/create-portal-session
 * Create a customer portal session for subscription management
 *
 * ⚠️ MVP MOCK: Falls back to mock mode if Stripe not configured and MOCK_PREMIUM=true
 */
router.post('/create-portal-session', asyncHandler(async (req, res) => {
  // ⚠️ MVP MOCK: Allow mock portal for testing
  if (!isConfigured() && !MOCK_PREMIUM_ENABLED) {
    return res.status(503).json({ error: 'Premium subscriptions not available' });
  }

  // ⚠️ MVP MOCK: If Stripe not configured but mock enabled, provide mock portal
  if (!isConfigured() && MOCK_PREMIUM_ENABLED) {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🧪 MOCK: Opening mock portal for user ${userId}`);

    // Return mock portal - just redirect back to profile
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.json({
      url: `${frontendUrl}?mock_portal=true`
    });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer found for this user' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const returnUrl = `${frontendUrl}?tab=profile`;

  try {
    const session = await createPortalSession(user.stripeCustomerId, returnUrl);

    res.json({
      url: session.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}));

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = verifyWebhook(req.body, signature);

    console.log(`📥 Stripe webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId || session.client_reference_id;

        console.log(`✅ Checkout completed for user: ${userId}`);

        // Update user with customer ID
        await User.updateOne(
          { userId },
          {
            stripeCustomerId: session.customer,
            email: session.customer_email
          }
        );
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;

        console.log(`🔄 Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'} for user: ${userId}`);

        // Update user subscription status
        const updates = {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          premium: subscription.status === 'active' || subscription.status === 'trialing',
          subscriptionEndDate: new Date(subscription.current_period_end * 1000)
        };

        await User.updateOne({ userId }, updates);

        console.log(`✅ User ${userId} premium status: ${updates.premium}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;

        console.log(`❌ Subscription deleted for user: ${userId}`);

        // Remove premium status
        await User.updateOne(
          { userId },
          {
            premium: false,
            subscriptionStatus: 'canceled',
            subscriptionEndDate: new Date(subscription.ended_at * 1000)
          }
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        console.log(`⚠️  Payment failed for subscription: ${subscriptionId}`);

        // Update subscription status
        await User.updateOne(
          { stripeSubscriptionId: subscriptionId },
          { subscriptionStatus: 'past_due' }
        );
        break;
      }

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
}));

/**
 * GET /api/subscription/status/:userId
 * Get user's subscription status
 */
router.get('/status/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({ userId });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    premium: user.premium,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEndDate: user.subscriptionEndDate,
    hasStripeCustomer: !!user.stripeCustomerId
  });
}));

// ⚠️ MVP MOCK ENDPOINTS - REMOVE WHEN STRIPE IS CONFIGURED
if (MOCK_PREMIUM_ENABLED) {
  /**
   * POST /api/subscription/mock-toggle-premium
   * Toggle premium status for testing (MOCK ONLY)
   *
   * ⚠️ REMOVE THIS ENDPOINT WHEN STRIPE IS CONFIGURED
   */
  router.post('/mock-toggle-premium', asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle premium status
    const newPremiumStatus = !user.premium;
    await User.updateOne(
      { userId },
      {
        premium: newPremiumStatus,
        subscriptionStatus: newPremiumStatus ? 'active' : null,
        subscriptionEndDate: newPremiumStatus ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      }
    );

    console.log(`🧪 MOCK: Toggled premium for user ${userId} to ${newPremiumStatus}`);

    res.json({
      premium: newPremiumStatus,
      subscriptionStatus: newPremiumStatus ? 'active' : null,
      message: `Premium ${newPremiumStatus ? 'enabled' : 'disabled'} for testing`
    });
  }));

  console.log('⚠️  MOCK PREMIUM ENDPOINTS ENABLED - Remember to disable when Stripe is configured!');
}

module.exports = router;
