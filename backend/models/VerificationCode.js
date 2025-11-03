const mongoose = require('mongoose');

/**
 * VerificationCode Model
 * Stores temporary verification codes for email verification
 * Codes expire after 15 minutes for security
 */
const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'plate_claim'],
    default: 'email'
  },
  userId: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired codes
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
verificationCodeSchema.index({ email: 1, code: 1 });
verificationCodeSchema.index({ userId: 1 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
