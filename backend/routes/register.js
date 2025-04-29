const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/', async (req, res) => {
  const { plate } = req.body;

  if (!plate || typeof plate !== 'string') {
    return res.status(400).json({ error: 'Plate is required' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { plate: plate.toUpperCase() },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Registered', plate: user.plate });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
