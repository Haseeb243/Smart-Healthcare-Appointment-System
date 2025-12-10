const Redis = require('ioredis');

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

// Notification handlers for each event type
const handleAppointmentCreated = (data) => {
  console.log('📧 NOTIFICATION: New Appointment Created');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Time: ${data.timeSlot}`);
  console.log(`   Reason: ${data.reason}`);
  console.log('   → Sending email notification to doctor...');
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
};

const handleAppointmentApproved = (data) => {
  console.log('✅ NOTIFICATION: Appointment Approved');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Time: ${data.timeSlot}`);
  console.log('   → Sending email notification to patient...');
  // In production, integrate with email service
};

const handleAppointmentCancelled = (data) => {
  console.log('❌ NOTIFICATION: Appointment Cancelled');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log(`   Cancelled by: ${data.cancelledBy}`);
  console.log('   → Sending email notification to both parties...');
  // In production, integrate with email service
};

const handleAppointmentCompleted = (data) => {
  console.log('🎉 NOTIFICATION: Appointment Completed');
  console.log(`   Patient: ${data.patientName} (${data.patientEmail})`);
  console.log(`   Doctor: ${data.doctorName}`);
  console.log(`   Date: ${new Date(data.date).toLocaleDateString()}`);
  console.log('   → Sending follow-up email to patient...');
  // In production, integrate with email service
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
