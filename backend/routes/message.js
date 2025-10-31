const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Plate = require('../models/Plate');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const { validateMessageRequest } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply rate limiting and validation middleware
router.post('/', messageRateLimiter, validateMessageRequest, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { plate, message, senderId } = req.sanitized;

  // Create plate if it doesn't exist
  let existing = await Plate.findOne({ plate });
  if (!existing) {
    await Plate.create({ plate }); // Create without ownerId
  }

  const newMessage = new Message({ plate, message, senderId });
  await newMessage.save();
  res.status(201).json({ message: 'Message saved.' });
}));

module.exports = router;
