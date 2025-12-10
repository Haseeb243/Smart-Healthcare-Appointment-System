'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Smart Healthcare Appointment System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Book and manage your healthcare appointments with ease
        </p>
        
        {user ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">
              Welcome back, {user.name}!
            </p>
            <Link
              href={`/dashboard/${user.role}`}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-x-4">
            <Link
              href="/login"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Register
            </Link>
          </div>
        )}
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">For Patients</h3>
          <p className="text-gray-600">
            Browse available doctors, book appointments, and manage your healthcare schedule.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">For Doctors</h3>
          <p className="text-gray-600">
            Manage your appointment requests, approve or cancel bookings, and track your schedule.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
          <p className="text-gray-600">
            Your data is secure with HttpOnly cookies and protected routes.
          </p>
        </div>
      </div>
    </div>
  );
}
