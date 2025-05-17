const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const user = await User.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, trustScore: 100, verified: false } },
      { new: true, upsert: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
