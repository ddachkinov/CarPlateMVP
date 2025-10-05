const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Plate = require('../models/Plate');

router.post('/', async (req, res) => {
  const { plate, message, senderId } = req.body;

  if (!plate || !message || !senderId) {
    return res.status(400).json({ error: 'Plate, message, and senderId are required.' });
  }

  try {
    const normalizedPlate = plate.trim().toUpperCase();

    // Create plate if it doesn't exist
    let existing = await Plate.findOne({ plate: normalizedPlate });
    if (!existing) {
      await Plate.create({ plate: normalizedPlate }); // Create without ownerId
    }

    const newMessage = new Message({ plate: normalizedPlate, message, senderId });
    await newMessage.save();
    res.status(201).json({ message: 'Message saved.' });
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
