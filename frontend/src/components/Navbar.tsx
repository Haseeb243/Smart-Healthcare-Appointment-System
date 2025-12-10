'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="font-bold text-xl">
            Healthcare Appointments
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm">
                  Welcome, {user.name} ({user.role})
                </span>
                <Link
                  href={`/dashboard/${user.role}`}
                  className="bg-blue-700 px-3 py-2 rounded hover:bg-blue-800 text-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 px-3 py-2 rounded hover:bg-red-600 text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-blue-700 px-3 py-2 rounded hover:bg-blue-800 text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-green-500 px-3 py-2 rounded hover:bg-green-600 text-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
