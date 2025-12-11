const express = require('express');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { sendMessageToAppointment, sendNotificationToUser } = require('../services/socketService');
const upload = require('../middleware/upload');

const router = express.Router();

// Get messages for an appointment
router.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { limit = 50, before } = req.query;

    const query = { appointmentId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Return in chronological order
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// Send a message (with optional file attachment)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { 
      appointmentId, 
      senderId, 
      senderRole, 
      senderName, 
      receiverId, 
      receiverName,
      content 
    } = req.body;

    // Validate required fields
    if (!appointmentId || !senderId || !senderRole || !senderName || !receiverId || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prepare message data
    const messageData = {
      appointmentId,
      senderId,
      senderRole,
      senderName,
      receiverId,
      content: content.trim()
    };

    // Add attachment info if file was uploaded
    if (req.file) {
      messageData.attachment = {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileUrl: `/api/messages/files/${req.file.filename}`
      };
    }

    // Create message
    const message = new Message(messageData);
    await message.save();

    // Send real-time message via socket
    sendMessageToAppointment(appointmentId, {
      _id: message._id,
      appointmentId: message.appointmentId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      senderName: message.senderName,
      receiverId: message.receiverId,
      content: message.content,
      attachment: message.attachment,
      read: message.read,
      createdAt: message.createdAt
    });

    // Create notification for receiver
    const notificationMessage = req.file 
      ? `${senderName} sent a file: ${req.file.originalname}`
      : `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;

    const notification = new Notification({
      userId: receiverId,
      userRole: senderRole === 'patient' ? 'doctor' : 'patient',
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: notificationMessage,
      data: {
        appointmentId,
        patientName: senderRole === 'patient' ? senderName : receiverName,
        doctorName: senderRole === 'doctor' ? senderName : receiverName
      }
    });

    await notification.save();

    // Send real-time notification
    sendNotificationToUser(receiverId, {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt
    });

    res.status(201).json({ message: message.toObject() });
  } catch (error) {
    // Clean up uploaded file if message creation failed
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// Mark messages as read
router.patch('/appointment/:appointmentId/read', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    await Message.updateMany(
      { appointmentId, receiverId: userId, read: false },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error updating messages', error: error.message });
  }
});

// Get unread message count for a user
router.get('/unread/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const unreadCount = await Message.countDocuments({ 
      receiverId: userId, 
      read: false 
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// Download/serve attachment file
router.get('/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Error serving file', error: error.message });
  }
});

module.exports = router;
