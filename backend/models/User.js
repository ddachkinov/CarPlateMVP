const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },   // Plate verification status (remains false until verified)
  trustScore: { type: Number, default: 100 },    // Trust score (decreases with reports, auto-block at <50)
  blocked: { type: Boolean, default: false },     // User blocked due to low trust score or admin action
  blockedReason: { type: String },               // Reason for blocking
  blockedAt: { type: Date },                     // When user was blocked
  createdAt: { type: Date, default: Date.now },
  nickname: { type: String, default: '' },       // User's chosen display name
  premium: { type: Boolean, default: false },    // Premium subscriber flag
  showPlate: { type: Boolean, default: false },  // If true, reveal user's plate when sending messages
  email: { type: String },                       // User's email for notifications
  emailVerified: { type: Boolean, default: false }, // Email verification status
  notificationPreference: { type: String, enum: ['email', 'none'], default: 'email' }, // How user wants to receive notifications

  // Stripe/Subscription fields
  stripeCustomerId: { type: String },            // Stripe customer ID
  stripeSubscriptionId: { type: String },        // Stripe subscription ID
  subscriptionStatus: {                          // active | canceled | past_due | trialing
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'],
    default: null
  },
  subscriptionEndDate: { type: Date }            // When subscription ends/renews
});

module.exports = mongoose.model('User', userSchema);

