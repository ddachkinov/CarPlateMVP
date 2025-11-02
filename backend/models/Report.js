const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportedUserId: { type: String, required: true }, // User being reported
  reporterId: { type: String, required: true },     // User who reported
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true }, // Related message
  reason: { type: String, required: true },         // Report reason
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
    default: 'pending'
  },
  adminNotes: { type: String, default: '' },        // Admin comments
  reviewedBy: { type: String },                     // Admin userId who reviewed
  reviewedAt: { type: Date },                       // When reviewed
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
reportSchema.index({ reportedUserId: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
