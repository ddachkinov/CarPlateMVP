const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Plate = require('../models/Plate');
const User = require('../models/User');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const { validateMessageRequest } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendMessageNotificationEmail } = require('../services/emailService');

// Apply rate limiting and validation middleware
router.post('/', messageRateLimiter, validateMessageRequest, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { plate, message, senderId } = req.sanitized;

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
