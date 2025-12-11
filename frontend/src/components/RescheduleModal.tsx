'use client';

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (date: string, timeSlot: string) => Promise<void>;
  appointmentId: string;
  currentDate: string;
  currentTimeSlot: string;
  doctorName?: string;
  patientName?: string;
  role: 'patient' | 'doctor';
}

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

export default function RescheduleModal({
  isOpen,
  onClose,
  onSubmit,
  appointmentId,
  currentDate,
  currentTimeSlot,
  doctorName,
  patientName,
  role
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTimeSlot) return;

    setLoading(true);
    try {
      await onSubmit(newDate, newTimeSlot);
      setNewDate('');
      setNewTimeSlot('');
      onClose();
    } catch (error) {
      console.error('Reschedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewDate('');
    setNewTimeSlot('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request Reschedule"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Current appointment info */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-2">Current Appointment</h4>
          {role === 'patient' && doctorName && (
            <p className="text-sm text-gray-600">Doctor: Dr. {doctorName}</p>
          )}
          {role === 'doctor' && patientName && (
            <p className="text-sm text-gray-600">Patient: {patientName}</p>
          )}
          <p className="text-sm text-gray-600">
            Date: {new Date(currentDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-sm text-gray-600">Time: {currentTimeSlot}</p>
        </div>

        <div className="space-y-4">
          <div>
            <Input
              label="New Date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a new date for the appointment
            </p>
          </div>

          <div>
            <Select
              label="New Time Slot"
              value={newTimeSlot}
              onChange={(e) => setNewTimeSlot(e.target.value)}
              options={[
                { value: '', label: 'Choose a new time slot' },
                ...timeSlots.map(slot => ({ value: slot, label: slot }))
              ]}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a new time slot for the appointment
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your reschedule request will need to be approved by the{' '}
            {role === 'patient' ? 'doctor' : 'patient'}.
            You will receive a notification once they respond.
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={loading}
            disabled={!newDate || !newTimeSlot}
          >
            Send Reschedule Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
