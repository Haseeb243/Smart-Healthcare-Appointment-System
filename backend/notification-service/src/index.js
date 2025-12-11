require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initEventSubscriber } = require('./events/subscriber-kafka');
const { initEmailService } = require('./services/emailService');
const { initSocketServer } = require('./services/socketService');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for message sending
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit to 30 messages per minute
  message: { message: 'Too many messages, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(limiter); // Apply general rate limiting
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Routes with rate limiting
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);

// Start server and services
const PORT = process.env.PORT || 4003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-notifications';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize email service
    initEmailService();
    
    // Initialize Socket.IO server
    initSocketServer(server);
    console.log('Socket.IO server initialized');
    
    // Initialize event subscriber (Kafka)
    await initEventSubscriber();
    
    server.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
      console.log('Listening for appointment events via Kafka...');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
