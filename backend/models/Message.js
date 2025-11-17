const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  senderId: { type: String, required: true }, // who sent it
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // Track if message has been read
  readAt: { type: Date },                    // When message was read
  pushSent: { type: Boolean, default: false }, // Whether push notification was sent
  emailSent: { type: Boolean, default: false }, // Whether email notification was sent
  createdAt: { type: Date, default: Date.now },

  // 🔥 NEW: Urgency & Escalation System
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  escalated: { type: Boolean, default: false },
  escalatedAt: { type: Date },
  escalationLevel: {
    type: String,
    enum: ['none', 'reminder_sent', 'authority_notified', 'towing_requested'],
    default: 'none'
  },
  escalationDeadline: { type: Date },        // When auto-escalation will occur
  escalationReason: { type: String },        // Why it was escalated

  // 🔥 NEW: Two-Way Communication & Responses
  hasResponse: { type: Boolean, default: false },
  response: {
    message: { type: String },
    respondedAt: { type: Date },
    eta: { type: Number }                    // Estimated time to resolve (minutes)
  },
  responseTime: { type: Number },            // How long it took to respond (minutes)
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },

  // 🔥 NEW: Context & Location (for B2B features)
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }          // [longitude, latitude]
  },
  context: { type: String },                 // Additional context: "blocking driveway", "fire lane"
  photos: [{ type: String }],                // URLs to uploaded photos (future feature)
});

// Indexes for query optimization
MessageSchema.index({ plate: 1, createdAt: -1 }); // For inbox queries (get messages for a plate, sorted by date)
MessageSchema.index({ senderId: 1 }); // For finding messages by sender
MessageSchema.index({ isRead: 1, createdAt: -1 }); // For filtering unread messages
MessageSchema.index({ urgency: 1, escalated: 1 }); // For finding urgent/escalated messages
MessageSchema.index({ escalationDeadline: 1 }); // For auto-escalation queries
MessageSchema.index({ location: '2dsphere' }); // For geospatial queries (B2B feature)

module.exports = mongoose.model('Message', MessageSchema);
