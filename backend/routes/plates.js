const express = require('express');
const router = express.Router();
const Plate = require('../models/Plate');
const Message = require('../models/Message');

// POST /api/plates
router.post('/', async (req, res) => {
    console.log('POST /api/plates hit');
    console.log('Request body:', req.body);
    try {
      const { plate, message } = req.body;
      const newPlate = await Plate.create({ plate, message });
      res.status(201).json(newPlate);
    } catch (err) {
      console.error('❌ Error in POST /api/plates:', err);
      res.status(500).json({ error: err.message });
    }
  });

// GET /api/plates
router.get('/', async (req, res) => {
  try {
    const all = await Plate.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plates/:id
router.get('/:id', async (req, res) => {
    try {
      const plate = await Plate.findById(req.params.id);
      if (!plate) return res.status(404).json({ error: 'Plate not found' });
      res.json(plate);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  router.post('/claim', async (req, res) => {
    try {
      const { plate, userId } = req.body;
  
      const existing = await Plate.findOne({ plate });
      if (existing) {
        return res.status(400).json({ error: 'Plate already claimed' });
      }
  
      const newPlate = await Plate.create({ plate, userId });
      res.status(201).json(newPlate);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// POST /api/plates/send
router.post('/send', async (req, res) => {
  try {
    const { plate, message, senderId } = req.body;

    if (!plate || !message || !senderId) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const newMessage = await Message.create({ plate, message, senderId });
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  
module.exports = router;
