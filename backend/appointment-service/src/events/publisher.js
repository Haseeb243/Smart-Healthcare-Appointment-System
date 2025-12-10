const Redis = require('ioredis');

let publisher = null;

const initEventPublisher = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  publisher = new Redis(redisUrl);
  
  publisher.on('connect', () => {
    console.log('Event Publisher connected to Redis');
  });
  
  publisher.on('error', (err) => {
    console.error('Redis Publisher error:', err);
  });
  
  return publisher;
};

const publishEvent = async (channel, event) => {
  if (!publisher) {
    console.error('Publisher not initialized');
    return;
  }
  
  try {
    const message = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    });
    await publisher.publish(channel, message);
    console.log(`Event published to ${channel}:`, event.type);
  } catch (error) {
    console.error('Error publishing event:', error);
  }
};

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

module.exports = {
  initEventPublisher,
  publishEvent,
  EVENTS,
  CHANNELS
};
