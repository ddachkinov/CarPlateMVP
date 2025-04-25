const mongoose = require('mongoose');

const plateSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Plate', plateSchema);
