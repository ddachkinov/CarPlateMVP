const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generalApiLimiter } = require('../middleware/rateLimiter');
const { validateUserRegistration } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/register', generalApiLimiter, validateUserRegistration, asyncHandler(async (req, res) => {
  // Use sanitized values from validation middleware
  const { userId, nickname } = req.sanitized;

  // Upsert and let schema defaults apply on insert
  const updateData = { $setOnInsert: { userId } };
  if (nickname) {
    updateData.$set = { nickname };
  }

  const upd = await User.updateOne(
    { userId },
    updateData,
    { upsert: true, setDefaultsOnInsert: true }
  );

  const created = upd.upsertedCount > 0;

  // Fetch the document to return it
  const user = await User.findOne({ userId });

  return res.status(created ? 201 : 200).json({
    success: true,
    created,
    user,
  });
}));

module.exports = router;
