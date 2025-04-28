const mongoose = require('mongoose');

const PlateSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  userId: { type: String, required: true }, // just a simple string for now
}, { timestamps: true });

module.exports = mongoose.model('Plate', PlateSchema);
