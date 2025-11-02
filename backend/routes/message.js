const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Plate = require('../models/Plate');
const User = require('../models/User');
const Report = require('../models/Report');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const { validateMessageRequest } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendMessageNotificationEmail } = require('../services/emailService');
const { checkUserBlocked } = require('../middleware/blockCheck');
const { moderateAndAct } = require('../services/moderationService');

// Apply rate limiting, validation, and block check middleware
router.post('/', messageRateLimiter, validateMessageRequest, checkUserBlocked, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { plate, message, senderId } = req.sanitized;

  // AI Content Moderation (if configured)
  const modResult = await moderateAndAct(message, senderId);

  if (!modResult.allowed) {
    // Message was blocked by AI moderation
    console.log(`🚫 Message blocked by AI moderation for user ${senderId}`);

    // Create auto-report for the blocked message
    const tempMessage = new Message({ plate, message, senderId });
    await tempMessage.save();

    const autoReport = new Report({
      reportedUserId: senderId,
      reporterId: 'system-ai-moderator',
      messageId: tempMessage._id,
      reason: `AI Moderation: ${modResult.reason}`,
      status: 'action_taken'
    });
    await autoReport.save();

    // Reduce user's trust score for flagged content
    const user = await User.findOne({ userId: senderId });
    if (user) {
      const newTrustScore = Math.max(user.trustScore - 20, 0);

      // Auto-block if trust score is too low
      if (newTrustScore < 50) {
        await User.updateOne(
          { userId: senderId },
          {
            trustScore: newTrustScore,
            blocked: true,
            blockedReason: 'Automatic block: AI-detected policy violation',
            blockedAt: new Date()
          }
        );
      } else {
        await User.updateOne({ userId: senderId }, { trustScore: newTrustScore });
      }
    }

    return res.status(403).json({
      error: 'Message blocked',
      reason: 'Your message was flagged for violating our community guidelines.',
      moderation: {
        flagged: true,
        severity: modResult.severity
      }
    });
  }

  // If flagged but allowed, log for review
  if (modResult.flagged && modResult.action === 'flag') {
    console.log(`⚠️  Message flagged for review: ${senderId} - ${modResult.reason}`);
  }

  // Create plate if it doesn't exist
  let existing = await Plate.findOne({ plate });
  if (!existing) {
    await Plate.create({ plate }); // Create without ownerId
  }

  // Save the message
  const newMessage = new Message({ plate, message, senderId });
  await newMessage.save();

  // Refetch plate to ensure we have the latest version
  existing = await Plate.findOne({ plate });

  console.log('🔍 Checking if plate is claimed:', { plate, ownerId: existing?.ownerId });

  // If plate is claimed, send email notification to owner
  if (existing && existing.ownerId) {
    const owner = await User.findOne({ userId: existing.ownerId });

    console.log('👤 Found owner:', { userId: owner?.userId, email: owner?.email, notificationPreference: owner?.notificationPreference });

    if (owner && owner.email) {
      // Send email notification (async, don't wait for it)
      console.log('📧 Sending notification email to:', owner.email);
      sendMessageNotificationEmail({
        email: owner.email,
        plate,
        message,
        senderInfo: senderId
      }).catch(err => console.error('Failed to send notification email:', err));
    } else {
      console.log('⚠️ Owner has no email or notification preference not set');
    }
  } else {
    console.log('⚠️ Plate not claimed, no notification sent');
  }

  res.status(201).json({ message: 'Message saved.' });
}));

module.exports = router;
