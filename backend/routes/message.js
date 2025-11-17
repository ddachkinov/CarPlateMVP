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
const { sendPushToUser, createMessageNotification } = require('../services/pushService');
const { updateTrustScore } = require('../services/trustScoreService');

// Apply rate limiting, validation, and block check middleware
router.post('/', messageRateLimiter, validateMessageRequest, checkUserBlocked, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { plate, message, senderId, urgency, context } = req.sanitized;

  // 🔥 NEW: Calculate escalation deadline based on urgency level
  let escalationDeadline = null;
  if (urgency === 'urgent') {
    escalationDeadline = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  } else if (urgency === 'emergency') {
    escalationDeadline = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  }

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

    // Reduce user's trust score for flagged content using trust score service
    await updateTrustScore(
      senderId,
      -20, // AI moderation penalty
      'ai_moderation',
      {
        details: `AI moderation blocked message: ${modResult.reason} (severity: ${modResult.severity})`,
        relatedMessageId: tempMessage._id,
        performedBy: 'system'
      }
    );

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

  // Check if user is trying to message their own plate
  let existing = await Plate.findOne({ plate });
  if (existing && existing.ownerId === senderId) {
    console.log(`🚫 User ${senderId} attempted to message their own plate ${plate}`);
    return res.status(400).json({
      error: 'You cannot send messages to your own plate'
    });
  }

  // Create plate if it doesn't exist
  if (!existing) {
    await Plate.create({ plate }); // Create without ownerId
  }

  // Save the message with new urgency and escalation fields
  const newMessage = new Message({
    plate,
    message,
    senderId,
    urgency,
    context,
    escalationDeadline
  });
  await newMessage.save();

  // Refetch plate to ensure we have the latest version
  existing = await Plate.findOne({ plate });

  console.log('🔍 Checking if plate is claimed:', { plate, ownerId: existing?.ownerId });

  // If plate is claimed, send notifications to owner
  if (existing && existing.ownerId) {
    const owner = await User.findOne({ userId: existing.ownerId });

    console.log('👤 Found owner:', { userId: owner?.userId, email: owner?.email, pushSubscriptions: owner?.pushSubscriptions?.length || 0 });

    if (owner) {
      // 1. Send push notification (if user has subscriptions and preference enabled)
      if (owner.pushSubscriptions && owner.pushSubscriptions.length > 0 && owner.notificationPreferences?.push !== false) {
        console.log(`📱 Sending push notification to ${owner.pushSubscriptions.length} device(s)`);

        const notificationPayload = createMessageNotification(newMessage, plate);
        const pushResult = await sendPushToUser(owner.pushSubscriptions, notificationPayload);

        console.log(`📱 Push notification results: sent=${pushResult.sent}, failed=${pushResult.failed}, expired=${pushResult.expired.length}`);

        // Remove expired subscriptions
        if (pushResult.expired.length > 0) {
          await User.updateOne(
            { userId: owner.userId },
            {
              $pull: {
                pushSubscriptions: { endpoint: { $in: pushResult.expired } }
              }
            }
          );
          console.log(`🗑️  Removed ${pushResult.expired.length} expired push subscription(s)`);
        }

        // Mark message as push sent if at least one succeeded
        if (pushResult.sent > 0) {
          await Message.updateOne({ _id: newMessage._id }, { pushSent: true });
        }
      } else {
        console.log('⚠️ Owner has no push subscriptions or push notifications disabled');
      }

      // 2. Send email notification (if user has email and preference enabled)
      if (owner.email && owner.notificationPreferences?.email !== false) {
        console.log('📧 Sending notification email to:', owner.email);
        sendMessageNotificationEmail({
          email: owner.email,
          plate,
          message,
          senderInfo: senderId
        }).catch(err => console.error('Failed to send notification email:', err));
      } else {
        console.log('⚠️ Owner has no email or email notifications disabled');
      }
    } else {
      console.log('⚠️ Owner not found in database');
    }
  } else {
    console.log('⚠️ Plate not claimed, no notification sent');
  }

  res.status(201).json({ message: 'Message saved.' });
}));

module.exports = router;
