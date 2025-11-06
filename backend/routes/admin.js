const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');
const Appeal = require('../models/Appeal');
const TrustScoreHistory = require('../models/TrustScoreHistory');
const { asyncHandler } = require('../middleware/errorHandler');
const { updateTrustScore } = require('../services/trustScoreService');

// Simple admin authentication middleware (use environment variable for admin key)
const checkAdminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }

  next();
};

/**
 * GET /api/admin/reports
 * Get all reports (optionally filter by status)
 */
router.get('/reports', checkAdminAuth, asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = status ? { status } : {};
  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  // Populate message content
  const reportsWithMessages = await Promise.all(
    reports.map(async (report) => {
      const message = await Message.findById(report.messageId);
      return {
        ...report.toObject(),
        messageContent: message ? message.message : null,
        messagePlate: message ? message.plate : null
      };
    })
  );

  res.json(reportsWithMessages);
}));

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', checkAdminAuth, asyncHandler(async (req, res) => {
  const [
    totalUsers,
    blockedUsers,
    pendingReports,
    totalReports,
    pendingAppeals,
    totalAppeals,
    avgTrustScore,
    totalMessages
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ blocked: true }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments(),
    Appeal.countDocuments({ status: 'pending' }),
    Appeal.countDocuments(),
    User.aggregate([
      { $group: { _id: null, avgTrust: { $avg: '$trustScore' } } }
    ]),
    Message.countDocuments()
  ]);

  // Get trust score distribution
  const trustDistribution = await User.aggregate([
    {
      $bucket: {
        groupBy: '$trustScore',
        boundaries: [0, 20, 40, 60, 80, 100, 101],
        default: 'Other',
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  res.json({
    totalUsers,
    blockedUsers,
    pendingReports,
    totalReports,
    pendingAppeals,
    totalAppeals,
    totalMessages,
    averageTrustScore: avgTrustScore[0]?.avgTrust || 100,
    trustDistribution
  });
}));

/**
 * PATCH /api/admin/reports/:reportId
 * Update report status and take action
 */
router.patch('/reports/:reportId', checkAdminAuth, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, adminNotes, action } = req.body;

  const report = await Report.findById(reportId);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  // Update report
  report.status = status || report.status;
  report.adminNotes = adminNotes || report.adminNotes;
  report.reviewedBy = 'admin'; // TODO: Use actual admin user ID
  report.reviewedAt = new Date();
  await report.save();

  // Take action on user if specified
  if (action === 'block' && report.status === 'action_taken') {
    await User.updateOne(
      { userId: report.reportedUserId },
      {
        blocked: true,
        blockedReason: 'Blocked by admin: ' + (adminNotes || 'Policy violation'),
        blockedAt: new Date()
      }
    );
  } else if (action === 'adjust_trust') {
    const user = await User.findOne({ userId: report.reportedUserId });
    if (user) {
      const newTrustScore = Math.max(user.trustScore - 20, 0);
      await User.updateOne(
        { userId: report.reportedUserId },
        { trustScore: newTrustScore }
      );
    }
  }

  res.json({ message: 'Report updated successfully', report });
}));

/**
 * GET /api/admin/users
 * Get all users with filtering
 */
router.get('/users', checkAdminAuth, asyncHandler(async (req, res) => {
  const { blocked, minTrustScore, maxTrustScore } = req.query;

  const filter = {};
  if (blocked !== undefined) filter.blocked = blocked === 'true';
  if (minTrustScore) filter.trustScore = { $gte: parseInt(minTrustScore) };
  if (maxTrustScore) {
    filter.trustScore = { ...filter.trustScore, $lte: parseInt(maxTrustScore) };
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  // Fetch owned plates for each user
  const Plate = require('../models/Plate');
  const usersWithPlates = await Promise.all(
    users.map(async (user) => {
      const ownedPlates = await Plate.find({ ownerId: user.userId });
      return {
        ...user.toObject(),
        ownedPlates: ownedPlates.map(p => p.plate)
      };
    })
  );

  res.json(usersWithPlates);
}));

/**
 * PATCH /api/admin/users/:userId
 * Update user status (block/unblock, adjust trust score)
 */
router.patch('/users/:userId', checkAdminAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { blocked, blockedReason, trustScore } = req.body;

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = {};
  if (blocked !== undefined) {
    updates.blocked = blocked;
    if (blocked) {
      updates.blockedReason = blockedReason || 'Blocked by admin';
      updates.blockedAt = new Date();
    } else {
      updates.blockedReason = null;
      updates.blockedAt = null;
    }
  }

  if (trustScore !== undefined) {
    updates.trustScore = Math.max(Math.min(trustScore, 100), 0);
  }

  await User.updateOne({ userId }, updates);

  res.json({ message: 'User updated successfully', updates });
}));

/**
 * GET /api/admin/appeals
 * Get all appeals (optionally filter by status)
 */
router.get('/appeals', checkAdminAuth, asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = status ? { status } : {};
  const appeals = await Appeal.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  // Populate user information
  const appealsWithUsers = await Promise.all(
    appeals.map(async (appeal) => {
      const user = await User.findOne({ userId: appeal.userId });
      return {
        ...appeal.toObject(),
        userTrustScore: user ? user.trustScore : null,
        userBlocked: user ? user.blocked : null,
        userBlockedReason: user ? user.blockedReason : null
      };
    })
  );

  res.json(appealsWithUsers);
}));

/**
 * PATCH /api/admin/appeals/:appealId
 * Review an appeal (approve/deny)
 */
router.patch('/appeals/:appealId', checkAdminAuth, asyncHandler(async (req, res) => {
  const { appealId } = req.params;
  const { status, adminResponse, trustScoreAdjustment } = req.body;

  if (!status || !['approved', 'denied'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "denied"' });
  }

  const appeal = await Appeal.findById(appealId);
  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  if (appeal.status !== 'pending') {
    return res.status(400).json({ error: 'Appeal has already been reviewed' });
  }

  // Update appeal
  appeal.status = status;
  appeal.adminResponse = adminResponse || '';
  appeal.reviewedBy = 'admin'; // TODO: Use actual admin user ID
  appeal.reviewedAt = new Date();
  await appeal.save();

  // If approved, unblock user and optionally adjust trust score
  if (status === 'approved') {
    const user = await User.findOne({ userId: appeal.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Unblock the user
    await User.updateOne(
      { userId: appeal.userId },
      {
        blocked: false,
        blockedReason: null,
        blockedAt: null
      }
    );

    // Adjust trust score if specified
    if (trustScoreAdjustment && trustScoreAdjustment !== 0) {
      await updateTrustScore(
        appeal.userId,
        trustScoreAdjustment,
        'appeal_approved',
        {
          details: `Appeal approved by admin. ${adminResponse || 'No additional notes.'}`,
          relatedReportId: appeal._id,
          performedBy: 'admin'
        }
      );
    }

    console.log(`✅ Appeal approved for user ${appeal.userId}. User unblocked.`);

    res.json({
      message: 'Appeal approved. User has been unblocked.',
      appeal,
      userUnblocked: true,
      trustScoreAdjustment: trustScoreAdjustment || 0
    });
  } else {
    // Appeal denied
    console.log(`❌ Appeal denied for user ${appeal.userId}`);

    res.json({
      message: 'Appeal denied.',
      appeal,
      userUnblocked: false
    });
  }
}));

/**
 * GET /api/admin/users/:userId/trust-history
 * Get trust score history for a specific user (admin view)
 */
router.get('/users/:userId/trust-history', checkAdminAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 100;

  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const history = await TrustScoreHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);

  // Populate related entities for context
  const historyWithDetails = await Promise.all(
    history.map(async (entry) => {
      let messageContent = null;
      let reportReason = null;

      if (entry.relatedMessageId) {
        const message = await Message.findById(entry.relatedMessageId);
        if (message) {
          messageContent = message.message;
        }
      }

      if (entry.relatedReportId) {
        const report = await Report.findById(entry.relatedReportId);
        if (report) {
          reportReason = report.reason;
        }
      }

      return {
        ...entry.toObject(),
        messageContent,
        reportReason
      };
    })
  );

  res.json({
    userId,
    currentTrustScore: user.trustScore,
    blocked: user.blocked,
    history: historyWithDetails,
    count: historyWithDetails.length
  });
}));

module.exports = router;
