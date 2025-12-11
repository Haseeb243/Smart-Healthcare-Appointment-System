/**
 * Calendar Utilities
 * Generate Google Calendar links and ICS file content for appointments
 */

/**
 * Generate Google Calendar link for an appointment
 * @param {Object} appointment - Appointment data
 * @returns {string} Google Calendar URL
 */
function generateGoogleCalendarLink(appointment) {
  const { date, timeSlot, patientName, doctorName, reason } = appointment;
  
  // Parse date and time
  const appointmentDate = new Date(date);
  const [time, period] = timeSlot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  appointmentDate.setHours(hours, minutes, 0, 0);
  
  // Calculate end time (1 hour duration by default)
  const endDate = new Date(appointmentDate);
  endDate.setHours(endDate.getHours() + 1);
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
  const formatDateForGoogle = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startTime = formatDateForGoogle(appointmentDate);
  const endTime = formatDateForGoogle(endDate);
  
  // Build Google Calendar URL
  const title = `Medical Appointment: Dr. ${doctorName} with ${patientName}`;
  const details = `Reason: ${reason}\n\nPlease arrive 10 minutes early for check-in.`;
  const location = 'Healthcare Clinic';
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startTime}/${endTime}`,
    details: details,
    location: location
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate ICS file content for an appointment
 * @param {Object} appointment - Appointment data
 * @returns {string} ICS file content
 */
function generateICSFile(appointment) {
  const { date, timeSlot, patientName, doctorName, reason, _id } = appointment;
  
  // Parse date and time
  const appointmentDate = new Date(date);
  const [time, period] = timeSlot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  appointmentDate.setHours(hours, minutes, 0, 0);
  
  // Calculate end time (1 hour duration)
  const endDate = new Date(appointmentDate);
  endDate.setHours(endDate.getHours() + 1);
  
  // Format dates for ICS (YYYYMMDDTHHmmss)
  const formatDateForICS = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0];
  };
  
  const startTime = formatDateForICS(appointmentDate);
  const endTime = formatDateForICS(endDate);
  const now = formatDateForICS(new Date());
  
  // Create ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Healthcare Appointment System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:appointment-${_id}@healthcare-system.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:Medical Appointment: Dr. ${doctorName} with ${patientName}`,
    `DESCRIPTION:Reason: ${reason}\\n\\nPlease arrive 10 minutes early for check-in.`,
    'LOCATION:Healthcare Clinic',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Appointment Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

module.exports = {
  generateGoogleCalendarLink,
  generateICSFile
};
