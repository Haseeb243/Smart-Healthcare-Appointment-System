// API base URLs
export const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:4001/api';
export const APPOINTMENT_API_URL = process.env.NEXT_PUBLIC_APPOINTMENT_API_URL || 'http://localhost:4002/api';
export const NOTIFICATION_API_URL = process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:4003/api';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4003';

// Helper function to safely parse JSON error response
async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      return error.message || defaultMessage;
    }
    return defaultMessage;
  } catch {
    return defaultMessage;
  }
}

// Auth API functions
export async function login(email: string, password: string) {
  const response = await fetch(`${AUTH_API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Login failed');
    throw new Error(message);
  }
  
  return response.json();
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'doctor';
  specialization?: string;
  phone?: string;
}) {
  const response = await fetch(`${AUTH_API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Registration failed');
    throw new Error(message);
  }
  
  return response.json();
}

export async function logout() {
  const response = await fetch(`${AUTH_API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Logout failed');
  }
  
  return response.json();
}

export async function getCurrentUser() {
  const response = await fetch(`${AUTH_API_URL}/auth/me`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    return null;
  }
  
  return response.json();
}

export async function getDoctors() {
  const response = await fetch(`${AUTH_API_URL}/auth/doctors`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch doctors');
  }
  
  return response.json();
}

// Appointment API functions
export async function createAppointment(data: {
  doctorId: string;
  doctorName: string;
  doctorEmail?: string;
  date: string;
  timeSlot: string;
  reason: string;
  patientName: string;
  patientEmail: string;
}) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to create appointment');
    throw new Error(message);
  }
  
  return response.json();
}

export async function getPatientAppointments() {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/patient`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  
  return response.json();
}

export async function getDoctorAppointments() {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/doctor`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  
  return response.json();
}

export async function approveAppointment(id: string, notes?: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ notes }),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to approve appointment');
    throw new Error(message);
  }
  
  return response.json();
}

export async function cancelAppointment(id: string, notes?: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ notes }),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to cancel appointment');
    throw new Error(message);
  }
  
  return response.json();
}

export async function completeAppointment(id: string, notes?: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ notes }),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to complete appointment');
    throw new Error(message);
  }
  
  return response.json();
}

// Rate appointment
export async function rateAppointment(id: string, score: number, comment?: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ score, comment })
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to submit rating');
    throw new Error(message);
  }

  return response.json();
}

// Reschedule appointment functions
export async function requestReschedule(id: string, requestedDate: string, requestedTimeSlot: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/reschedule-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ requestedDate, requestedTimeSlot }),
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to request reschedule');
    throw new Error(message);
  }
  
  return response.json();
}

export async function approveReschedule(id: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/reschedule-approve`, {
    method: 'PATCH',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to approve reschedule');
    throw new Error(message);
  }
  
  return response.json();
}

export async function declineReschedule(id: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/reschedule-decline`, {
    method: 'PATCH',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to decline reschedule');
    throw new Error(message);
  }
  
  return response.json();
}

// Calendar link functions
export async function getCalendarLinks(id: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/calendar`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch calendar links');
  }
  
  return response.json();
}

export async function downloadCalendarFile(id: string) {
  const response = await fetch(`${APPOINTMENT_API_URL}/appointments/${id}/calendar/download`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to download calendar file');
  }
  
  const blob = await response.blob();
  return blob;
}

// Notification API functions
export async function getNotifications(userId: string, limit = 20, unreadOnly = false) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (unreadOnly) params.append('unreadOnly', 'true');
  
  const response = await fetch(`${NOTIFICATION_API_URL}/notifications/${userId}?${params}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  
  return response.json();
}

export async function getUnreadNotificationCount(userId: string) {
  const response = await fetch(`${NOTIFICATION_API_URL}/notifications/${userId}/unread-count`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }
  
  return response.json();
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await fetch(`${NOTIFICATION_API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  
  return response.json();
}

export async function markAllNotificationsAsRead(userId: string) {
  const response = await fetch(`${NOTIFICATION_API_URL}/notifications/${userId}/read-all`, {
    method: 'PATCH',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
  
  return response.json();
}

// Message API functions
export async function getMessages(appointmentId: string, limit = 50) {
  const params = new URLSearchParams({ limit: limit.toString() });
  
  const response = await fetch(`${NOTIFICATION_API_URL}/messages/appointment/${appointmentId}?${params}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  
  return response.json();
}

export async function sendMessage(data: {
  appointmentId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  file?: File;
}) {
  const formData = new FormData();
  formData.append('appointmentId', data.appointmentId);
  formData.append('senderId', data.senderId);
  formData.append('senderRole', data.senderRole);
  formData.append('senderName', data.senderName);
  formData.append('receiverId', data.receiverId);
  formData.append('receiverName', data.receiverName);
  formData.append('content', data.content);
  
  if (data.file) {
    formData.append('file', data.file);
  }

  const response = await fetch(`${NOTIFICATION_API_URL}/messages`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Failed to send message');
    throw new Error(message);
  }
  
  return response.json();
}

export async function markMessagesAsRead(appointmentId: string, userId: string) {
  const response = await fetch(`${NOTIFICATION_API_URL}/messages/appointment/${appointmentId}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ userId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark messages as read');
  }
  
  return response.json();
}
