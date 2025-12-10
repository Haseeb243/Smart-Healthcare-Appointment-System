const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

// Get notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Get unread count for a user
router.get('/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// Mark all notifications as read for a user
router.patch('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// Delete a notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

// Delete all read notifications for a user
router.delete('/:userId/clear-read', async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.deleteMany({ userId, read: true });

    res.json({ message: 'Read notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Error clearing notifications', error: error.message });
  }
});

module.exports = router;
