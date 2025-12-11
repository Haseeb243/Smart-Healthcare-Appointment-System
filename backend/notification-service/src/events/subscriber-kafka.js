const { Kafka } = require('kafkajs');
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');
const { sendNotificationToUser, broadcastAppointmentUpdate } = require('../services/socketService');

// Event types
const EVENTS = {
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED'
};

// Topics
const TOPICS = {
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

const handleAppointmentRescheduled = async (data) => {
  console.log('📅 NOTIFICATION: Appointment Rescheduled');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Old: ${new Date(data.oldDate).toLocaleDateString()} at ${data.oldTimeSlot}`);
  console.log(`   New: ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot}`);
  console.log(`   Requested by: ${data.requestedBy}`);
  
  // Notify the requester that reschedule was approved
  if (data.requestedBy === 'patient' && data.patientId) {
    await createNotification(
      data.patientId,
      'patient',
      'APPOINTMENT_RESCHEDULED',
      'Reschedule Request Approved',
      `Your reschedule request for appointment with Dr. ${data.doctorName} has been approved. New date: ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot}`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        doctorName: data.doctorName,
        date: data.newDate,
        timeSlot: data.newTimeSlot
      }
    );
  } else if (data.requestedBy === 'doctor' && data.doctorId) {
    await createNotification(
      data.doctorId,
      'doctor',
      'APPOINTMENT_RESCHEDULED',
      'Reschedule Request Approved',
      `Your reschedule request for appointment with ${data.patientName} has been approved. New date: ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot}`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        doctorName: data.doctorName,
        date: data.newDate,
        timeSlot: data.newTimeSlot
      }
    );
  }
  
  // Notify the other party about the reschedule
  if (data.requestedBy === 'patient' && data.doctorId) {
    await createNotification(
      data.doctorId,
      'doctor',
      'APPOINTMENT_RESCHEDULED',
      'Appointment Rescheduled',
      `Your appointment with ${data.patientName} has been rescheduled to ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot}`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        doctorName: data.doctorName,
        date: data.newDate,
        timeSlot: data.newTimeSlot
      }
    );
  } else if (data.requestedBy === 'doctor' && data.patientId) {
    await createNotification(
      data.patientId,
      'patient',
      'APPOINTMENT_RESCHEDULED',
      'Appointment Rescheduled',
      `Your appointment with Dr. ${data.doctorName} has been rescheduled to ${new Date(data.newDate).toLocaleDateString()} at ${data.newTimeSlot}`,
      {
        appointmentId: data.appointmentId,
        patientName: data.patientName,
        doctorName: data.doctorName,
        date: data.newDate,
        timeSlot: data.newTimeSlot
      }
    );
  }
  
  // Send emails to both parties
  if (data.patientEmail) {
    await sendEmail(data.patientEmail, 'APPOINTMENT_RESCHEDULED', data);
  }
  if (data.doctorEmail) {
    await sendEmail(data.doctorEmail, 'APPOINTMENT_RESCHEDULED', data);
  }
  
  // Broadcast appointment update
  if (data.appointmentId) {
    broadcastAppointmentUpdate(data.appointmentId, {
      status: 'rescheduled',
      type: 'APPOINTMENT_RESCHEDULED',
      newDate: data.newDate,
      newTimeSlot: data.newTimeSlot
    });
  }
};

// Event handlers map
const eventHandlers = {
  [EVENTS.APPOINTMENT_CREATED]: handleAppointmentCreated,
  [EVENTS.APPOINTMENT_APPROVED]: handleAppointmentApproved,
  [EVENTS.APPOINTMENT_CANCELLED]: handleAppointmentCancelled,
  [EVENTS.APPOINTMENT_COMPLETED]: handleAppointmentCompleted,
  [EVENTS.APPOINTMENT_RESCHEDULED]: handleAppointmentRescheduled
};

let consumer = null;
let kafka = null;

const initEventSubscriber = async () => {
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  
  kafka = new Kafka({
    clientId: 'notification-service',
    brokers: kafkaBrokers,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  });
  
  consumer = kafka.consumer({ groupId: 'notification-service-group' });
  
  try {
    await consumer.connect();
    console.log('Event Subscriber connected to Kafka');
    
    // Subscribe to appointments topic
    await consumer.subscribe({ topic: TOPICS.APPOINTMENTS, fromBeginning: false });
    console.log(`Subscribed to topic: ${TOPICS.APPOINTMENTS}`);
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`\n[${event.timestamp}] Received event from topic ${topic}: ${event.type}`);
          
          const handler = eventHandlers[event.type];
          if (handler) {
            await handler(event.data);
          } else {
            console.log(`No handler for event type: ${event.type}`);
          }
        } catch (error) {
          console.error('Error processing event:', error);
        }
      }
    });
    
    console.log('Kafka consumer is now listening for events...');
  } catch (error) {
    console.error('Kafka Consumer connection error:', error);
    throw error;
  }
  
  return consumer;
};

const disconnectSubscriber = async () => {
  if (consumer) {
    await consumer.disconnect();
    console.log('Kafka Consumer disconnected');
  }
};

module.exports = {
  initEventSubscriber,
  disconnectSubscriber,
  EVENTS,
  TOPICS
};
