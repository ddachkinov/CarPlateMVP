const mongoose = require('mongoose');

const PlateSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Plate', PlateSchema);
