'use client';

import { useEffect, useState, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ui/Toast';
import { Card, CardBody } from '@/components/ui/Card';
import { getPatientAppointments } from '@/lib/api';

interface RatingEntry {
  _id: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  score: number;
  comment?: string;
  ratedAt?: string;
}

function PatientRatingsContent() {
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPatientAppointments();
        const rated = (res.appointments || [])
          .filter((apt: any) => apt.status === 'completed' && apt.rating?.score)
          .map((apt: any) => ({
            _id: apt._id,
            doctorName: apt.doctorName,
            date: apt.date,
            timeSlot: apt.timeSlot,
            score: apt.rating.score,
            comment: apt.rating.comment,
            ratedAt: apt.rating.ratedAt,
          }));
        setRatings(rated);
      } catch (error) {
        console.error('Error loading ratings:', error);
        showToast('Failed to load ratings', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const average = ratings.length
    ? (ratings.reduce((sum, r) => sum + (r.score || 0), 0) / ratings.length).toFixed(2)
    : '—';

  return (
    <DashboardLayout role="patient">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Ratings ⭐</h1>
            <p className="text-gray-600 mt-1">Review feedback you have submitted.</p>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardBody className="py-4 text-center">
              <p className="text-sm text-gray-500">Average Rating Given</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{average}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4 text-center">
              <p className="text-sm text-gray-500">Total Ratings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{ratings.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-4 text-center">
              <p className="text-sm text-gray-500">5-Star Count</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{ratings.filter(r => r.score === 5).length}</p>
            </CardBody>
          </Card>
        </div>

        {loading ? (
          <Card><CardBody>Loading ratings...</CardBody></Card>
        ) : ratings.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center text-gray-600">No ratings submitted yet.</CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => (
              <Card key={r._id}>
                <CardBody>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()} • {r.timeSlot}</p>
                      <h3 className="font-semibold text-gray-900">Dr. {r.doctorName}</h3>
                      {r.comment && <p className="text-sm text-gray-700 mt-1 italic">“{r.comment}”</p>}
                    </div>
                    <div className="text-2xl text-yellow-500">
                      {[1,2,3,4,5].map(n => (
                        <span key={n}>{n <= r.score ? '★' : '☆'}</span>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function PatientRatingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>}>
      <ProtectedRoute allowedRoles={['patient']}>
        <PatientRatingsContent />
      </ProtectedRoute>
    </Suspense>
  );
}
