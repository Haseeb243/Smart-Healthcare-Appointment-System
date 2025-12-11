# Comprehensive Testing Guide

## Pre-Testing Setup

### 1. Start the System
```bash
# Start all services including Kafka
docker-compose up -d

# Verify all services are running
docker ps

# Check service logs
docker logs healthcare-kafka
docker logs healthcare-appointment-service
docker logs healthcare-notification-service
```

### 2. Verify Kafka is Working
```bash
# Check Kafka topics
docker exec healthcare-kafka kafka-topics --list \
  --bootstrap-server localhost:9092

# Should see: appointments
```

## Test Scenarios

### Test 1: User Registration and Login

**Patient Registration:**
1. Navigate to http://localhost:3000/register
2. Fill in patient details
3. Submit form
4. Verify redirect to login page

**Doctor Registration:**
1. Register with doctor role
2. Add specialization
3. Submit form
4. Verify redirect to login page

**Login:**
1. Login with created credentials
2. Verify redirect to appropriate dashboard
3. Check sidebar navigation is visible
4. Verify NotificationBell appears in topbar

**Expected Result:** ✅ Successful registration and login with proper dashboard display

---

### Test 2: Appointment Booking Flow

**As Patient:**
1. Navigate to "Find Doctors" tab
2. Search for a doctor by specialization
3. Click "Book Now" on a doctor card
4. Fill appointment details:
   - Select future date
   - Choose time slot
   - Enter reason for visit
5. Submit booking

**Verify:**
- ✅ Success toast appears
- ✅ Appointment appears in "My Appointments" tab with "pending" status
- ✅ Skeleton loaders show during API calls

**As Doctor:**
1. Check dashboard - should see new appointment request
2. Verify notification bell shows unread count
3. Click notification bell - should see "New Appointment Request"

**Expected Result:** ✅ End-to-end booking flow works with real-time notifications

---

### Test 3: Kafka Event Flow

**Monitor Kafka Messages:**
```bash
# Open terminal to watch Kafka messages
docker exec healthcare-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic appointments \
  --from-beginning
```

**Create an Appointment:**
1. Book appointment as patient
2. In Kafka terminal, verify message appears with type: APPOINTMENT_CREATED
3. Check notification-service logs: `docker logs healthcare-notification-service`
4. Verify "📧 NOTIFICATION: New Appointment Created" appears

**Expected Result:** ✅ Event published to Kafka and consumed by notification service

---

### Test 4: Appointment Approval

**As Doctor:**
1. Go to "Today" or "Upcoming" tab
2. Find pending appointment
3. Click "✓ Approve" button
4. Verify status changes to "approved"
5. Check that calendar links appear
6. Verify message button is now visible

**As Patient:**
1. Check notification bell - should have "Appointment Approved" notification
2. Go to "My Appointments"
3. Verify appointment shows "approved" status with green badge
4. Verify "Add to Google Calendar" and "Download .ics" buttons appear
5. Verify "Reschedule" button is available

**Verify Kafka:**
```bash
# Check latest Kafka message
docker logs healthcare-kafka | tail -n 20
```
Should show APPOINTMENT_APPROVED event

**Expected Result:** ✅ Approval flow works with notifications and calendar links

---

### Test 5: Calendar Integration

**Test Google Calendar:**
1. Click "Add to Google Calendar" on approved appointment
2. Verify Google Calendar opens in new tab
3. Check appointment details are correct
4. Verify date, time, and title are accurate

**Test ICS Download:**
1. Click "Download .ics file"
2. Verify file downloads
3. Open file with calendar app (Outlook, Apple Calendar, etc.)
4. Verify appointment details match

**Expected Result:** ✅ Calendar links generate correctly with accurate appointment data

---

### Test 6: Messaging System

**As Patient:**
1. Click "Message" button on approved appointment
2. MessagingPanel opens
3. Verify online status indicator shows for doctor
4. Type a message and send
5. Verify message appears in chat

**As Doctor:**
1. Check notification bell - should have "New Message" notification
2. Open same appointment
3. Click "Message" button
4. Verify conversation history shows
5. Verify "✓✓" read receipt appears on sent messages

**Test File Attachments:**
1. Click attachment icon (📎)
2. Select a PDF file (< 5MB)
3. Verify file preview shows before sending
4. Send message with attachment
5. Other user should see file with download icon
6. Click to download and verify file

**Test Typing Indicator:**
1. Start typing in one window
2. Check other user's window - should see "X is typing..."
3. Stop typing - indicator should disappear

**Expected Result:** ✅ Real-time messaging with file attachments and typing indicators

---

### Test 7: Reschedule Flow

**As Patient (Request Reschedule):**
1. On approved appointment, click "Reschedule" button
2. RescheduleModal opens showing current appointment details
3. Select new date (future date)
4. Select new time slot
5. Submit reschedule request
6. Verify success toast
7. Verify yellow "Reschedule pending" badge appears on appointment

**As Doctor (Approve Reschedule):**
1. Open appointment with pending reschedule
2. See yellow alert box with reschedule request details
3. Click "✓ Approve" button
4. Verify appointment date/time updates
5. Verify reschedule alert disappears

**Verify Notifications:**
- Patient should receive "Reschedule Request Approved" notification
- Doctor should receive "Appointment Rescheduled" notification

**Verify Kafka:**
```bash
docker logs healthcare-kafka | grep APPOINTMENT_RESCHEDULED
```

**Test Decline Reschedule:**
1. Request another reschedule as patient
2. As doctor, click "✕ Decline"
3. Verify request status updates

**Expected Result:** ✅ Complete reschedule workflow with approve/decline options

---

### Test 8: Socket Disconnection & Polling Fallback

**Test Scenario:**
1. Open patient dashboard
2. Stop notification service: `docker stop healthcare-notification-service`
3. Wait for socket to disconnect (check browser console)
4. Create an appointment as patient
5. Restart notification service: `docker start healthcare-notification-service`
6. Verify polling kicks in (check browser console for API calls)
7. Verify notifications sync after ~20 seconds

**Expected Result:** ✅ System gracefully handles disconnection and polls for updates

---

### Test 9: Skeleton Loaders

**Test Loading States:**
1. Clear browser cache
2. Refresh dashboard
3. Verify skeleton loaders appear during data fetch
4. Loaders should show:
   - Skeleton stats cards (top)
   - Skeleton appointment cards (3 cards)
5. Loaders should disappear when data loads

**Expected Result:** ✅ Professional loading experience with skeleton screens

---

### Test 10: Empty States

**Test Patient Empty States:**
1. As new patient with no appointments
2. Verify "Find Doctors" tab shows doctor listings
3. Go to "My Appointments" - should show empty state with "No upcoming appointments"
4. Empty state should have "Find Doctors" button
5. Go to "History" - should show "No appointment history"

**Test Doctor Empty States:**
1. As new doctor with no appointments
2. Each tab should show appropriate empty state message
3. Empty states should be friendly and helpful

**Expected Result:** ✅ Clear, helpful empty states guide users

---

### Test 11: Notification Bell

**Test Notification Features:**
1. Create various events (create, approve, reschedule, message)
2. Verify notification bell badge increments
3. Click bell - dropdown shows recent notifications
4. Verify icons match notification types:
   - 📅 Created
   - ✅ Approved
   - ❌ Cancelled
   - 🎉 Completed
   - 📅 Rescheduled
   - 💬 Message
5. Click notification - should be marked as read
6. Badge count should decrement
7. Click "Mark all as read"
8. All notifications should show as read
9. Badge should show 0

**Expected Result:** ✅ Notification system works smoothly with proper categorization

---

### Test 12: Appointment Cancellation

**As Patient:**
1. Cancel a pending appointment
2. Verify status changes to "cancelled"
3. Appointment moves to "History" tab

**As Doctor:**
1. Should receive cancellation notification
2. Appointment should update in real-time (or on refresh)

**Verify Email:**
Check if email notification was sent (check logs if SMTP configured)

**Expected Result:** ✅ Cancellation flow works for both parties

---

### Test 13: Appointment Completion

**As Doctor:**
1. Find an approved appointment
2. Click "✓ Complete" button
3. Modal opens to add notes
4. Add completion notes
5. Click "Complete Appointment"
6. Verify status changes to "completed"
7. Appointment moves to completed section

**As Patient:**
1. Check notifications - should see "Appointment Completed"
2. Appointment should show in "History" with completed badge
3. Calendar links should still be available

**Expected Result:** ✅ Completion workflow with notes functionality

---

### Test 14: Responsive Design

**Test Mobile View:**
1. Open developer tools
2. Switch to mobile view (iPhone, Android)
3. Verify sidebar collapses to hamburger menu
4. Test navigation on mobile
5. Verify appointment cards stack properly
6. Test messaging panel on mobile
7. Test all modals (booking, reschedule) on mobile

**Expected Result:** ✅ Fully responsive on all screen sizes

---

### Test 15: Cross-Browser Testing

**Test on Multiple Browsers:**
- Chrome
- Firefox
- Safari
- Edge

**For Each Browser:**
1. Test login/registration
2. Test appointment booking
3. Test messaging with file uploads
4. Test calendar downloads
5. Test Socket.IO connectivity
6. Verify notifications work

**Expected Result:** ✅ Consistent behavior across browsers

---

## Performance Testing

### Load Test Kafka
```bash
# Create multiple appointments rapidly
for i in {1..10}; do
  curl -X POST http://localhost:4002/api/appointments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{"doctorId":"...","date":"2025-12-15","timeSlot":"10:00 AM","reason":"Test '$i'"}'
  sleep 0.5
done

# Check consumer lag
docker exec healthcare-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-service-group \
  --describe
```

**Expected Result:** ✅ All events processed without lag

---

## Security Testing

### Test 1: Auth Protection
1. Try accessing `/api/appointments` without token
2. Should get 401 Unauthorized

### Test 2: Role-Based Access
1. As patient, try to access `/api/appointments/doctor`
2. Should get 403 Forbidden

### Test 3: File Upload Validation
1. Try uploading file > 5MB
2. Should get error
3. Try uploading .exe file
4. Should get "Invalid file type" error

**Expected Result:** ✅ All security measures working

---

## Monitoring

### Check Service Health
```bash
# Appointment service
curl http://localhost:4002/health

# Notification service  
curl http://localhost:4003/health

# Expected: {"status":"ok"}
```

### Monitor Kafka
```bash
# View all topics
docker exec healthcare-kafka kafka-topics --list \
  --bootstrap-server localhost:9092

# Check consumer group lag
docker exec healthcare-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --all-groups
```

---

## Cleanup After Testing

```bash
# Stop all services
docker-compose down

# Remove volumes (fresh start)
docker-compose down -v

# Restart fresh
docker-compose up -d
```

---

## Common Issues & Solutions

### Issue: Kafka not connecting
**Solution:**
```bash
docker restart healthcare-zookeeper
docker restart healthcare-kafka
# Wait 30 seconds
docker restart healthcare-appointment-service
docker restart healthcare-notification-service
```

### Issue: Notifications not appearing
**Solution:**
1. Check Socket.IO connection in browser console
2. Verify Kafka consumer is running: `docker logs healthcare-notification-service`
3. Check if events are being published: `docker logs healthcare-appointment-service`

### Issue: File upload fails
**Solution:**
1. Check file size < 5MB
2. Verify file type (PDF, JPEG, PNG only)
3. Check uploads directory exists: `docker exec healthcare-notification-service ls uploads`

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Smooth user experience
- ✅ Real-time updates working
- ✅ Kafka events flowing
- ✅ Notifications delivered
- ✅ Files uploading/downloading
- ✅ Calendar integration working
- ✅ Responsive on all devices
- ✅ Cross-browser compatibility

---

## Reporting Issues

If you find issues, please document:
1. Test scenario that failed
2. Steps to reproduce
3. Expected vs actual behavior
4. Browser/device used
5. Console errors (if any)
6. Service logs (docker logs)

---

**Happy Testing! 🚀**
