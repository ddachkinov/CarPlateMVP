const mongoose = require('mongoose');

const PlateSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  ownerId: { type: String, required: false } // Optional - plates can exist without owners
}, { timestamps: true });

module.exports = mongoose.model('Plate', PlateSchema);
