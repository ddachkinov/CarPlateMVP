const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  senderId: { type: String, required: true }, // who sent it
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // Track if message has been read
  readAt: { type: Date },                    // When message was read
  pushSent: { type: Boolean, default: false }, // Whether push notification was sent
  emailSent: { type: Boolean, default: false }, // Whether email notification was sent
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', MessageSchema);
