const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
  trustScore: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now },
  nickname: { type: String, default: '' },       // User's chosen display name
  premium: { type: Boolean, default: false },    // Premium subscriber flag
  showPlate: { type: Boolean, default: false },  // If true, reveal user's plate when sending messages
  verified: { type: Boolean, default: false },   // Plate verification status (remains false until verified)
  trustScore: { type: Number, default: 100 }
});

module.exports = mongoose.model('User', userSchema);

