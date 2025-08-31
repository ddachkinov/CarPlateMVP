const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  let { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }
  userId = userId.trim();
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    // Upsert and let schema defaults apply on insert
    const upd = await User.updateOne(
      { userId },
      { $setOnInsert: { userId } },
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
  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
