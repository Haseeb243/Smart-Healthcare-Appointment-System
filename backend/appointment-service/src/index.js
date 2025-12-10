require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const appointmentRoutes = require('./routes/appointments');
const { initEventPublisher } = require('./events/publisher');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'appointment-service' });
});

// Routes
app.use('/api/appointments', appointmentRoutes);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 4002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-appointments';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize event publisher
    initEventPublisher();
    
    app.listen(PORT, () => {
      console.log(`Appointment Service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
