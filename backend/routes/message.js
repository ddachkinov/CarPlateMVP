const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Plate = require('../models/Plate');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const { validateMessageRequest } = require('../middleware/validation');

// Apply rate limiting and validation middleware
router.post('/', messageRateLimiter, validateMessageRequest, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
