const mongoose = require('mongoose');

const TrustScoreHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  previousScore: { type: Number, required: true },
  newScore: { type: Number, required: true },
  change: { type: Number, required: true }, // positive or negative
  reason: {
    type: String,
    enum: ['report_received', 'ai_moderation', 'admin_adjustment', 'appeal_approved', 'time_bonus', 'initial'],
    required: true
  },
  details: { type: String }, // Additional context
  relatedReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  relatedMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  performedBy: { type: String }, // userId or 'system' or 'admin'
  createdAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
TrustScoreHistorySchema.index({ userId: 1, createdAt: -1 });
TrustScoreHistorySchema.index({ reason: 1 });

module.exports = mongoose.model('TrustScoreHistory', TrustScoreHistorySchema);
