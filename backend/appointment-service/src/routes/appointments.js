const express = require('express');
const Appointment = require('../models/Appointment');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { publishEvent, EVENTS, CHANNELS } = require('../events/publisher-kafka');
const { generateGoogleCalendarLink, generateICSFile } = require('../utils/calendarUtils');

const router = express.Router();

// Create new appointment (patients only)
router.post('/', authMiddleware, requireRole('patient'), async (req, res) => {
  try {
    const { doctorId, doctorName, doctorEmail, date, timeSlot, reason, patientName, patientEmail } = req.body;

    const appointment = new Appointment({
      patientId: req.user.id,
      patientName,
      patientEmail,
      doctorId,
      doctorName,
      doctorEmail,
      date,
      timeSlot,
      reason
    });

    await appointment.save();

    // Emit event for notification service
    await publishEvent(CHANNELS.APPOINTMENTS, {
      type: EVENTS.APPOINTMENT_CREATED,
      data: {
        appointmentId: appointment._id,
        patientId: req.user.id,
        patientName,
        patientEmail,
        doctorId,
        doctorName,
        doctorEmail,
        date,
        timeSlot,
        reason
      }
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
});

// Get appointments for patient
router.get('/patient', authMiddleware, requireRole('patient'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user.id })
      .sort({ date: -1 });
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// Get appointments for doctor
router.get('/doctor', authMiddleware, requireRole('doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user.id })
      .sort({ date: -1 });
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
});

// Get single appointment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment', error: error.message });
  }
});

// Approve appointment (doctors only)
router.patch('/:id/approve', authMiddleware, requireRole('doctor'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    appointment.status = 'approved';
    appointment.notes = req.body.notes || appointment.notes;
    await appointment.save();

    // Emit event for notification service
    await publishEvent(CHANNELS.APPOINTMENTS, {
      type: EVENTS.APPOINTMENT_APPROVED,
      data: {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        date: appointment.date,
        timeSlot: appointment.timeSlot
      }
    });

    res.json({ message: 'Appointment approved', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error approving appointment', error: error.message });
  }
});

// Cancel appointment
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    appointment.status = 'cancelled';
    appointment.notes = req.body.notes || appointment.notes;
    await appointment.save();

    // Emit event for notification service
    await publishEvent(CHANNELS.APPOINTMENTS, {
      type: EVENTS.APPOINTMENT_CANCELLED,
      data: {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        doctorEmail: appointment.doctorEmail,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        cancelledBy: req.user.role
      }
    });

    res.json({ message: 'Appointment cancelled', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling appointment', error: error.message });
  }
});

// Complete appointment (doctors only)
router.patch('/:id/complete', authMiddleware, requireRole('doctor'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    appointment.status = 'completed';
    appointment.notes = req.body.notes || appointment.notes;
    await appointment.save();

    // Emit event for notification service
    await publishEvent(CHANNELS.APPOINTMENTS, {
      type: EVENTS.APPOINTMENT_COMPLETED,
      data: {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        date: appointment.date,
        timeSlot: appointment.timeSlot
      }
    });

    res.json({ message: 'Appointment completed', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error completing appointment', error: error.message });
  }
});

// Request reschedule (patient or doctor)
router.post('/:id/reschedule-request', authMiddleware, async (req, res) => {
  try {
    const { requestedDate, requestedTimeSlot } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow reschedule for approved or pending appointments
    if (appointment.status !== 'approved' && appointment.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot reschedule this appointment' });
    }

    appointment.rescheduleRequest = {
      requestedDate,
      requestedTimeSlot,
      requestedBy: req.user.role,
      status: 'pending',
      requestedAt: new Date()
    };
    await appointment.save();

    res.json({ message: 'Reschedule request submitted', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting reschedule', error: error.message });
  }
});

// Approve reschedule request
router.patch('/:id/reschedule-approve', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!appointment.rescheduleRequest || appointment.rescheduleRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending reschedule request' });
    }

    // Store old date/time for notification
    const oldDate = appointment.date;
    const oldTimeSlot = appointment.timeSlot;

    // Apply the reschedule
    appointment.date = appointment.rescheduleRequest.requestedDate;
    appointment.timeSlot = appointment.rescheduleRequest.requestedTimeSlot;
    appointment.rescheduleRequest.status = 'approved';
    await appointment.save();

    // Emit event for notification service
    await publishEvent(CHANNELS.APPOINTMENTS, {
      type: EVENTS.APPOINTMENT_RESCHEDULED,
      data: {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        patientEmail: appointment.patientEmail,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        doctorEmail: appointment.doctorEmail,
        oldDate,
        oldTimeSlot,
        newDate: appointment.date,
        newTimeSlot: appointment.timeSlot,
        requestedBy: appointment.rescheduleRequest.requestedBy
      }
    });

    res.json({ message: 'Reschedule approved', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error approving reschedule', error: error.message });
  }
});

// Decline reschedule request
router.patch('/:id/reschedule-decline', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!appointment.rescheduleRequest || appointment.rescheduleRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending reschedule request' });
    }

    appointment.rescheduleRequest.status = 'declined';
    await appointment.save();

    res.json({ message: 'Reschedule declined', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Error declining reschedule', error: error.message });
  }
});

// Get calendar links for an appointment
router.get('/:id/calendar', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const googleCalendarLink = generateGoogleCalendarLink(appointment);
    const icsContent = generateICSFile(appointment);

    res.json({
      googleCalendarLink,
      icsContent,
      icsFileName: `appointment-${appointment._id}.ics`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating calendar links', error: error.message });
  }
});

// Download ICS file for an appointment
router.get('/:id/calendar/download', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has access to this appointment
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const icsContent = generateICSFile(appointment);
    const fileName = `appointment-${appointment._id}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading calendar file', error: error.message });
  }
});

module.exports = router;
