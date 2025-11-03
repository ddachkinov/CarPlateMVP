const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');

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
    avgTrustScore
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ blocked: true }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments(),
    User.aggregate([
      { $group: { _id: null, avgTrust: { $avg: '$trustScore' } } }
    ])
  ]);

  res.json({
    totalUsers,
    blockedUsers,
    pendingReports,
    totalReports,
    averageTrustScore: avgTrustScore[0]?.avgTrust || 100
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

module.exports = router;
