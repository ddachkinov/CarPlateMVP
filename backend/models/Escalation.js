const mongoose = require('mongoose');

/**
 * Escalation Model - Tracks escalation events and authority notifications
 *
 * Escalation Flow:
 * 1. Sender marks message as urgent/emergency
 * 2. Car owner has X minutes to respond (based on urgency level)
 * 3. If no response, system auto-escalates:
 *    - Send reminder notification (escalationLevel: 'reminder_sent')
 *    - Notify local authority/parking enforcement (escalationLevel: 'authority_notified')
 *    - Request towing if blocking (escalationLevel: 'towing_requested')
 * 4. Track outcome for reputation system
 */
const EscalationSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  plate: { type: String, required: true },
  escalatedBy: { type: String, required: true },  // userId who initiated escalation
  escalatedAt: { type: Date, default: Date.now },

  // Escalation Details
  level: {
    type: String,
    enum: ['reminder_sent', 'authority_notified', 'towing_requested'],
    required: true
  },
  reason: { type: String },                       // Why it was escalated
  urgency: {
    type: String,
    enum: ['urgent', 'emergency'],
    required: true
  },

  // Authority Notification
  authorityContacted: { type: Boolean, default: false },
  authorityType: {
    type: String,
    enum: ['parking_enforcement', 'towing_company', 'police', 'property_manager']
  },
  authorityContactedAt: { type: Date },
  authorityReferenceNumber: { type: String },     // Ticket/case number from authority

  // Resolution
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  outcome: {
    type: String,
    enum: ['owner_responded', 'owner_moved_car', 'towed', 'ticket_issued', 'dismissed'],
  },
  outcomeNotes: { type: String },

  // Context
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }               // [longitude, latitude]
  },
  photos: [{ type: String }],                     // Evidence photos
});

// Indexes for query optimization
EscalationSchema.index({ messageId: 1 });
EscalationSchema.index({ plate: 1, escalatedAt: -1 });
EscalationSchema.index({ escalatedBy: 1 });
EscalationSchema.index({ resolved: 1, escalatedAt: -1 });

module.exports = mongoose.model('Escalation', EscalationSchema);
