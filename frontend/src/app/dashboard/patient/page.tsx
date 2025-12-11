'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getDoctors, createAppointment, getPatientAppointments, cancelAppointment, requestReschedule, rateAppointment } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, TextArea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MedicalIcons, specializations } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import MessagingPanel from '@/components/MessagingPanel';
import RescheduleModal from '@/components/RescheduleModal';
import CalendarLinks from '@/components/CalendarLinks';
import { SkeletonList, SkeletonStats } from '@/components/ui/Skeleton';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
}

interface Appointment {
  _id: string;
  doctorId: string;
  doctorName: string;
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

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

function PatientDashboardContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('');
  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments' | 'history'>('doctors');
  const [bookingData, setBookingData] = useState({
    date: '',
    timeSlot: '',
    reason: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [messagingAppointment, setMessagingAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [ratingAppointment, setRatingAppointment] = useState<Appointment | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    loadData();
    // Check if there's a tab parameter in URL
    const tab = searchParams?.get('tab');
    if (tab && (tab === 'doctors' || tab === 'appointments' || tab === 'history')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDoctor) return;
    
    setBookingLoading(true);
    try {
      await createAppointment({
        doctorId: selectedDoctor._id,
        doctorName: selectedDoctor.name,
        doctorEmail: selectedDoctor.email,
        date: bookingData.date,
        timeSlot: bookingData.timeSlot,
        reason: bookingData.reason,
        patientName: user.name,
        patientEmail: user.email
      });
      showToast('Appointment booked successfully!', 'success');
      setShowBookingModal(false);
      setSelectedDoctor(null);
      setBookingData({ date: '', timeSlot: '', reason: '' });
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to book appointment', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment(id);
      showToast('Appointment cancelled successfully', 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to cancel appointment', 'error');
    }
  };

  const handleRequestReschedule = async (date: string, timeSlot: string) => {
    if (!rescheduleAppointment) return;
    
    try {
      await requestReschedule(rescheduleAppointment._id, date, timeSlot);
      showToast('Reschedule request submitted successfully!', 'success');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to request reschedule', 'error');
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingAppointment) return;
    setRatingLoading(true);
    try {
      await rateAppointment(ratingAppointment._id, ratingScore, ratingComment);
      showToast('Rating submitted. Thank you!', 'success');
      setRatingAppointment(null);
      setRatingScore(5);
      setRatingComment('');
      loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit rating', 'error');
    } finally {
      setRatingLoading(false);
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = !filterSpecialization || doctor.specialization === filterSpecialization;
    return matchesSearch && matchesSpecialization;
  });

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'pending' || apt.status === 'approved'
  );
  
  const pastAppointments = appointments.filter(apt => 
    apt.status === 'completed' || apt.status === 'cancelled'
  );

  const ratedAppointments = appointments.filter(apt => apt.status === 'completed' && apt.rating?.score);
  const averageRating = ratedAppointments.length
    ? (ratedAppointments.reduce((sum, a) => sum + (a.rating?.score || 0), 0) / ratedAppointments.length).toFixed(2)
    : '—';

  const stats = {
    total: appointments.length,
    upcoming: upcomingAppointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    ratings: ratedAppointments.length,
    ratingAvg: averageRating,
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

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <DashboardLayout role="patient">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}! 👋</h1>
                <p className="text-gray-600 mt-1">Manage your healthcare journey from one place</p>
              </div>
              <Button
                onClick={() => setActiveTab('doctors')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <MedicalIcons.Calendar />
                <span className="ml-2">Book New Appointment</span>
              </Button>
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
                  { label: 'Total Appointments', value: stats.total, icon: '📅', color: 'from-blue-500 to-blue-600' },
                  { label: 'Upcoming', value: stats.upcoming, icon: '⏰', color: 'from-green-500 to-emerald-600' },
                  { label: 'Completed', value: stats.completed, icon: '✅', color: 'from-purple-500 to-indigo-600' },
                  { label: 'Cancelled', value: stats.cancelled, icon: '❌', color: 'from-red-500 to-rose-600' },
                  { label: 'Ratings Given', value: stats.ratings, icon: '⭐', color: 'from-amber-500 to-orange-500' },
                  { label: 'Avg Rating', value: stats.ratingAvg, icon: '🌟', color: 'from-yellow-500 to-amber-500' },
                ].map((stat, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
                    <CardBody className="text-center py-6">
                      <div className="text-3xl mb-2">{stat.icon}</div>
                      <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                  { id: 'doctors', label: 'Find Doctors', icon: '👨‍⚕️' },
                  { id: 'appointments', label: 'My Appointments', icon: '📋' },
                  { id: 'history', label: 'History', icon: '📜' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Find Doctors Tab */}
              {activeTab === 'doctors' && (
                <div className="space-y-6">
                  {/* Search and Filter */}
                  <Card>
                    <CardBody>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search doctors by name or specialization..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            }
                          />
                        </div>
                        <Select
                          value={filterSpecialization}
                          onChange={(e) => setFilterSpecialization(e.target.value)}
                          options={[
                            { value: '', label: 'All Specializations' },
                            ...specializations.map(s => ({ value: s.name, label: s.name }))
                          ]}
                          className="md:w-64"
                        />
                      </div>
                    </CardBody>
                  </Card>

                  {/* Doctors Grid */}
                  {filteredDoctors.length === 0 ? (
                    <Card>
                      <CardBody className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
                        <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                      </CardBody>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDoctors.map((doctor) => {
                        const specInfo = specializations.find(s => s.name === doctor.specialization);
                        return (
                          <Card key={doctor._id} hover>
                            <CardBody>
                              <div className="flex items-start gap-4">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${specInfo?.color || 'from-blue-500 to-indigo-500'} flex items-center justify-center text-white text-2xl font-bold`}>
                                  {doctor.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 text-lg">Dr. {doctor.name}</h3>
                                  <p className={`text-sm ${specInfo?.bgColor || 'bg-gray-100'} inline-block px-2 py-1 rounded-lg mt-1`}>
                                    {doctor.specialization}
                                  </p>
                                  <div className="flex items-center gap-1 mt-2">
                                    {[...Array(5)].map((_, i) => (
                                      <span key={i} className="text-yellow-400 text-sm">★</span>
                                    ))}
                                    <span className="text-gray-500 text-sm ml-1">(4.9)</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                  <span className="text-green-500">●</span> Available Today
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDoctor(doctor);
                                    setShowBookingModal(true);
                                  }}
                                >
                                  Book Now
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* My Appointments Tab */}
              {activeTab === 'appointments' && (
                <div className="space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <Card>
                      <CardBody className="text-center py-12">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming appointments</h3>
                        <p className="text-gray-500 mb-4">Book an appointment with a doctor to get started</p>
                        <Button onClick={() => setActiveTab('doctors')}>
                          Find Doctors
                        </Button>
                      </CardBody>
                    </Card>
                  ) : (
                    upcomingAppointments.map((apt) => (
                      <Card key={apt._id} hover>
                        <CardBody>
                          <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                                  👨‍⚕️
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 text-lg">{apt.doctorName}</h3>
                                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <MedicalIcons.Calendar />
                                      {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MedicalIcons.Clock />
                                      {apt.timeSlot}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-2">
                                    <span className="font-medium">Reason:</span> {apt.reason}
                                  </p>
                                  {apt.rescheduleRequest && apt.rescheduleRequest.status === 'pending' && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                      <p className="text-xs text-yellow-800">
                                        📅 Reschedule pending: {new Date(apt.rescheduleRequest.requestedDate).toLocaleDateString()} at {apt.rescheduleRequest.requestedTimeSlot}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(apt.status)}`}>
                                  {getStatusIcon(apt.status)} {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
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
                              
                              {(apt.status === 'approved' || apt.status === 'pending') && apt.rescheduleRequest?.status !== 'pending' && (
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
                              
                              {apt.status === 'approved' && (
                                <CalendarLinks appointmentId={apt._id} />
                              )}
                              
                              {apt.status === 'pending' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancelAppointment(apt._id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {pastAppointments.length === 0 ? (
                    <Card>
                      <CardBody className="text-center py-12">
                        <div className="text-6xl mb-4">📜</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No appointment history</h3>
                        <p className="text-gray-500">Your completed and cancelled appointments will appear here</p>
                      </CardBody>
                    </Card>
                  ) : (
                    pastAppointments.map((apt) => (
                      <Card key={apt._id}>
                        <CardBody>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${
                                apt.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {apt.status === 'completed' ? '✅' : '❌'}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{apt.doctorName}</h3>
                                <p className="text-sm text-gray-500">
                                  {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">Reason: {apt.reason}</p>
                                {apt.notes && (
                                  <p className="text-sm text-blue-600 mt-1">Doctor&apos;s notes: {apt.notes}</p>
                                )}
                                {apt.status === 'completed' && (
                                  <div className="mt-2 flex items-center gap-3 flex-wrap">
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
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setRatingAppointment(apt);
                                          setRatingScore(5);
                                          setRatingComment('');
                                        }}
                                      >
                                        Rate Appointment
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(apt.status)}`}>
                              {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                            </span>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Booking Modal */}
        <Modal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedDoctor(null);
            setBookingData({ date: '', timeSlot: '', reason: '' });
          }}
          title={`Book Appointment with Dr. ${selectedDoctor?.name || ''}`}
          size="lg"
        >
          <form onSubmit={handleBookAppointment} className="space-y-6">
            {selectedDoctor && (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                  {selectedDoctor.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Dr. {selectedDoctor.name}</h3>
                  <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
                </div>
              </div>
            )}

            <Input
              label="Select Date"
              type="date"
              value={bookingData.date}
              onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />

            <Select
              label="Select Time Slot"
              value={bookingData.timeSlot}
              onChange={(e) => setBookingData({ ...bookingData, timeSlot: e.target.value })}
              options={[
                { value: '', label: 'Choose a time slot' },
                ...timeSlots.map(slot => ({ value: slot, label: slot }))
              ]}
              required
            />

            <TextArea
              label="Reason for Visit"
              value={bookingData.reason}
              onChange={(e) => setBookingData({ ...bookingData, reason: e.target.value })}
              placeholder="Describe your symptoms or reason for the appointment..."
              rows={4}
              required
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedDoctor(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isLoading={bookingLoading}
              >
                Confirm Booking
              </Button>
            </div>
          </form>
        </Modal>

        {/* Messaging Panel */}
        {messagingAppointment && (
          <MessagingPanel
            appointmentId={messagingAppointment._id}
            receiverId={messagingAppointment.doctorId}
            receiverName={messagingAppointment.doctorName}
            receiverRole="doctor"
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
            doctorName={rescheduleAppointment.doctorName}
            role="patient"
          />
        )}

        {/* Rating Modal */}
        {ratingAppointment && (
          <Modal
            isOpen={!!ratingAppointment}
            onClose={() => {
              setRatingAppointment(null);
              setRatingScore(5);
              setRatingComment('');
            }}
            title={`Rate your visit with Dr. ${ratingAppointment.doctorName}`}
            size="md"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRatingScore(value)}
                    className={`text-2xl ${value <= ratingScore ? 'text-yellow-500' : 'text-gray-300'} focus:outline-none`}
                  >
                    {value <= ratingScore ? '★' : '☆'}
                  </button>
                ))}
                <span className="text-sm text-gray-600">{ratingScore} / 5</span>
              </div>
              <TextArea
                label="Leave a comment (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={4}
                placeholder="How was your consultation?"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRatingAppointment(null);
                    setRatingScore(5);
                    setRatingComment('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitRating}
                  isLoading={ratingLoading}
                >
                  Submit Rating
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function PatientDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <PatientDashboardContent />
    </Suspense>
  );
}
