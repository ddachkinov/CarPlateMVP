const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Plate = require('../models/Plate');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkUserBlocked } = require('../middleware/blockCheck');
const { sanitizeString } = require('../middleware/validation');

/**
 * POST /api/response/:messageId
 * Respond to a message (car owner only)
 *
 * Features:
 * - Car owner can send a quick response: "Moving in 5 min", "On my way", "Sorry!"
 * - Tracks response time for reputation system
 * - Premium users get faster notifications for responses
 * - Updates reputation: responseRate, averageResponseTime
 */
router.post('/:messageId', checkUserBlocked, asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { userId, responseMessage, eta } = req.body;

  if (!userId || !responseMessage) {
    return res.status(400).json({ error: 'userId and responseMessage are required' });
  }

  // Find the message
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Verify user owns this plate
  const plate = await Plate.findOne({ plate: message.plate });
  if (!plate || plate.ownerId !== userId) {
    return res.status(403).json({ error: 'You can only respond to messages for your own plates' });
  }

  // Check if already responded
  if (message.hasResponse) {
    return res.status(400).json({ error: 'You already responded to this message' });
  }

  // Calculate response time (in minutes)
  const responseTime = Math.round((Date.now() - message.createdAt.getTime()) / (1000 * 60));

  // Sanitize response message
  const sanitizedResponse = sanitizeString(responseMessage).substring(0, 200);

  // Update message with response
  message.hasResponse = true;
  message.response = {
    message: sanitizedResponse,
    respondedAt: new Date(),
    eta: eta || null
  };
  message.responseTime = responseTime;

  // If escalated, mark as resolved
  if (message.escalated) {
    message.resolved = true;
    message.resolvedAt = new Date();
  }

  await message.save();

  // Update user reputation
  const user = await User.findOne({ userId });
  if (user) {
    const totalMessages = (user.reputation?.totalMessages || 0) + 1;
    const totalResponses = (user.reputation?.totalResponses || 0) + 1;
    const responseRate = (totalResponses / totalMessages) * 100;

    // Calculate new average response time
    const currentAvg = user.reputation?.averageResponseTime || 0;
    const newAvg = currentAvg === 0
      ? responseTime
      : (currentAvg * (totalResponses - 1) + responseTime) / totalResponses;

    await User.updateOne(
      { userId },
      {
        $set: {
          'reputation.totalMessages': totalMessages,
          'reputation.totalResponses': totalResponses,
          'reputation.responseRate': Math.round(responseRate),
          'reputation.averageResponseTime': Math.round(newAvg),
          lastResponseAt: new Date()
        },
        $inc: message.escalated ? { 'reputation.escalationsResolved': 1 } : {}
      }
    );

    // Award badges based on performance
    const badges = [];
    if (responseRate >= 90) badges.push('responsive_driver');
    if (newAvg <= 10) badges.push('quick_responder'); // Responds within 10 min on average

    if (badges.length > 0) {
      await User.updateOne(
        { userId },
        { $addToSet: { badges: { $each: badges } } }
      );
    }
  }

  // If message was escalated, update escalation record
  if (message.escalated) {
    const Escalation = require('../models/Escalation');
    await Escalation.updateOne(
      { messageId: message._id, resolved: false },
      {
        resolved: true,
        resolvedAt: new Date(),
        outcome: 'owner_responded',
        outcomeNotes: `Owner responded: "${sanitizedResponse}"`
      }
    );
  }

  // TODO: Send notification to original sender
  // "The car owner responded: [message]"

  res.json({
    success: true,
    message: 'Response sent successfully',
    responseTime,
    resolved: message.escalated
  });
}));

/**
 * GET /api/response/quick-responses
 * Get predefined quick response options for car owners
 */
router.get('/quick-responses', asyncHandler(async (req, res) => {
  const quickResponses = [
    { message: 'Moving now, give me 2 minutes', eta: 2 },
    { message: 'On my way, be there in 5 minutes', eta: 5 },
    { message: 'Sorry! Moving in 10 minutes', eta: 10 },
    { message: 'Thanks for letting me know! Fixing it now.', eta: null },
    { message: "I'm nearby, moving the car now", eta: 3 },
    { message: 'Apologies! Will move immediately.', eta: null }
  ];

  res.json({ quickResponses });
}));

/**
 * GET /api/response/conversation/:messageId
 * Get full conversation thread for a message (future feature)
 */
router.get('/conversation/:messageId', asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // For now, just return the message and response
  // Future: Support back-and-forth conversation
  res.json({
    originalMessage: {
      message: message.message,
      urgency: message.urgency,
      createdAt: message.createdAt,
      senderId: message.senderId
    },
    response: message.hasResponse ? message.response : null,
    escalated: message.escalated,
    escalationLevel: message.escalationLevel,
    resolved: message.resolved
  });
}));

module.exports = router;
