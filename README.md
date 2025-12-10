# Smart Healthcare Appointment System

A full-stack healthcare appointment system built with microservices architecture, featuring event-driven communication, secure authentication, and protected dashboards.

## Architecture

### Backend Microservices
1. **Auth Service** (Port 4001)
   - User registration and login
   - JWT authentication with HttpOnly cookies
   - Role-based access control (patient/doctor)

2. **Appointment Service** (Port 4002)
   - Appointment CRUD operations
   - Status management (pending, approved, cancelled, completed)
   - Event publishing for notifications

3. **Notification Service** (Port 4003)
   - Listens to appointment events via Redis Pub/Sub
   - Handles notification delivery (console logging for development)

### Frontend
- **Next.js 14** with TypeScript and Tailwind CSS
- Protected routes with middleware
- Separate dashboards for patients and doctors

### Event-Driven Architecture
- Redis Pub/Sub for event messaging
- Events: APPOINTMENT_CREATED, APPOINTMENT_APPROVED, APPOINTMENT_CANCELLED, APPOINTMENT_COMPLETED

### Database
- MongoDB for data persistence
- Separate databases for auth and appointments

## Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/your-username/Smart-Healthcare-Appointment-System.git
cd Smart-Healthcare-Appointment-System
```

2. Start all services:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Auth Service: http://localhost:4001
   - Appointment Service: http://localhost:4002
   - Notification Service: http://localhost:4003

### Local Development

1. Start MongoDB and Redis (using Docker):
```bash
docker-compose up mongodb redis
```

2. Install dependencies for each service:
```bash
# Backend services
cd backend/auth-service && npm install && cd ../..
cd backend/appointment-service && npm install && cd ../..
cd backend/notification-service && npm install && cd ../..

# Frontend
cd frontend && npm install && cd ..
```

3. Set up environment variables:
```bash
# Copy example env files
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/appointment-service/.env.example backend/appointment-service/.env
cp backend/notification-service/.env.example backend/notification-service/.env
cp frontend/.env.example frontend/.env.local
```

4. Start services:
```bash
# Terminal 1 - Auth Service
cd backend/auth-service && npm run dev

# Terminal 2 - Appointment Service
cd backend/appointment-service && npm run dev

# Terminal 3 - Notification Service
cd backend/notification-service && npm run dev

# Terminal 4 - Frontend
cd frontend && npm run dev
```

## Security Features

- **HttpOnly Cookies**: JWT tokens stored in HttpOnly cookies, not accessible via JavaScript
- **Protected Routes**: Server-side middleware ensures unauthorized access is denied
- **Role-Based Access**: Separate access control for patients and doctors
- **No Secrets on Frontend**: All sensitive data and secrets kept server-side

## API Endpoints

### Auth Service (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user
- `GET /doctors` - Get list of doctors
- `GET /verify` - Verify token (for inter-service communication)

### Appointment Service (`/api/appointments`)
- `POST /` - Create appointment (patient only)
- `GET /patient` - Get patient's appointments
- `GET /doctor` - Get doctor's appointments
- `GET /:id` - Get single appointment
- `PATCH /:id/approve` - Approve appointment (doctor only)
- `PATCH /:id/cancel` - Cancel appointment
- `PATCH /:id/complete` - Complete appointment (doctor only)

## Deployment

### Backend (EC2 with Docker)
1. SSH into your EC2 instance
2. Install Docker and Docker Compose
3. Clone the repository
4. Update environment variables for production
5. Run `docker-compose up -d`

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_AUTH_API_URL`
   - `NEXT_PUBLIC_APPOINTMENT_API_URL`
4. Deploy

## Event Flow Example

1. Patient books appointment → `APPOINTMENT_CREATED` event emitted
2. Notification Service receives event → Logs/sends notification to doctor
3. Doctor approves appointment → `APPOINTMENT_APPROVED` event emitted
4. Notification Service receives event → Logs/sends notification to patient

## Project Structure

```
├── backend/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── models/User.js
│   │   │   ├── routes/auth.js
│   │   │   ├── middleware/auth.js
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── appointment-service/
│   │   ├── src/
│   │   │   ├── models/Appointment.js
│   │   │   ├── routes/appointments.js
│   │   │   ├── middleware/auth.js
│   │   │   ├── events/publisher.js
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── notification-service/
│       ├── src/
│       │   ├── events/subscriber.js
│       │   └── index.js
│       ├── Dockerfile
│       └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── lib/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## License

MIT
