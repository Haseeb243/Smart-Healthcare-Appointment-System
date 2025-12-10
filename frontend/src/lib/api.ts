// API base URLs
export const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:4001/api';
export const APPOINTMENT_API_URL = process.env.NEXT_PUBLIC_APPOINTMENT_API_URL || 'http://localhost:4002/api';

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
