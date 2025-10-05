const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  senderId: { type: String, required: true }, // who sent it
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // Track if message has been read
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
