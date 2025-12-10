'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MedicalIcons } from '@/components/ui/Icons';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    specialization: user?.specialization || '',
  });

  const handleSave = async () => {
    // In a real app, this would call an API to update the profile
    setIsEditing(false);
    // Show success message
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">{user?.name}</h1>
                <p className="text-blue-100 capitalize">{user?.role}</p>
                {user?.role === 'doctor' && user?.specialization && (
                  <p className="text-blue-200 text-sm mt-1">{user.specialization}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                  <Button
                    variant={isEditing ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      icon={<MedicalIcons.User />}
                    />
                    <Input
                      label="Email Address"
                      value={user?.email || ''}
                      disabled
                      icon={<MedicalIcons.Mail />}
                    />
                    <Input
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      icon={<MedicalIcons.Phone />}
                    />
                    <Input
                      label="Role"
                      value={user?.role || ''}
                      disabled
                      className="capitalize"
                    />
                    {user?.role === 'doctor' && (
                      <Input
                        label="Specialization"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        disabled={!isEditing}
                        icon={<MedicalIcons.Medical />}
                      />
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Security Section */}
              <Card className="mt-8">
                <CardHeader>
                  <h2 className="text-xl font-bold text-gray-900">Security</h2>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <h3 className="font-semibold text-gray-900">Password</h3>
                      <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Account Stats</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-semibold text-gray-900">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Appointments</span>
                    <span className="font-semibold text-gray-900">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Account Status</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-gray-900">Quick Actions</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MedicalIcons.Calendar />
                    <span className="ml-2">View Appointments</span>
                  </Button>
                  {user?.role === 'patient' && (
                    <Button variant="outline" className="w-full justify-start">
                      <MedicalIcons.Medical />
                      <span className="ml-2">Medical History</span>
                    </Button>
                  )}
                  {user?.role === 'doctor' && (
                    <Button variant="outline" className="w-full justify-start">
                      <MedicalIcons.Clock />
                      <span className="ml-2">Manage Schedule</span>
                    </Button>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
