const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkUserBlocked } = require('../middleware/blockCheck');
const { updateTrustScore, analyzeRepeatOffender, getTrustScoreHistory } = require('../services/trustScoreService');

// Trust score thresholds
const TRUST_PENALTY_PER_REPORT = 10;

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

  // Analyze if user is a repeat offender
  const offenderAnalysis = await analyzeRepeatOffender(reportedUserId);

  // Calculate penalty with escalation for repeat offenders
  const basePenalty = TRUST_PENALTY_PER_REPORT;
  const actualPenalty = -1 * basePenalty * offenderAnalysis.escalationMultiplier;

  console.log(`⚖️ Repeat offender analysis for ${reportedUserId}:`, offenderAnalysis);

  // Update trust score with history tracking
  const trustUpdate = await updateTrustScore(
    reportedUserId,
    actualPenalty,
    'report_received',
    {
      details: offenderAnalysis.isRepeatOffender
        ? `Report received (Repeat offender: ${offenderAnalysis.recentViolations} recent violations, penalty ${offenderAnalysis.escalationMultiplier}x)`
        : `Report received: ${reason}`,
      relatedReportId: report._id,
      relatedMessageId: message._id,
      performedBy: reporterId
    }
  );

  if (trustUpdate.blocked) {
    console.log(`🚫 User ${reportedUserId} auto-blocked due to low trust score (${trustUpdate.newScore})`);

    return res.status(201).json({
      message: 'Report submitted. User has been automatically blocked.',
      report,
      userBlocked: true,
      newTrustScore: trustUpdate.newScore,
      previousTrustScore: trustUpdate.previousScore,
      isRepeatOffender: offenderAnalysis.isRepeatOffender
    });
  }

  res.status(201).json({
    message: 'Report submitted successfully',
    report,
    userBlocked: false,
    newTrustScore: trustUpdate.newScore,
    previousTrustScore: trustUpdate.previousScore,
    isRepeatOffender: offenderAnalysis.isRepeatOffender
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

  // If user doesn't have email but has owned plates, get email from the first plate
  let email = user.email;
  if (!email) {
    const Plate = require('../models/Plate');
    const ownedPlate = await Plate.findOne({ ownerId: userId });

    // If we found an email in owned plates, update the user record
    if (ownedPlate?.email) {
      email = ownedPlate.email;
      // Backfill the email into the User document for future requests
      await User.updateOne({ userId }, { email });
    }
  }

  res.json({
    userId: user.userId,
    trustScore: user.trustScore,
    blocked: user.blocked,
    blockedReason: user.blockedReason,
    blockedAt: user.blockedAt,
    email,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    registered: true
  });
}));

/**
 * GET /api/report/user/:userId/history
 * Get trust score history for a user
 */
router.get('/user/:userId/history', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  const history = await getTrustScoreHistory(userId, limit);

  res.json({
    userId,
    history,
    count: history.length
  });
}));

module.exports = router;
