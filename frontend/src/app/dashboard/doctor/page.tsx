'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getDoctorAppointments, approveAppointment, cancelAppointment, completeAppointment, requestReschedule, approveReschedule, declineReschedule } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextArea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MedicalIcons } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import MessagingPanel from '@/components/MessagingPanel';
import RescheduleModal from '@/components/RescheduleModal';
import CalendarLinks from '@/components/CalendarLinks';
import { SkeletonList, SkeletonStats } from '@/components/ui/Skeleton';

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  date: string;
  timeSlot: string;
  reason: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  notes?: string;
  rescheduleRequest?: {
    requestedDate: Date;
    requestedTimeSlot: string;
    requestedBy: 'patient' | 'doctor';
    status: 'pending' | 'approved' | 'declined' | 'none';
    requestedAt: Date;
  };
  rating?: {
    score: number;
    comment?: string;
    ratedAt?: string;
  };
}

function DoctorDashboardContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'all' | 'completed'>('today');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [messagingAppointment, setMessagingAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointments();
    // Check if there's a tab parameter in URL
    const tab = searchParams?.get('tab');
    if (tab && (tab === 'today' || tab === 'upcoming' || tab === 'all' || tab === 'completed')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadAppointments = async () => {
    try {
      const response = await getDoctorAppointments();
      setAppointments(response.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      showToast('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await approveAppointment(id);
      showToast('Appointment approved successfully!', 'success');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to approve appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(true);
    try {
      await cancelAppointment(id);
      showToast('Appointment cancelled', 'success');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to cancel appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      await completeAppointment(selectedAppointment._id, notes);
      showToast('Appointment marked as completed!', 'success');
      setShowNotesModal(false);
      setSelectedAppointment(null);
      setNotes('');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReschedule = async (date: string, timeSlot: string) => {
    if (!rescheduleAppointment) return;
    
    try {
      await requestReschedule(rescheduleAppointment._id, date, timeSlot);
      showToast('Reschedule request submitted successfully!', 'success');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to request reschedule', 'error');
      throw error;
    }
  };

  const handleApproveReschedule = async (id: string) => {
    try {
      await approveReschedule(id);
      showToast('Reschedule request approved!', 'success');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to approve reschedule', 'error');
    }
  };

  const handleDeclineReschedule = async (id: string) => {
    try {
      await declineReschedule(id);
      showToast('Reschedule request declined', 'success');
      loadAppointments();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to decline reschedule', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'cancelled': return '❌';
      case 'completed': return '🎉';
      default: return '📋';
    }
  };

  const today = new Date().toISOString().split('T')[0];
  
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date).toISOString().split('T')[0];
    return aptDate === today && (apt.status === 'pending' || apt.status === 'approved');
  });

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date).toISOString().split('T')[0];
    return aptDate > today && (apt.status === 'pending' || apt.status === 'approved');
  });

  const completedAppointments = appointments.filter(apt => apt.status === 'completed');

  const getFilteredAppointments = () => {
    let filtered = appointments;
    
    switch (activeTab) {
      case 'today':
        filtered = todayAppointments;
        break;
      case 'upcoming':
        filtered = upcomingAppointments;
        break;
      case 'completed':
        filtered = completedAppointments;
        break;
      default:
        filtered = appointments;
    }

    if (filter !== 'all') {
      filtered = filtered.filter(apt => apt.status === filter);
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const ratings = appointments.filter(a => a.status === 'completed' && (a as any).rating?.score);
  const averageRating = ratings.length
    ? (ratings.reduce((sum, a: any) => sum + (a.rating?.score || 0), 0) / ratings.length).toFixed(2)
    : '—';

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    approved: appointments.filter(a => a.status === 'approved').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    today: todayAppointments.length,
    ratingAvg: averageRating,
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <DashboardLayout role="doctor">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome, Dr. {user?.name}! 👨‍⚕️</h1>
                <p className="text-gray-600 mt-1">
                  {user?.specialization && `${user.specialization} Specialist • `}
                  {todayAppointments.length} appointments today
                </p>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="space-y-8">
              <SkeletonStats />
              <SkeletonList count={3} />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                {[
                  { label: 'Today', value: stats.today, icon: '📅', color: 'from-blue-500 to-blue-600' },
                  { label: 'Total', value: stats.total, icon: '📊', color: 'from-gray-500 to-gray-600' },
                  { label: 'Pending', value: stats.pending, icon: '⏳', color: 'from-yellow-500 to-amber-600' },
                  { label: 'Approved', value: stats.approved, icon: '✅', color: 'from-green-500 to-emerald-600' },
                  { label: 'Completed', value: stats.completed, icon: '🎉', color: 'from-purple-500 to-indigo-600' },
                  { label: 'Avg Rating', value: stats.ratingAvg, icon: '⭐', color: 'from-amber-500 to-orange-500' },
                ].map((stat, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
                    <CardBody className="text-center py-4">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Quick Action Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
                  <CardBody className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Pending Requests</p>
                        <p className="text-4xl font-bold mt-1">{stats.pending}</p>
                      </div>
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">📋</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50"
                      size="sm"
                      onClick={() => {
                        setActiveTab('all');
                        setFilter('pending');
                      }}
                    >
                      Review Requests
                    </Button>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
                  <CardBody className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Today&apos;s Schedule</p>
                        <p className="text-4xl font-bold mt-1">{stats.today}</p>
                      </div>
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">🗓️</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-white text-green-600 hover:bg-green-50"
                      size="sm"
                      onClick={() => setActiveTab('today')}
                    >
                      View Schedule
                    </Button>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none">
                  <CardBody className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Patients Helped</p>
                        <p className="text-4xl font-bold mt-1">{stats.completed}</p>
                      </div>
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">💪</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-white text-purple-600 hover:bg-purple-50"
                      size="sm"
                      onClick={() => setActiveTab('completed')}
                    >
                      View History
                    </Button>
                  </CardBody>
                </Card>
              </div>

              {/* Tabs and Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {[
                    { id: 'today', label: "Today's", icon: '📅', count: todayAppointments.length },
                    { id: 'upcoming', label: 'Upcoming', icon: '⏰', count: upcomingAppointments.length },
                    { id: 'all', label: 'All', icon: '📋', count: appointments.length },
                    { id: 'completed', label: 'Completed', icon: '✅', count: completedAppointments.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as typeof activeTab);
                        setFilter('all');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                        activeTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {activeTab === 'all' && (
                  <Select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'pending', label: '⏳ Pending' },
                      { value: 'approved', label: '✅ Approved' },
                      { value: 'completed', label: '🎉 Completed' },
                      { value: 'cancelled', label: '❌ Cancelled' },
                    ]}
                    className="w-48"
                  />
                )}
              </div>

              {/* Appointments List */}
              <div className="space-y-4">
                {filteredAppointments.length === 0 ? (
                  <Card>
                    <CardBody className="text-center py-12">
                      <div className="text-6xl mb-4">
                        {activeTab === 'today' ? '🌟' : activeTab === 'completed' ? '📜' : '📋'}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {activeTab === 'today' ? 'No appointments today' : 
                         activeTab === 'completed' ? 'No completed appointments yet' : 
                         'No appointments found'}
                      </h3>
                      <p className="text-gray-500">
                        {activeTab === 'today' ? 'Enjoy your free day!' : 'Your appointments will appear here'}
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  filteredAppointments.map((apt) => (
                    <Card key={apt._id} hover>
                      <CardBody>
                        <div className="space-y-4">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                                {apt.patientName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-bold text-gray-900 text-lg">{apt.patientName}</h3>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(apt.status)}`}>
                                    {getStatusIcon(apt.status)} {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">{apt.patientEmail}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <MedicalIcons.Calendar />
                                    {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MedicalIcons.Clock />
                                    {apt.timeSlot}
                                  </span>
                                </div>
                                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                                  <p className="text-sm">
                                    <span className="font-medium text-gray-700">Reason:</span>{' '}
                                    <span className="text-gray-600">{apt.reason}</span>
                                  </p>
                                  {apt.notes && (
                                    <p className="text-sm mt-1">
                                      <span className="font-medium text-blue-700">Your Notes:</span>{' '}
                                      <span className="text-blue-600">{apt.notes}</span>
                                    </p>
                                  )}
                                  {apt.status === 'completed' && (
                                    <div className="text-sm mt-2 text-gray-700 flex items-center gap-2 flex-wrap">
                                      {apt.rating?.score ? (
                                        <>
                                          <span className="text-yellow-500">
                                            {[1,2,3,4,5].map((n) => (
                                              <span key={n}>{n <= apt.rating!.score ? '★' : '☆'}</span>
                                            ))}
                                          </span>
                                          {apt.rating.comment && (
                                            <span className="text-gray-600 italic">“{apt.rating.comment}”</span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-500">Awaiting patient rating</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Reschedule Request Alert */}
                                {apt.rescheduleRequest && apt.rescheduleRequest.status === 'pending' && (
                                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm font-medium text-yellow-900 mb-2">
                                      📅 Reschedule Request from Patient
                                    </p>
                                    <p className="text-xs text-yellow-800 mb-2">
                                      New time: {new Date(apt.rescheduleRequest.requestedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {apt.rescheduleRequest.requestedTimeSlot}
                                    </p>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleApproveReschedule(apt._id)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        ✓ Approve
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleDeclineReschedule(apt._id)}
                                      >
                                        ✕ Decline
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            {/* Message button - always visible */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMessagingAppointment(apt)}
                              className="flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Message
                            </Button>

                            {/* Pending appointment actions */}
                            {apt.status === 'pending' && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleApprove(apt._id)}
                                  isLoading={actionLoading}
                                >
                                  ✓ Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancel(apt._id)}
                                >
                                  ✕ Reject
                                </Button>
                              </>
                            )}

                            {/* Approved appointment actions */}
                            {apt.status === 'approved' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    setShowNotesModal(true);
                                  }}
                                >
                                  ✓ Complete
                                </Button>
                                
                                {/* Calendar Links */}
                                <CalendarLinks appointmentId={apt._id} />
                                
                                {/* Reschedule button if no pending request */}
                                {apt.rescheduleRequest?.status !== 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRescheduleAppointment(apt)}
                                    className="flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Reschedule
                                  </Button>
                                )}

                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancel(apt._id)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {/* Calendar links for completed appointments */}
                            {apt.status === 'completed' && (
                              <CalendarLinks appointmentId={apt._id} />
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Complete with Notes Modal */}
        <Modal
          isOpen={showNotesModal}
          onClose={() => {
            setShowNotesModal(false);
            setSelectedAppointment(null);
            setNotes('');
          }}
          title="Complete Appointment"
          size="lg"
        >
          <div className="space-y-6">
            {selectedAppointment && (
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {selectedAppointment.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedAppointment.patientName}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.timeSlot}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <TextArea
              label="Session Notes & Recommendations"
              placeholder="Add notes about the consultation, diagnosis, prescriptions, or follow-up recommendations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
            />

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedAppointment(null);
                  setNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                className="flex-1"
                onClick={handleComplete}
                isLoading={actionLoading}
              >
                Complete Appointment
              </Button>
            </div>
          </div>
        </Modal>

        {/* Messaging Panel */}
        {messagingAppointment && (
          <MessagingPanel
            appointmentId={messagingAppointment._id}
            receiverId={messagingAppointment.patientId}
            receiverName={messagingAppointment.patientName}
            receiverRole="patient"
            onClose={() => setMessagingAppointment(null)}
          />
        )}

        {/* Reschedule Modal */}
        {rescheduleAppointment && (
          <RescheduleModal
            isOpen={!!rescheduleAppointment}
            onClose={() => setRescheduleAppointment(null)}
            onSubmit={handleRequestReschedule}
            appointmentId={rescheduleAppointment._id}
            currentDate={rescheduleAppointment.date}
            currentTimeSlot={rescheduleAppointment.timeSlot}
            patientName={rescheduleAppointment.patientName}
            role="doctor"
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function DoctorDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>}>
      <DoctorDashboardContent />
    </Suspense>
  );
}
