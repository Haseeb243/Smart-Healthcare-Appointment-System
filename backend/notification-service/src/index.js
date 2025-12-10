require('dotenv').config();
const express = require('express');
const { initEventSubscriber } = require('./events/subscriber');

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Start server and event subscriber
const PORT = process.env.PORT || 4003;

// Initialize event subscriber
initEventSubscriber();

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log('Listening for appointment events...');
});
