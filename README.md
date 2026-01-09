# Smart Healthcare Appointment System

A full-stack healthcare appointment system built with **distributed microservices architecture**, featuring **three communication mechanisms**: REST APIs, gRPC for inter-service communication, and Kafka for event-driven messaging.

## Architecture

### Distributed System Design

This system demonstrates core distributed programming principles:

1. **Client-Server Architecture** - Next.js client communicates via REST APIs
2. **Service-Oriented Design** - Three independent, loosely coupled microservices
3. **Multiple Communication Paradigms**:
   - **REST** - Client-facing HTTP/JSON APIs
   - **gRPC** - Inter-service RPC calls with Protocol Buffers
   - **Kafka Pub/Sub** - Asynchronous event-driven messaging

### Backend Microservices

1. **Auth Service** (Ports: 4001 HTTP, 50051 gRPC)
   - User registration and login (REST API)
   - JWT authentication with HttpOnly cookies
   - Role-based access control (patient/doctor)
   - **gRPC Server** - Token verification and user data retrieval

2. **Appointment Service** (Port 4002)
   - Appointment CRUD operations (REST API)
   - Status management (pending, approved, cancelled, completed)
   - **gRPC Client** - Authenticates via RPC calls to auth-service
   - **Kafka Producer** - Publishes appointment events

3. **Notification Service** (Port 4003)
   - **Kafka Consumer** - Listens to appointment events
   - Real-time notifications via Socket.IO
   - Email notifications (configurable)
   - **gRPC Client** - User data retrieval (optional)

### Frontend
- **Next.js 14** with TypeScript and Tailwind CSS
- Protected routes with middleware
- Separate dashboards for patients and doctors
- REST API client for backend communication

### Communication Mechanisms

#### 1. RESTful Communication (Client ↔ Backend)
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- JSON serialization
- Client unaware of service locations (distribution transparency)

#### 2. gRPC (Inter-Service RPC)
- Protocol Buffers for interface definition (IDL)
- Type-safe, binary serialization
- Auth service provides token verification via RPC
- See [GRPC_IMPLEMENTATION.md](GRPC_IMPLEMENTATION.md) for details

#### 3. Kafka Pub/Sub (Asynchronous Events)
- Producer-consumer decoupling
- Event topics: `appointments`
- Events: APPOINTMENT_CREATED, APPOINTMENT_APPROVED, APPOINTMENT_CANCELLED, APPOINTMENT_COMPLETED
- See [KAFKA_MIGRATION_GUIDE.md](KAFKA_MIGRATION_GUIDE.md) for details

### Database
- MongoDB for data persistence
- Separate databases for auth, appointments, and notifications

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

## Distributed Programming Requirements Compliance

This system fulfills all requirements for a distributed programming final project:

### ✅ High-Level System Requirements
- **Distributed System**: Multiple independent services running as separate processes
- **Network Communication**: All components interact over network (HTTP, gRPC, Kafka)
- **No Shared Memory**: Each service has its own process and memory space
- **Autonomous Components**: Services can be deployed and scaled independently

### ✅ Client-Server Interaction
- **Client Component**: Next.js frontend application
- **HTTP-based APIs**: RESTful endpoints for all client operations
- **Distribution Transparency**: Client uses environment variables for service URLs

### ✅ Service-Oriented Design
- **Three Independent Services**: Auth, Appointment, Notification
- **Loosely Coupled**: Services communicate only through defined interfaces
- **Independently Deployable**: Each service has its own Dockerfile and can run standalone
- **Well-Defined Interfaces**: REST APIs, gRPC proto files, Kafka event schemas

### ✅ Communication Mechanisms

#### a) RESTful Communication ✅
- Client-facing APIs use REST principles
- Standard HTTP methods: GET, POST, PATCH, DELETE
- JSON serialization for all REST APIs
- Examples: `/api/auth/login`, `/api/appointments`, `/api/notifications`

#### b) Remote Procedure Calls (gRPC) ✅
- Inter-service communication via gRPC
- Protocol Buffers IDL: `proto/auth.proto`
- Type-safe, automatic serialization
- Auth service provides RPC methods: `VerifyToken`, `GetUser`, `GetDoctor`

#### c) Asynchronous Communication (Pub/Sub) ✅
- Kafka-based publish-subscribe model
- Producer: Appointment service publishes events
- Consumer: Notification service subscribes to events
- Decoupled in time and space: services don't need to be online simultaneously

### Architecture Documentation
- [GRPC_IMPLEMENTATION.md](GRPC_IMPLEMENTATION.md) - Detailed gRPC architecture
- [KAFKA_MIGRATION_GUIDE.md](KAFKA_MIGRATION_GUIDE.md) - Kafka pub/sub implementation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Feature summary

## Project Structure

```
├── proto/
│   └── auth.proto                    # gRPC service definitions (IDL)
├── backend/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── grpc/
│   │   │   │   └── server.js         # gRPC server implementation
│   │   │   ├── models/User.js
│   │   │   ├── routes/auth.js
│   │   │   ├── middleware/auth.js
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── appointment-service/
│   │   ├── src/
│   │   │   ├── grpc/
│   │   │   │   └── authClient.js     # gRPC client for auth service
│   │   │   ├── models/Appointment.js
│   │   │   ├── routes/appointments.js
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js           # Local JWT auth (legacy)
│   │   │   │   └── authRpc.js        # RPC-based auth (new)
│   │   │   ├── events/
│   │   │   │   ├── publisher-kafka.js # Kafka producer
│   │   │   │   └── publisher.js      # Redis pub (legacy)
│   │   │   └── index.js
│   │   ├── Dockerfile
│   │   └── package.json
│   └── notification-service/
│       ├── src/
│       │   ├── grpc/
│       │   │   └── authClient.js     # gRPC client for auth service
│       │   ├── events/
│       │   │   ├── subscriber-kafka.js # Kafka consumer
│       │   │   └── subscriber.js     # Redis sub (legacy)
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
