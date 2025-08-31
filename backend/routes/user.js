const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  let { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }
  userId = userId.trim();
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const result = await User.findOneAndUpdate(
      { userId },
      // Only set on first insert; rely on schema defaults for all other fields
      { $setOnInsert: { userId } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,   // <-- ensure schema defaults (premium, nickname, showPlate, trustScore, verified) are applied
        rawResult: true              // <-- so we can see if it was created vs found
      }
    );

    const created = !result.lastErrorObject.updatedExisting;
    const user = result.value;

    return res.status(created ? 201 : 200).json({
      success: true,
      created,
      user
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
