'use client';

import { useState } from 'react';
import { getCalendarLinks, downloadCalendarFile } from '@/lib/api';
import { Button } from './ui/Button';

interface CalendarLinksProps {
  appointmentId: string;
}

export default function CalendarLinks({ appointmentId }: CalendarLinksProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleGoogleCalendar = async () => {
    setLoading(true);
    try {
      const { googleCalendarLink } = await getCalendarLinks(appointmentId);
      // Open Google Calendar in new tab
      window.open(googleCalendarLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error getting calendar link:', error);
      alert('Failed to generate calendar link');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadICS = async () => {
    setDownloading(true);
    try {
      const blob = await downloadCalendarFile(appointmentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointment-${appointmentId}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading calendar file:', error);
      alert('Failed to download calendar file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGoogleCalendar}
        isLoading={loading}
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V10h16v11zm0-13H4V5h16v3z"/>
        </svg>
        Add to Google Calendar
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadICS}
        isLoading={downloading}
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download .ics file
      </Button>
    </div>
  );
}
