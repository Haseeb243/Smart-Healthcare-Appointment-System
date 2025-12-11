'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, sendMessage, markMessagesAsRead } from '@/lib/api';

interface Message {
  _id: string;
  appointmentId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  senderName: string;
  receiverId: string;
  content: string;
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
  };
  read: boolean;
  createdAt: string;
}

interface MessagingPanelProps {
  appointmentId: string;
  receiverId: string;
  receiverName: string;
  receiverRole: 'patient' | 'doctor';
  onClose: () => void;
}

export default function MessagingPanel({
  appointmentId,
  receiverId,
  receiverName,
  receiverRole,
  onClose,
}: MessagingPanelProps) {
  const { user } = useAuth();
  const { 
    joinAppointmentRoom, 
    leaveAppointmentRoom, 
    onNewMessage, 
    sendTyping, 
    stopTyping,
    onTyping,
    onStopTyping,
    getUserOnlineStatus
  } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReceiverOnline, setIsReceiverOnline] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages and join room
  useEffect(() => {
    if (!appointmentId || !user?._id) return;

    const loadMessages = async () => {
      try {
        const data = await getMessages(appointmentId);
        setMessages(data.messages || []);
        // Mark messages as read
        await markMessagesAsRead(appointmentId, user._id);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    joinAppointmentRoom(appointmentId);
    
    // Check receiver online status
    setIsReceiverOnline(getUserOnlineStatus(receiverId));

    return () => {
      leaveAppointmentRoom(appointmentId);
    };
  }, [appointmentId, user?._id, receiverId, joinAppointmentRoom, leaveAppointmentRoom, getUserOnlineStatus]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = onNewMessage((message: Message) => {
      if (message.appointmentId === appointmentId) {
        setMessages(prev => [...prev, message]);
        // Mark as read if we're the receiver
        if (user?._id && message.receiverId === user._id) {
          markMessagesAsRead(appointmentId, user._id).catch(console.error);
        }
      }
    });

    return unsubscribe;
  }, [appointmentId, user?._id, onNewMessage]);

  // Listen for typing indicator
  useEffect(() => {
    const unsubscribeTyping = onTyping((data) => {
      if (data.userName !== user?.name) {
        setTypingUser(data.userName);
      }
    });

    const unsubscribeStopTyping = onStopTyping(() => {
      setTypingUser(null);
    });

    return () => {
      unsubscribeTyping();
      unsubscribeStopTyping();
    };
  }, [user?.name, onTyping, onStopTyping]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleTyping = () => {
    if (!isTyping && user?.name) {
      setIsTyping(true);
      sendTyping(appointmentId, user.name);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(appointmentId);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !user?._id || !user?.name || sending) return;

    // If the browser still holds a file selection but we cleared state, drop it
    if (!selectedFile && fileInputRef.current?.files?.length) {
      fileInputRef.current.value = '';
    }

    const fileToSend = selectedFile || undefined;

    setSending(true);
    setIsTyping(false);
    stopTyping(appointmentId);

    try {
      const messageData = {
        appointmentId,
        senderId: user._id,
        senderRole: user.role as 'patient' | 'doctor',
        senderName: user.name,
        receiverId,
        receiverName,
        content: newMessage.trim() || (fileToSend ? `Sent a file: ${fileToSend.name}` : ''),
        file: fileToSend,
      };

      await sendMessage(messageData);
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, JPEG, and PNG files are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {receiverName.charAt(0).toUpperCase()}
              </div>
              {isReceiverOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div>
              <h2 className="font-bold">
                {receiverRole === 'doctor' ? 'Dr. ' : ''}{receiverName}
              </h2>
              <p className="text-sm text-blue-100">
                {isReceiverOnline ? 'Online' : 'Offline'} • {receiverRole}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Start the conversation</h3>
              <p className="text-gray-500 mt-1">
                Send a message to {receiverRole === 'doctor' ? 'Dr. ' : ''}{receiverName}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {formatDateSeparator(dateMessages[0].createdAt)}
                    </div>
                  </div>

                  {/* Messages */}
                  {dateMessages.map((message) => {
                    const isOwnMessage = message.senderId === user._id;
                    const attachment = message.attachment;
                    const isImageAttachment = attachment?.fileType?.startsWith('image/');
                    const attachmentHref = attachment?.fileUrl
                      ? `${process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:4003/api'}${attachment.fileUrl}`
                      : undefined;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                              : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                          }`}
                        >
                          {attachment && attachment.fileName && attachment.fileUrl && (
                            <a
                              href={attachmentHref}
                              target={attachmentHref ? "_blank" : undefined}
                              rel={attachmentHref ? "noopener noreferrer" : undefined}
                              className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${
                                isOwnMessage ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isOwnMessage ? 'bg-white/20' : 'bg-gray-200'
                              }`}>
                                {isImageAttachment ? '🖼️' : '📄'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isOwnMessage ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {attachment.fileName || 'Attachment'}
                                </p>
                                {typeof attachment.fileSize === 'number' && (
                                  <p className={`text-xs ${
                                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    {formatFileSize(attachment.fileSize)}
                                  </p>
                                )}
                              </div>
                              <svg className={`w-5 h-5 ${isOwnMessage ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </a>
                          )}
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(message.createdAt)}
                            {isOwnMessage && message.read && (
                              <span className="ml-1">✓✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {typingUser && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 rounded-2xl px-4 py-2 rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">{typingUser} is typing</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-gray-100"
        >
          {/* File preview */}
          {selectedFile && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl">
                  {selectedFile.type.startsWith('image/') ? '🖼️' : '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 hover:bg-blue-100 rounded-lg text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-700"
              title="Attach file (PDF, JPEG, PNG - max 5MB)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && !selectedFile) || sending}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
