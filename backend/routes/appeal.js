const express = require('express');
const router = express.Router();
const Appeal = require('../models/Appeal');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { updateTrustScore } = require('../services/trustScoreService');

/**
 * POST /api/appeal
 * Submit an appeal for blocked account
 */
router.post('/', asyncHandler(async (req, res) => {
  const { userId, reason } = req.body;

  if (!userId || !reason) {
    return res.status(400).json({ error: 'Missing required fields: userId, reason' });
  }

  // Check if user is actually blocked
  const user = await User.findOne({ userId });
  if (!user || !user.blocked) {
    return res.status(400).json({ error: 'User is not blocked or does not exist' });
  }

  // Check for recent pending appeals
  const recentAppeal = await Appeal.findOne({
    userId,
    status: 'pending',
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });

  if (recentAppeal) {
    return res.status(400).json({
      error: 'You already have a pending appeal. Please wait for review.'
    });
  }

  // Create appeal
  const appeal = new Appeal({
    userId,
    reason,
    status: 'pending'
  });

  await appeal.save();

  console.log(`📝 Appeal submitted by user ${userId}`);

  res.status(201).json({
    message: 'Appeal submitted successfully. It will be reviewed by an administrator.',
    appeal: {
      id: appeal._id,
      status: appeal.status,
      createdAt: appeal.createdAt
    }
  });
}));

/**
 * GET /api/appeal/:userId
 * Get appeals for a user
 */
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const appeals = await Appeal.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    userId,
    appeals,
    count: appeals.length
  });
}));

module.exports = router;
