const Redis = require('ioredis');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');
const { sendNotificationToUser, broadcastAppointmentUpdate } = require('../services/socketService');

// Event types
const EVENTS = {
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED'
};

// Channels
const CHANNELS = {
  APPOINTMENTS: 'appointments'
};

// Helper to create and save notification
const createNotification = async (userId, userRole, type, title, message, data) => {
  try {
    const notification = new Notification({
      userId,
      userRole,
      type,
      title,
      message,
      data
    });
    await notification.save();
    
    // Send real-time notification via Socket.IO
    sendNotificationToUser(userId, {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Notification handlers for each event type
const handleAppointmentCreated = async (data) => {
  console.log('📧 NOTIFICATION: New Appointment Created');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Time: ${data.timeSlot}`);
  console.log(`   Reason: ${data.reason}`);
  
  // Create notification for doctor
  if (data.doctorId) {
    await createNotification(
      data.doctorId,
      'doctor',
      'APPOINTMENT_CREATED',
      'New Appointment Request',
      `${data.patientName} has requested an appointment on ${new Date(data.date).toLocaleDateString()} at ${data.timeSlot}`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        doctorName: data.doctorName,
        date: data.date,
        timeSlot: data.timeSlot
      }
    );
  }
  
  // Send email to doctor
  if (data.doctorEmail) {
    await sendEmail(data.doctorEmail, 'APPOINTMENT_CREATED', data);
  }
  
  // Broadcast appointment update
  if (data.appointmentId) {
    broadcastAppointmentUpdate(data.appointmentId, {
      status: 'pending',
      type: 'APPOINTMENT_CREATED'
    });
  }
};

const handleAppointmentApproved = async (data) => {
  console.log('✅ NOTIFICATION: Appointment Approved');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Time: ${data.timeSlot}`);
  
  // Create notification for patient
  if (data.patientId) {
    await createNotification(
      data.patientId,
      'patient',
      'APPOINTMENT_APPROVED',
      'Appointment Approved! 🎉',
      `Your appointment with Dr. ${data.doctorName} on ${new Date(data.date).toLocaleDateString()} at ${data.timeSlot} has been approved.`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        doctorName: data.doctorName,
        date: data.date,
        timeSlot: data.timeSlot
      }
    );
  }
  
  // Send email to patient
  if (data.patientEmail) {
    await sendEmail(data.patientEmail, 'APPOINTMENT_APPROVED', data);
  }
  
  // Broadcast appointment update
  if (data.appointmentId) {
    broadcastAppointmentUpdate(data.appointmentId, {
      status: 'approved',
      type: 'APPOINTMENT_APPROVED'
    });
  }
};

const handleAppointmentCancelled = async (data) => {
  console.log('❌ NOTIFICATION: Appointment Cancelled');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Cancelled by: ${data.cancelledBy}`);
  
  // Create notification for patient (if cancelled by doctor)
  if (data.cancelledBy === 'doctor' && data.patientId) {
    await createNotification(
      data.patientId,
      'patient',
      'APPOINTMENT_CANCELLED',
      'Appointment Cancelled',
      `Your appointment with Dr. ${data.doctorName} on ${new Date(data.date).toLocaleDateString()} has been cancelled.`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        doctorName: data.doctorName,
        date: data.date,
        timeSlot: data.timeSlot
      }
    );
    
    // Send email to patient
    if (data.patientEmail) {
      await sendEmail(data.patientEmail, 'APPOINTMENT_CANCELLED', data);
    }
  }
  
  // Create notification for doctor (if cancelled by patient)
  if (data.cancelledBy === 'patient' && data.doctorId) {
    await createNotification(
      data.doctorId,
      'doctor',
      'APPOINTMENT_CANCELLED',
      'Appointment Cancelled',
      `${data.patientName} has cancelled their appointment on ${new Date(data.date).toLocaleDateString()}.`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        doctorName: data.doctorName,
        date: data.date,
        timeSlot: data.timeSlot
      }
    );
    
    // Send email to doctor
    if (data.doctorEmail) {
      await sendEmail(data.doctorEmail, 'APPOINTMENT_CANCELLED', data);
    }
  }
  
  // Broadcast appointment update
  if (data.appointmentId) {
    broadcastAppointmentUpdate(data.appointmentId, {
      status: 'cancelled',
      type: 'APPOINTMENT_CANCELLED'
    });
  }
};

const handleAppointmentCompleted = async (data) => {
  console.log('🎉 NOTIFICATION: Appointment Completed');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  
  // Create notification for patient
  if (data.patientId) {
    await createNotification(
      data.patientId,
      'patient',
      'APPOINTMENT_COMPLETED',
      'Appointment Completed',
      `Your appointment with Dr. ${data.doctorName} has been completed. Thank you for visiting!`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        patientEmail: data.patientEmail,
        doctorName: data.doctorName,
        date: data.date,
        timeSlot: data.timeSlot
      }
    );
  }
  
  // Send follow-up email to patient
  if (data.patientEmail) {
    await sendEmail(data.patientEmail, 'APPOINTMENT_COMPLETED', data);
  }
  
  // Broadcast appointment update
  if (data.appointmentId) {
    broadcastAppointmentUpdate(data.appointmentId, {
      status: 'completed',
      type: 'APPOINTMENT_COMPLETED'
    });
  }
};

// Event handlers map
const eventHandlers = {
  [EVENTS.APPOINTMENT_CREATED]: handleAppointmentCreated,
  [EVENTS.APPOINTMENT_APPROVED]: handleAppointmentApproved,
  [EVENTS.APPOINTMENT_CANCELLED]: handleAppointmentCancelled,
  [EVENTS.APPOINTMENT_COMPLETED]: handleAppointmentCompleted
};

let subscriber = null;

const initEventSubscriber = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  subscriber = new Redis(redisUrl);
  
  subscriber.on('connect', () => {
    console.log('Event Subscriber connected to Redis');
  });
  
  subscriber.on('error', (err) => {
    console.error('Redis Subscriber error:', err);
  });

  // Subscribe to appointment events
  subscriber.subscribe(CHANNELS.APPOINTMENTS, (err) => {
    if (err) {
      console.error('Failed to subscribe to appointments channel:', err);
    } else {
      console.log(`Subscribed to ${CHANNELS.APPOINTMENTS} channel`);
    }
  });

  // Handle incoming messages
  subscriber.on('message', (channel, message) => {
    try {
      const event = JSON.parse(message);
      console.log(`\n[${event.timestamp}] Received event on ${channel}: ${event.type}`);
      
      const handler = eventHandlers[event.type];
      if (handler) {
        handler(event.data);
      } else {
        console.log(`No handler for event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  });

  return subscriber;
};

module.exports = {
  initEventSubscriber,
  EVENTS,
  CHANNELS
};
