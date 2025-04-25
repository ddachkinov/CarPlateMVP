const express = require('express');
const router = express.Router();
const Plate = require('../models/Plate');

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
  

module.exports = router;
