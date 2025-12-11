'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    appointmentId?: string;
    patientName?: string;
    doctorName?: string;
  };
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications: socketNotifications, unreadCount: socketUnreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications on mount and merge with socket notifications
  useEffect(() => {
    if (!user?._id) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const data = await getNotifications(user._id, 20);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?._id]);

  // Merge socket notifications with existing ones
  useEffect(() => {
    if (socketNotifications.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n._id));
        const newNotifications = socketNotifications.filter(n => !existingIds.has(n._id));
        if (newNotifications.length > 0) {
          // Only increment unread count for truly new notifications
          setUnreadCount(prevCount => prevCount + newNotifications.filter(n => !n.read).length);
          return [...newNotifications, ...prev];
        }
        return prev;
      });
    }
  }, [socketNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) return;
    
    try {
      await markNotificationAsRead(notification._id);
      setNotifications(prev =>
        prev.map(n => (n._id === notification._id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      markAsRead(notification._id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?._id) return;
    
    try {
      await markAllNotificationsAsRead(user._id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CREATED':
        return '📅';
      case 'APPOINTMENT_APPROVED':
        return '✅';
      case 'APPOINTMENT_CANCELLED':
        return '❌';
      case 'APPOINTMENT_COMPLETED':
        return '🎉';
      case 'APPOINTMENT_RESCHEDULED':
        return '📅';
      case 'NEW_MESSAGE':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_CREATED':
        return 'bg-blue-100 border-blue-200';
      case 'APPOINTMENT_APPROVED':
        return 'bg-green-100 border-green-200';
      case 'APPOINTMENT_CANCELLED':
        return 'bg-red-100 border-red-200';
      case 'APPOINTMENT_COMPLETED':
        return 'bg-purple-100 border-purple-200';
      case 'APPOINTMENT_RESCHEDULED':
        return 'bg-yellow-100 border-yellow-200';
      case 'NEW_MESSAGE':
        return 'bg-indigo-100 border-indigo-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`font-medium text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="sticky bottom-0 bg-white px-4 py-3 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
