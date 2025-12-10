'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getDoctors, createAppointment, getPatientAppointments, cancelAppointment } from '@/lib/api';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
}

interface Appointment {
  _id: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
}

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    doctorName: '',
    doctorEmail: '',
    date: '',
    timeSlot: '',
    reason: ''
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [doctorsResponse, appointmentsResponse] = await Promise.all([
        getDoctors(),
        getPatientAppointments()
      ]);
      setDoctors(doctorsResponse.doctors || []);
      setAppointments(appointmentsResponse.appointments || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setBookingData({
      ...bookingData,
      doctorId: doctor._id,
      doctorName: doctor.name,
      doctorEmail: doctor.email
    });
    setShowBookingForm(true);
    setBookingError('');
    setBookingSuccess('');
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (!user) return;

    try {
      await createAppointment({
        ...bookingData,
        patientName: user.name,
        patientEmail: user.email
      });
      setBookingSuccess('Appointment booked successfully!');
      setShowBookingForm(false);
      setBookingData({
        doctorId: '',
        doctorName: '',
        doctorEmail: '',
        date: '',
        timeSlot: '',
        reason: ''
      });
      loadData();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Failed to book appointment');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await cancelAppointment(id);
      loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Patient Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Available Doctors */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Available Doctors</h2>
              {doctors.length === 0 ? (
                <p className="text-gray-500">No doctors available at the moment.</p>
              ) : (
                <div className="space-y-4">
                  {doctors.map((doctor) => (
                    <div key={doctor._id} className="border rounded-lg p-4 hover:border-blue-500 transition">
                      <h3 className="font-semibold">{doctor.name}</h3>
                      <p className="text-gray-600 text-sm">{doctor.specialization}</p>
                      <button
                        onClick={() => handleDoctorSelect(doctor)}
                        className="mt-2 bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Book Appointment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Appointments */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">My Appointments</h2>
              {bookingSuccess && (
                <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
                  {bookingSuccess}
                </div>
              )}
              {appointments.length === 0 ? (
                <p className="text-gray-500">No appointments yet.</p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((apt) => (
                    <div key={apt._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{apt.doctorName}</h3>
                          <p className="text-gray-600 text-sm">
                            {new Date(apt.date).toLocaleDateString()} at {apt.timeSlot}
                          </p>
                          <p className="text-gray-500 text-sm">Reason: {apt.reason}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </div>
                      {apt.status === 'pending' && (
                        <button
                          onClick={() => handleCancelAppointment(apt._id)}
                          className="mt-2 text-red-600 text-sm hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Booking Form Modal */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold mb-4">Book Appointment with {bookingData.doctorName}</h2>
              
              {bookingError && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                  {bookingError}
                </div>
              )}
              
              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-md"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    value={bookingData.timeSlot}
                    onChange={(e) => setBookingData({ ...bookingData, timeSlot: e.target.value })}
                  >
                    <option value="">Select a time slot</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                  <textarea
                    required
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={bookingData.reason}
                    onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
                    placeholder="Describe your symptoms or reason for the appointment"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
