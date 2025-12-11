const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  patientName: {
    type: String,
    required: true
  },
  patientEmail: {
    type: String,
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  doctorName: {
    type: String,
    required: true
  },
  doctorEmail: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  rescheduleRequest: {
    requestedDate: Date,
    requestedTimeSlot: String,
    requestedBy: {
      type: String,
      enum: ['patient', 'doctor']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'none'],
      default: 'none'
    },
    requestedAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
