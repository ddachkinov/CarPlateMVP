const express = require('express');
const router = express.Router();
const Plate = require('../models/Plate');
const Message = require('../models/Message');
const { plateClaimLimiter, generalApiLimiter } = require('../middleware/rateLimiter');
const { validatePlateClaimRequest } = require('../middleware/validation');
const { asyncHandler, NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');

// GET /api/plates
router.get('/', asyncHandler(async (req, res) => {
  const all = await Plate.find().sort({ createdAt: -1 });
  res.json(all);
}));

// GET /api/plates/messages
router.get('/messages', asyncHandler(async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
}));
  
// POST /api/plates/claim with ownership
router.post('/claim', plateClaimLimiter, validatePlateClaimRequest, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { plate, ownerId } = req.sanitized;

  let existing = await Plate.findOne({ plate: { $regex: `^${plate}$`, $options: 'i' } });

  if (existing) {
    if (existing.ownerId && existing.ownerId !== ownerId) {
      throw new ConflictError('Plate already owned by another user');
    }
    if (!existing.ownerId) {
      existing.ownerId = ownerId;
      await existing.save();
    }
  } else {
    await Plate.create({ plate, ownerId });
  }

  // Count unread messages that were waiting for this plate
  const unreadCount = await Message.countDocuments({
    plate,
    isRead: false
  });

  res.json({
    success: true,
    unreadCount,
    message: unreadCount > 0 ? `You have ${unreadCount} message${unreadCount > 1 ? 's' : ''} waiting!` : null
  });
}));


// POST /api/plates/send (deprecated - use /api/message instead)
router.post('/send', asyncHandler(async (req, res) => {
  const { plate, message, senderId } = req.body;
  if (!plate || !message || !senderId) {
    throw new ValidationError('Missing required fields: plate, message, senderId');
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
}));

// GET /api/plates/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const plate = await Plate.findById(req.params.id);
  if (!plate) {
    throw new NotFoundError('Plate');
  }
  res.json(plate);
}));

// GET /api/plates/owned/:userId
router.get('/owned/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const owned = await Plate.find({ ownerId: userId }).sort({ createdAt: -1 });
  res.json(owned);
}));

// GET /api/plates/inbox/:userId
router.get('/inbox/:userId', asyncHandler(async (req, res) => {
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
}));

// DELETE /api/plates/:plateId?userId=...
router.delete('/:plateId', asyncHandler(async (req, res) => {
  const { ownerId } = req.query;
  const { plateId } = req.params;

  const plate = await Plate.findById(plateId);
  if (!plate) {
    throw new NotFoundError('Plate');
  }
  if (plate.ownerId !== ownerId) {
    throw new AuthorizationError('You do not own this plate');
  }

  await Plate.findByIdAndDelete(plateId);

  res.json({ success: true });
}));

  
module.exports = router;
