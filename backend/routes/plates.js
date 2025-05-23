const express = require('express');
const router = express.Router();
const Plate = require('../models/Plate');
const Message = require('../models/Message');

// GET /api/plates
router.get('/', async (req, res) => {
  try {
    const all = await Plate.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plates/messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  
// POST /api/plates/claim with ownership
router.post('/claim', async (req, res) => {
  try {
    const { plate, ownerId } = req.body;

    if (!plate || !ownerId) {
      return res.status(400).json({ error: 'Missing plate or ownerId' });
    }

    const normalizedPlate = plate.trim().toUpperCase();
    let existing = await Plate.findOne({ plate: { $regex: `^${normalizedPlate}$`, $options: 'i' } });

    if (existing) {
      if (existing.ownerId && existing.ownerId !== ownerId) {
        return res.status(409).json({ error: 'Plate already owned by another user' });
      }
      if (!existing.ownerId) {
        existing.ownerId = ownerId;
        await existing.save();
      }
    } else {
      await Plate.create({ plate: normalizedPlate, ownerId });
    }

    res.json({ success: true });
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

    const normalizedPlate = plate.trim().toUpperCase();

    let existing = await Plate.findOne({ plate: normalizedPlate });
    if (!existing) {
      await Plate.create({ plate: normalizedPlate }); // Do NOT assign ownerId
    }

    const newMessage = await Message.create({
      plate: normalizedPlate,
      message,
      senderId
    });

    res.status(201).json(newMessage);
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

// GET /api/plates/owned/:userId
router.get('/owned/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const owned = await Plate.find({ ownerId: userId }).sort({ createdAt: -1 });
    res.json(owned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/plates/inbox/:userId
router.get('/inbox/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const ownedPlates = await Plate.find({ ownerId: userId });
    const plateNumbers = ownedPlates.map(p => p.plate);

    const messages = await Message.find({ plate: { $in: plateNumbers } }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/plates/:plateId?userId=...
router.delete('/:plateId', async (req, res) => {
  const { ownerId } = req.query;
  const { plateId } = req.params;

  try {
    const plate = await Plate.findById(plateId);
    if (!plate) return res.status(404).json({ error: 'Plate not found' });
    if (plate.ownerId !== ownerId) return res.status(403).json({ error: 'Not your plate' });

    await Plate.findByIdAndDelete(plateId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  
module.exports = router;
