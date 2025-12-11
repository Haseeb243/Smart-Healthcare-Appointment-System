const { Kafka } = require('kafkajs');

let producer = null;
let kafka = null;

const initEventPublisher = async () => {
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  
  kafka = new Kafka({
    clientId: 'appointment-service',
    brokers: kafkaBrokers,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  });
  
  producer = kafka.producer();
  
  try {
    await producer.connect();
    console.log('Event Publisher connected to Kafka');
  } catch (error) {
    console.error('Kafka Producer connection error:', error);
    throw error;
  }
  
  return producer;
};

const publishEvent = async (topic, event) => {
  if (!producer) {
    console.error('Publisher not initialized');
    return;
  }
  
  try {
    const message = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    await producer.send({
      topic,
      messages: [
        {
          key: event.data?.appointmentId?.toString() || Date.now().toString(),
          value: JSON.stringify(message)
        }
      ]
    });
    
    console.log(`Event published to topic ${topic}:`, event.type);
  } catch (error) {
    console.error('Error publishing event:', error);
  }
};

const disconnectPublisher = async () => {
  if (producer) {
    await producer.disconnect();
    console.log('Kafka Producer disconnected');
  }
};

// Event types
const EVENTS = {
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED'
};

// Topics (replacing channels)
const TOPICS = {
  APPOINTMENTS: 'appointments'
};

// For backward compatibility with existing code
const CHANNELS = TOPICS;

module.exports = {
  initEventPublisher,
  publishEvent,
  disconnectPublisher,
  EVENTS,
  TOPICS,
  CHANNELS
};
