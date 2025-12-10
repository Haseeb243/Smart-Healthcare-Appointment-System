require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { initEventSubscriber } = require('./events/subscriber');
const { initEmailService } = require('./services/emailService');
const { initSocketServer } = require('./services/socketService');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// Start server and services
const PORT = process.env.PORT || 4003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-notifications';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize email service
    initEmailService();
    
    // Initialize Socket.IO server
    initSocketServer(server);
    console.log('Socket.IO server initialized');
    
    // Initialize event subscriber
    initEventSubscriber();
    
    server.listen(PORT, () => {
      console.log(`Notification Service running on port ${PORT}`);
      console.log('Listening for appointment events...');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
