const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // User who submitted feedback
  email: { type: String }, // Optional email for follow-up
  type: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'other'],
    default: 'other'
  },
  message: { type: String, required: true, maxLength: 1000 },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'in_progress', 'resolved', 'dismissed'],
    default: 'new'
  },
  adminNotes: { type: String }, // Internal notes for admin
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String } // Admin userId who reviewed it
});

// Indexes for query optimization
FeedbackSchema.index({ userId: 1, createdAt: -1 }); // For rate limiting queries (count submissions in time window)
FeedbackSchema.index({ status: 1, createdAt: -1 }); // For admin filtering by status

module.exports = mongoose.model('Feedback', FeedbackSchema);
