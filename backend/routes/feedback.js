const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/feedback
 * Submit user feedback
 */
router.post('/', asyncHandler(async (req, res) => {
  const { userId, email, type, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' });
  }

  if (message.trim().length < 5 || message.trim().length > 1000) {
    return res.status(400).json({ error: 'Message must be between 5 and 1000 characters' });
  }

  // Rate limiting: Check how many feedback submissions in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFeedbackCount = await Feedback.countDocuments({
    userId,
    createdAt: { $gte: twentyFourHoursAgo }
  });

  if (recentFeedbackCount >= 5) {
    console.log(`🚫 Rate limit exceeded for user ${userId}: ${recentFeedbackCount} submissions in 24h`);
    return res.status(429).json({
      error: 'Rate limit exceeded. You can submit up to 5 feedback items per day.',
      retryAfter: '24 hours'
    });
  }

  const feedback = new Feedback({
    userId,
    email: email || null,
    type: type || 'other',
    message: message.trim(),
    status: 'new'
  });

  await feedback.save();

  console.log(`💬 Feedback submitted by ${userId}: ${type || 'other'} (${recentFeedbackCount + 1}/5 today)`);

  res.status(201).json({
    success: true,
    message: 'Thank you for your feedback!',
    feedbackId: feedback._id
  });
}));

/**
 * GET /api/feedback
 * Get all feedback (admin only)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { status, limit = 100 } = req.query;

  const query = status ? { status } : {};

  const feedbacks = await Feedback.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    feedbacks,
    count: feedbacks.length
  });
}));

/**
 * PUT /api/feedback/:id
 * Update feedback status/notes (admin only)
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, reviewedBy } = req.body;

  const feedback = await Feedback.findById(id);

  if (!feedback) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  if (status) {
    feedback.status = status;
    if (status !== 'new' && !feedback.reviewedAt) {
      feedback.reviewedAt = new Date();
    }
  }

  if (adminNotes !== undefined) {
    feedback.adminNotes = adminNotes;
  }

  if (reviewedBy) {
    feedback.reviewedBy = reviewedBy;
  }

  await feedback.save();

  console.log(`✏️  Feedback ${id} updated: status=${status}`);

  res.json({
    success: true,
    feedback
  });
}));

/**
 * DELETE /api/feedback/:id
 * Delete feedback (admin only)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feedback = await Feedback.findByIdAndDelete(id);

  if (!feedback) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  console.log(`🗑️  Feedback ${id} deleted`);

  res.json({
    success: true,
    message: 'Feedback deleted'
  });
}));

module.exports = router;
