const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId });
    console.log('✅ New user registered:', userId);
  } else {
    console.log('🔁 Returning user:', userId);
  }

  res.json({ success: true, user });
});

module.exports = router;
