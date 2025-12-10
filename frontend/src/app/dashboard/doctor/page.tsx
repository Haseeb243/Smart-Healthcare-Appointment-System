'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getDoctorAppointments, approveAppointment, cancelAppointment, completeAppointment } from '@/lib/api';

interface Appointment {
  _id: string;
  patientName: string;
  patientEmail: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  notes?: string;
}

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await getDoctorAppointments();
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAppointment(id);
      loadAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve appointment');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    try {
      await cancelAppointment(id);
      loadAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel appointment');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeAppointment(id);
      loadAppointments();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to complete appointment');
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

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    return apt.status === filter;
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    approved: appointments.filter(a => a.status === 'approved').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Doctor Dashboard</h1>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                <p className="text-gray-600 text-sm">Total</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg shadow-md text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-gray-600 text-sm">Pending</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg shadow-md text-center">
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-gray-600 text-sm">Approved</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg shadow-md text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                <p className="text-gray-600 text-sm">Completed</p>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
              <select
                className="px-4 py-2 border rounded-md"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Appointments</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-lg shadow-md">
              {filteredAppointments.length === 0 ? (
                <p className="p-6 text-gray-500 text-center">No appointments found.</p>
              ) : (
                <div className="divide-y">
                  {filteredAppointments.map((apt) => (
                    <div key={apt._id} className="p-6">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{apt.patientName}</h3>
                          <p className="text-gray-600">{apt.patientEmail}</p>
                          <p className="text-gray-500 mt-2">
                            <span className="font-medium">Date:</span> {new Date(apt.date).toLocaleDateString()} at {apt.timeSlot}
                          </p>
                          <p className="text-gray-500">
                            <span className="font-medium">Reason:</span> {apt.reason}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(apt.status)}`}>
                            {apt.status}
                          </span>
                          <div className="flex gap-2 mt-2">
                            {apt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(apt._id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCancel(apt._id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {apt.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleComplete(apt._id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleCancel(apt._id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
