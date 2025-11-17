const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Escalation = require('../models/Escalation');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkUserBlocked } = require('../middleware/blockCheck');

/**
 * POST /api/escalation/escalate/:messageId
 * Escalate a message to the next level
 *
 * Flow:
 * 1. Sender escalates if no response after deadline
 * 2. Creates escalation record
 * 3. Sends additional notifications to car owner
 * 4. Updates car owner's reputation (escalationsReceived++)
 */
router.post('/escalate/:messageId', checkUserBlocked, asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { escalatedBy, reason, authorityType } = req.body;

  // Find the message
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Check if already escalated to max level
  if (message.escalationLevel === 'towing_requested') {
    return res.status(400).json({ error: 'Message already escalated to maximum level' });
  }

  // Check if message is urgent/emergency
  if (message.urgency === 'normal') {
    return res.status(400).json({ error: 'Only urgent or emergency messages can be escalated' });
  }

  // Determine next escalation level
  let nextLevel = 'reminder_sent';
  if (message.escalated) {
    if (message.escalationLevel === 'reminder_sent') {
      nextLevel = 'authority_notified';
    } else if (message.escalationLevel === 'authority_notified') {
      nextLevel = 'towing_requested';
    }
  }

  // Update message
  message.escalated = true;
  message.escalatedAt = new Date();
  message.escalationLevel = nextLevel;
  message.escalationReason = reason || 'No response within deadline';
  await message.save();

  // Create escalation record
  const escalation = new Escalation({
    messageId: message._id,
    plate: message.plate,
    escalatedBy,
    level: nextLevel,
    reason: reason || 'No response within deadline',
    urgency: message.urgency,
    authorityType: authorityType || 'parking_enforcement'
  });

  // If notifying authority, mark it
  if (nextLevel === 'authority_notified' || nextLevel === 'towing_requested') {
    escalation.authorityContacted = true;
    escalation.authorityContactedAt = new Date();
    // TODO: Actually contact authority via API/webhook
  }

  await escalation.save();

  // Update car owner's reputation (if plate is claimed)
  const Plate = require('../models/Plate');
  const plate = await Plate.findOne({ plate: message.plate });
  if (plate && plate.ownerId) {
    await User.updateOne(
      { userId: plate.ownerId },
      {
        $inc: { 'reputation.escalationsReceived': 1 }
      }
    );
  }

  res.json({
    success: true,
    escalationLevel: nextLevel,
    escalation
  });
}));

/**
 * GET /api/escalation/pending
 * Get all pending escalations (for admin/authority dashboard)
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const escalations = await Escalation.find({
    resolved: false,
    authorityContacted: true
  })
    .sort({ escalatedAt: -1 })
    .limit(50);

  res.json({ escalations });
}));

/**
 * PATCH /api/escalation/:escalationId/resolve
 * Mark an escalation as resolved
 */
router.patch('/:escalationId/resolve', asyncHandler(async (req, res) => {
  const { escalationId } = req.params;
  const { outcome, outcomeNotes, authorityReferenceNumber } = req.body;

  const escalation = await Escalation.findById(escalationId);
  if (!escalation) {
    return res.status(404).json({ error: 'Escalation not found' });
  }

  escalation.resolved = true;
  escalation.resolvedAt = new Date();
  escalation.outcome = outcome;
  escalation.outcomeNotes = outcomeNotes;
  escalation.authorityReferenceNumber = authorityReferenceNumber;

  await escalation.save();

  // Update related message
  await Message.updateOne(
    { _id: escalation.messageId },
    {
      resolved: true,
      resolvedAt: new Date()
    }
  );

  // Update car owner reputation based on outcome
  const message = await Message.findById(escalation.messageId);
  if (message) {
    const Plate = require('../models/Plate');
    const plate = await Plate.findOne({ plate: message.plate });
    if (plate && plate.ownerId) {
      const reputationUpdate = {};

      if (outcome === 'owner_responded' || outcome === 'owner_moved_car') {
        reputationUpdate['reputation.escalationsResolved'] = 1;
      }

      if (Object.keys(reputationUpdate).length > 0) {
        await User.updateOne(
          { userId: plate.ownerId },
          { $inc: reputationUpdate }
        );
      }
    }
  }

  res.json({ success: true, escalation });
}));

/**
 * POST /api/escalation/auto-escalate
 * Background job endpoint - checks for messages past deadline and auto-escalates
 * Should be called by a cron job every minute
 */
router.post('/auto-escalate', asyncHandler(async (req, res) => {
  const now = new Date();

  // Find messages past their escalation deadline that haven't been escalated yet
  const expiredMessages = await Message.find({
    escalationDeadline: { $lte: now },
    escalated: false,
    resolved: false,
    hasResponse: false
  }).limit(100);

  let escalatedCount = 0;

  for (const message of expiredMessages) {
    // Auto-escalate
    message.escalated = true;
    message.escalatedAt = now;
    message.escalationLevel = 'reminder_sent';
    message.escalationReason = 'Auto-escalated: No response within deadline';
    await message.save();

    // Create escalation record
    const escalation = new Escalation({
      messageId: message._id,
      plate: message.plate,
      escalatedBy: 'system-auto-escalation',
      level: 'reminder_sent',
      reason: 'Auto-escalated: No response within deadline',
      urgency: message.urgency
    });
    await escalation.save();

    // Update car owner reputation
    const Plate = require('../models/Plate');
    const plate = await Plate.findOne({ plate: message.plate });
    if (plate && plate.ownerId) {
      await User.updateOne(
        { userId: plate.ownerId },
        { $inc: { 'reputation.escalationsReceived': 1 } }
      );

      // TODO: Send urgent push notification to car owner
      // "⚠️ Your message has been escalated! Respond now to avoid authority contact."
    }

    escalatedCount++;
  }

  res.json({
    success: true,
    escalatedCount,
    message: `Auto-escalated ${escalatedCount} messages`
  });
}));

module.exports = router;
