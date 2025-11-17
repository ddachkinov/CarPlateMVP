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
  emailVerifiedAt: { type: Date },               // When email was verified

  // Push Notification Settings
  pushSubscriptions: [                           // Array of push notification subscriptions (one per device/browser)
    {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      },
      userAgent: { type: String },               // Browser/device identifier
      subscribedAt: { type: Date, default: Date.now }
    }
  ],
  notificationPreferences: {
    push: { type: Boolean, default: true },      // Enable browser push notifications
    email: { type: Boolean, default: true },     // Enable email notifications
    emailDelay: { type: Number, default: 30 }    // Minutes to wait before sending email fallback (0 = disabled)
  },

  // 🚧 FUTURE: SMS Verification (Tier 2)
  // phoneNumber: { type: String },              // Phone number for SMS verification
  // phoneVerified: { type: Boolean, default: false }, // Phone verification status
  // phoneVerifiedAt: { type: Date },            // When phone was verified

  // 🚧 FUTURE: KYC Verification (Tier 3)
  // kycStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'none'], default: 'none' },
  // kycProvider: { type: String },              // External KYC provider name
  // kycVerifiedAt: { type: Date },              // When KYC was completed
  // kycDocumentType: { type: String },          // Type of document submitted (never store actual document)

  // Stripe/Subscription fields
  stripeCustomerId: { type: String },            // Stripe customer ID
  stripeSubscriptionId: { type: String },        // Stripe subscription ID
  subscriptionStatus: {                          // active | canceled | past_due | trialing
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'],
    default: null
  },
  subscriptionEndDate: { type: Date },           // When subscription ends/renews

  // 🔥 NEW: Reputation & Response System
  reputation: {
    responseRate: { type: Number, default: 0 },   // Percentage of messages responded to
    averageResponseTime: { type: Number },        // Average time to respond (minutes)
    totalMessages: { type: Number, default: 0 },  // Total messages received
    totalResponses: { type: Number, default: 0 }, // Total responses sent
    escalationsReceived: { type: Number, default: 0 }, // Times their plates were escalated
    escalationsResolved: { type: Number, default: 0 }, // Times they resolved before authority contact
  },
  badges: [{
    type: String,
    enum: ['responsive_driver', 'quick_responder', 'verified_owner', 'community_hero', 'frequent_offender']
  }],
  lastResponseAt: { type: Date },                 // When they last responded to a message
});

// Indexes for query optimization
userSchema.index({ email: 1 }); // For email lookups
userSchema.index({ blocked: 1 }); // For filtering blocked users
userSchema.index({ stripeCustomerId: 1 }); // For Stripe webhook lookups

module.exports = mongoose.model('User', userSchema);

