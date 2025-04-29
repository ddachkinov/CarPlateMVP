const express = require('express');
const router = express.Router();
const Message = require('../models/Message'); 

router.post('/', async (req, res) => {
  const { plate, message, senderId } = req.body;

  if (!plate || !message) {
    return res.status(400).json({ error: 'Plate and message are required.' });
  }

  try {
    const newMessage = new Message({ plate, message, senderId });
    await newMessage.save();
    res.status(201).json({ message: 'Message saved.' });
  } catch (err) {
    console.error('Save message error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
