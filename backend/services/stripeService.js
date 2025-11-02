const Stripe = require('stripe');

// Initialize Stripe
let stripe = null;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found. Premium features disabled.');
}

/**
 * Check if Stripe is configured
 */
const isConfigured = () => {
  return stripe !== null;
};

/**
 * Premium subscription price
 * Price ID should be created in Stripe Dashboard
 * For testing, use a test price ID
 */
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly';

/**
 * Create a Stripe checkout session for premium subscription
 * @param {string} userId - User ID from our system
 * @param {string} email - User's email
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if user cancels
 * @returns {Promise<Object>} - Checkout session with URL
 */
const createCheckoutSession = async (userId, email, successUrl, cancelUrl) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      client_reference_id: userId, // Store our user ID for webhook processing
      metadata: {
        userId: userId
      },
      subscription_data: {
        metadata: {
          userId: userId
        }
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Create a customer portal session for subscription management
 * @param {string} customerId - Stripe customer ID
 * @param {string} returnUrl - URL to return to after managing subscription
 * @returns {Promise<Object>} - Portal session with URL
 */
const createPortalSession = async (customerId, returnUrl) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return {
      url: session.url
    };
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

/**
 * Verify Stripe webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} - Verified event object
 */
const verifyWebhook = (payload, signature) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw error;
  }
};

/**
 * Get subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} - Subscription details
 */
const getSubscription = async (subscriptionId) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
};

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} - Cancelled subscription
 */
const cancelSubscription = async (subscriptionId) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

module.exports = {
  isConfigured,
  createCheckoutSession,
  createPortalSession,
  verifyWebhook,
  getSubscription,
  cancelSubscription,
  PREMIUM_PRICE_ID
};
