const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkUserBlocked } = require('../middleware/blockCheck');

// Trust score thresholds
const TRUST_PENALTY_PER_REPORT = 10;
const AUTO_BLOCK_THRESHOLD = 50;

/**
 * POST /api/report
 * Submit a report for a message
 */
router.post('/', checkUserBlocked, asyncHandler(async (req, res) => {
  const { messageId, reporterId, reason } = req.body;

  if (!messageId || !reporterId || !reason) {
    return res.status(400).json({ error: 'Missing required fields: messageId, reporterId, reason' });
  }

  // Find the message being reported
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const reportedUserId = message.senderId;

  // Prevent self-reporting
  if (reportedUserId === reporterId) {
    return res.status(400).json({ error: 'You cannot report your own messages' });
  }

  // Check if already reported by this user
  const existingReport = await Report.findOne({ messageId, reporterId });
  if (existingReport) {
    return res.status(400).json({ error: 'You have already reported this message' });
  }

  // Create the report
  const report = new Report({
    reportedUserId,
    reporterId,
    messageId,
    reason,
    status: 'pending'
  });

  await report.save();

  // Update reported user's trust score
  const reportedUser = await User.findOne({ userId: reportedUserId });

  if (reportedUser) {
    const newTrustScore = Math.max(reportedUser.trustScore - TRUST_PENALTY_PER_REPORT, 0);

    // Check if user should be auto-blocked
    if (newTrustScore < AUTO_BLOCK_THRESHOLD && !reportedUser.blocked) {
      await User.updateOne(
        { userId: reportedUserId },
        {
          trustScore: newTrustScore,
          blocked: true,
          blockedReason: 'Automatic block: Trust score dropped below threshold due to multiple reports',
          blockedAt: new Date()
        }
      );

      console.log(`🚫 User ${reportedUserId} auto-blocked due to low trust score (${newTrustScore})`);

      return res.status(201).json({
        message: 'Report submitted. User has been automatically blocked.',
        report,
        userBlocked: true,
        newTrustScore
      });
    } else {
      await User.updateOne(
        { userId: reportedUserId },
        { trustScore: newTrustScore }
      );

      console.log(`📉 User ${reportedUserId} trust score decreased to ${newTrustScore}`);
    }
  }

  res.status(201).json({
    message: 'Report submitted successfully',
    report,
    userBlocked: false
  });
}));

/**
 * GET /api/report/user/:userId
 * Get a user's trust score and blocked status
 */
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({ userId });

  if (!user) {
    // Return default values for unregistered users
    return res.json({
      userId,
      trustScore: 100,
      blocked: false,
      registered: false
    });
  }

  res.json({
    userId: user.userId,
    trustScore: user.trustScore,
    blocked: user.blocked,
    blockedReason: user.blockedReason,
    blockedAt: user.blockedAt,
    registered: true
  });
}));

module.exports = router;
