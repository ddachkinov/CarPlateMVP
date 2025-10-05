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

    // Count unread messages that were waiting for this plate
    const unreadCount = await Message.countDocuments({
      plate: normalizedPlate,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount,
      message: unreadCount > 0 ? `You have ${unreadCount} message${unreadCount > 1 ? 's' : ''} waiting!` : null
    });
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

    // Automatically mark messages as read when inbox is viewed
    const unreadMessageIds = messages.filter(m => !m.isRead).map(m => m._id);
    if (unreadMessageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $set: { isRead: true } }
      );
    }

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
