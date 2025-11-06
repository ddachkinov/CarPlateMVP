const User = require('../models/User');
const TrustScoreHistory = require('../models/TrustScoreHistory');

const AUTO_BLOCK_THRESHOLD = 50;

/**
 * Update user's trust score with history tracking
 * @param {string} userId - User ID
 * @param {number} change - Score change (positive or negative)
 * @param {string} reason - Reason for change
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated user and history entry
 */
const updateTrustScore = async (userId, change, reason, options = {}) => {
  const { details, relatedReportId, relatedMessageId, performedBy = 'system' } = options;

  // Get or create user
  let user = await User.findOne({ userId });
  if (!user) {
    user = new User({ userId, trustScore: 100 });
    await user.save();
  }

  const previousScore = user.trustScore;
  const newScore = Math.max(Math.min(previousScore + change, 100), 0);

  // Create history entry
  const historyEntry = new TrustScoreHistory({
    userId,
    previousScore,
    newScore,
    change,
    reason,
    details,
    relatedReportId,
    relatedMessageId,
    performedBy
  });
  await historyEntry.save();

  // Check if user should be auto-blocked
  const shouldBlock = newScore < AUTO_BLOCK_THRESHOLD && !user.blocked;
  
  const updates = { trustScore: newScore };
  if (shouldBlock) {
    updates.blocked = true;
    updates.blockedReason = `Automatic block: Trust score dropped below ${AUTO_BLOCK_THRESHOLD} due to ${reason}`;
    updates.blockedAt = new Date();
  }

  await User.updateOne({ userId }, updates);

  console.log(`📊 Trust score update: ${userId} ${previousScore} → ${newScore} (${change >= 0 ? '+' : ''}${change}) - ${reason}`);

  return {
    userId,
    previousScore,
    newScore,
    change,
    blocked: shouldBlock,
    historyEntry
  };
};

/**
 * Get trust score history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Max entries to return
 * @returns {Promise<Array>} - History entries
 */
const getTrustScoreHistory = async (userId, limit = 50) => {
  return await TrustScoreHistory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Check if user is a repeat offender
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Analysis of user's violation history
 */
const analyzeRepeatOffender = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentHistory = await TrustScoreHistory.find({
    userId,
    createdAt: { $gte: thirtyDaysAgo },
    reason: { $in: ['report_received', 'ai_moderation'] }
  });

  const reportCount = recentHistory.filter(h => h.reason === 'report_received').length;
  const aiModerationCount = recentHistory.filter(h => h.reason === 'ai_moderation').length;

  const isRepeatOffender = reportCount >= 3 || aiModerationCount >= 5;
  const escalationMultiplier = isRepeatOffender ? 2 : 1;

  return {
    isRepeatOffender,
    reportCount,
    aiModerationCount,
    escalationMultiplier,
    recentViolations: recentHistory.length
  };
};

module.exports = {
  updateTrustScore,
  getTrustScoreHistory,
  analyzeRepeatOffender,
  AUTO_BLOCK_THRESHOLD
};
