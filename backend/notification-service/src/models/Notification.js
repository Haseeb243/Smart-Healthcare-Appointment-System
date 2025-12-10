const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userRole: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'APPOINTMENT_CREATED',
      'APPOINTMENT_APPROVED', 
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_COMPLETED',
      'NEW_MESSAGE'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    appointmentId: mongoose.Schema.Types.ObjectId,
    patientName: String,
    patientEmail: String,
    doctorName: String,
    doctorEmail: String,
    date: Date,
    timeSlot: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
