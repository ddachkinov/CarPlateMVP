const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  plate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  trustScore: {
    type: Number,
    default: 100, // Starting trust score (out of 100)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
