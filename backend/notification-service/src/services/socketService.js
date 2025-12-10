const { Server } = require('socket.io');

let io = null;
const userSockets = new Map(); // userId -> Set of socket ids

const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle user authentication/registration
    socket.on('register', (userId) => {
      if (!userId) return;
      
      // Store socket mapping
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socket.userId = userId;
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Handle joining appointment chat room
    socket.on('join_appointment', (appointmentId) => {
      if (!appointmentId) return;
      socket.join(`appointment:${appointmentId}`);
      console.log(`Socket ${socket.id} joined appointment room: ${appointmentId}`);
    });

    // Handle leaving appointment chat room
    socket.on('leave_appointment', (appointmentId) => {
      if (!appointmentId) return;
      socket.leave(`appointment:${appointmentId}`);
      console.log(`Socket ${socket.id} left appointment room: ${appointmentId}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ appointmentId, userName }) => {
      socket.to(`appointment:${appointmentId}`).emit('user_typing', { userName });
    });

    socket.on('stop_typing', ({ appointmentId }) => {
      socket.to(`appointment:${appointmentId}`).emit('user_stopped_typing');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (socket.userId) {
        const sockets = userSockets.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(socket.userId);
          }
        }
      }
    });
  });

  return io;
};

// Send notification to specific user
const sendNotificationToUser = (userId, notification) => {
  if (!io) {
    console.log('Socket.IO not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit('notification', notification);
  console.log(`📤 Notification sent to user ${userId}`);
};

// Send message to appointment chat room
const sendMessageToAppointment = (appointmentId, message) => {
  if (!io) {
    console.log('Socket.IO not initialized');
    return;
  }
  
  io.to(`appointment:${appointmentId}`).emit('new_message', message);
  console.log(`📤 Message sent to appointment ${appointmentId}`);
};

// Broadcast appointment status change
const broadcastAppointmentUpdate = (appointmentId, update) => {
  if (!io) {
    console.log('Socket.IO not initialized');
    return;
  }
  
  io.to(`appointment:${appointmentId}`).emit('appointment_update', update);
};

// Get connected users count
const getConnectedUsersCount = () => {
  return userSockets.size;
};

// Check if user is online
const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

module.exports = {
  initSocketServer,
  sendNotificationToUser,
  sendMessageToAppointment,
  broadcastAppointmentUpdate,
  getConnectedUsersCount,
  isUserOnline
};
