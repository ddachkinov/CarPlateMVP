const mongoose = require('mongoose');

const AppealSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  reason: { type: String, required: true, maxLength: 1000 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied'],
    default: 'pending'
  },
  adminResponse: { type: String },
  reviewedBy: { type: String }, // Admin userId
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
AppealSchema.index({ userId: 1, createdAt: -1 });
AppealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Appeal', AppealSchema);
