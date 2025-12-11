'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '@/lib/api';

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

interface Message {
  _id: string;
  appointmentId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  senderName: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  joinAppointmentRoom: (appointmentId: string) => void;
  leaveAppointmentRoom: (appointmentId: string) => void;
  sendTyping: (appointmentId: string, userName: string) => void;
  stopTyping: (appointmentId: string) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onTyping: (callback: (data: { userName: string }) => void) => () => void;
  onStopTyping: (callback: () => void) => () => void;
  onAppointmentUpdate: (callback: (data: { status: string; type: string }) => void) => () => void;
  onOnlineStatus: (callback: (data: { userId: string; isOnline: boolean }) => void) => () => void;
  getUserOnlineStatus: (userId: string) => boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  
  // Store callbacks for events
  const messageCallbacks = useRef<Set<(message: Message) => void>>(new Set());
  const typingCallbacks = useRef<Set<(data: { userName: string }) => void>>(new Set());
  const stopTypingCallbacks = useRef<Set<() => void>>(new Set());
  const appointmentUpdateCallbacks = useRef<Set<(data: { status: string; type: string }) => void>>(new Set());
  const onlineStatusCallbacks = useRef<Set<(data: { userId: string; isOnline: boolean }) => void>>(new Set());
  
  // Store user ID ref for stable connection management
  const userIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentUserId = user?._id || null;
    
    // Only reconnect if user ID actually changed (login/logout)
    if (userIdRef.current === currentUserId && socketRef.current?.connected) {
      return;
    }
    
    userIdRef.current = currentUserId;
    
    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
    
    if (!currentUserId) {
      return;
    }

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      // Register user with socket
      if (userIdRef.current) {
        newSocket.emit('register', userIdRef.current);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      // Start polling fallback when disconnected
      startPolling();
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    newSocket.on('new_message', (message: Message) => {
      console.log('Received new message:', message);
      messageCallbacks.current.forEach(callback => callback(message));
    });

    newSocket.on('user_typing', (data: { userName: string }) => {
      typingCallbacks.current.forEach(callback => callback(data));
    });

    newSocket.on('user_stopped_typing', () => {
      stopTypingCallbacks.current.forEach(callback => callback());
    });

    newSocket.on('appointment_update', (data: { status: string; type: string }) => {
      appointmentUpdateCallbacks.current.forEach(callback => callback(data));
    });

    newSocket.on('user_online_status', (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => ({ ...prev, [data.userId]: data.isOnline }));
      onlineStatusCallbacks.current.forEach(callback => callback(data));
    });

    newSocket.on('reconnect', () => {
      console.log('Socket reconnected');
      stopPolling();
    });

    setSocket(newSocket);

    return () => {
      stopPolling();
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user?._id]);

  // Polling fallback for notifications when socket is disconnected
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !user?._id) return;
    
    console.log('Starting notification polling fallback');
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { getNotifications } = await import('@/lib/api');
        const data = await getNotifications(user._id, 20);
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(data.notifications);
        }
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 20000); // Poll every 20 seconds
  }, [user?._id]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Stopping notification polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const joinAppointmentRoom = useCallback((appointmentId: string) => {
    if (socket) {
      socket.emit('join_appointment', appointmentId);
    }
  }, [socket]);

  const leaveAppointmentRoom = useCallback((appointmentId: string) => {
    if (socket) {
      socket.emit('leave_appointment', appointmentId);
    }
  }, [socket]);

  const sendTyping = useCallback((appointmentId: string, userName: string) => {
    if (socket) {
      socket.emit('typing', { appointmentId, userName });
    }
  }, [socket]);

  const stopTyping = useCallback((appointmentId: string) => {
    if (socket) {
      socket.emit('stop_typing', { appointmentId });
    }
  }, [socket]);

  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    messageCallbacks.current.add(callback);
    return () => {
      messageCallbacks.current.delete(callback);
    };
  }, []);

  const onTyping = useCallback((callback: (data: { userName: string }) => void) => {
    typingCallbacks.current.add(callback);
    return () => {
      typingCallbacks.current.delete(callback);
    };
  }, []);

  const onStopTyping = useCallback((callback: () => void) => {
    stopTypingCallbacks.current.add(callback);
    return () => {
      stopTypingCallbacks.current.delete(callback);
    };
  }, []);

  const onAppointmentUpdate = useCallback((callback: (data: { status: string; type: string }) => void) => {
    appointmentUpdateCallbacks.current.add(callback);
    return () => {
      appointmentUpdateCallbacks.current.delete(callback);
    };
  }, []);

  const onOnlineStatus = useCallback((callback: (data: { userId: string; isOnline: boolean }) => void) => {
    onlineStatusCallbacks.current.add(callback);
    return () => {
      onlineStatusCallbacks.current.delete(callback);
    };
  }, []);

  const getUserOnlineStatus = useCallback((userId: string) => {
    return onlineUsers[userId] || false;
  }, [onlineUsers]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadCount,
        addNotification,
        clearNotifications,
        markAsRead,
        markAllAsRead,
        joinAppointmentRoom,
        leaveAppointmentRoom,
        sendTyping,
        stopTyping,
        onNewMessage,
        onTyping,
        onStopTyping,
        onAppointmentUpdate,
        onOnlineStatus,
        getUserOnlineStatus,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
