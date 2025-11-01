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

  // If plate is claimed, send email notification to owner
  if (existing && existing.ownerId) {
    const owner = await User.findOne({ userId: existing.ownerId });

    if (owner && owner.email && owner.notificationPreference === 'email') {
      // Send email notification (async, don't wait for it)
      sendMessageNotificationEmail({
        email: owner.email,
        plate,
        message,
        senderInfo: senderId
      }).catch(err => console.error('Failed to send notification email:', err));
    }
  }

  res.status(201).json({ message: 'Message saved.' });
}));

module.exports = router;
