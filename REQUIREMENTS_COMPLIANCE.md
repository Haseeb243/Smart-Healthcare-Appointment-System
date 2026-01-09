# Distributed Programming Requirements - Compliance Document

## Project: Smart Healthcare Appointment System

This document demonstrates how the Smart Healthcare Appointment System fulfills all requirements for the Distributed Programming Final Project.

---

## 1. Project Description ✅

### Requirement
> Design and implement a distributed software system that demonstrates the core principles, architectures, and communication mechanisms studied in a Distributed Programming course.

### Implementation
The Smart Healthcare Appointment System is a distributed healthcare platform consisting of:
- **3 independent microservices** (auth, appointment, notification)
- **1 client application** (Next.js frontend)
- **Multiple communication mechanisms** (REST, gRPC, Kafka)
- **Unified functionality**: Healthcare appointment booking and management

The system demonstrates:
- ✅ Clear distributed system design
- ✅ Correct use of communication mechanisms
- ✅ Modular and scalable architecture
- ✅ Practical implementation of theoretical concepts

---

## 2. High-Level System Requirements ✅

### Requirement
> The system must be distributed with multiple independent services/components that run as separate processes and interact only through network-based communication with no shared memory.

### Implementation

#### Multiple Independent Components
1. **Auth Service** - Handles authentication and user management
2. **Appointment Service** - Manages appointment lifecycle
3. **Notification Service** - Processes and sends notifications
4. **Frontend Client** - User interface for patients and doctors

#### Separate Processes
Each service runs in its own Docker container with:
- Independent process space
- Separate memory allocation
- Own configuration and environment variables

```yaml
# docker-compose.yml shows 4 separate containers
services:
  auth-service:         # Container 1
  appointment-service:  # Container 2
  notification-service: # Container 3
  frontend:            # Container 4 (when deployed)
```

#### Network-Based Communication Only
- **No shared memory**: Each service has isolated memory space
- **Network protocols**: HTTP, gRPC, Kafka (all network-based)
- **Data exchange**: Only through API calls and message queues

#### Evidence
- Services communicate via network ports (4001, 4002, 4003, 50051)
- Docker networking layer: `healthcare-network`
- No direct function calls between services
- No shared database connections (each has own connection)

---

## 3. Mandatory Architectural Requirements ✅

### 3.1 Client–Server Interaction ✅

#### Requirement
- At least one client component
- Client communicates using HTTP-based APIs
- Distribution transparency (client unaware of backend locations)

#### Implementation

**Client Component:**
- Next.js 14 frontend application
- TypeScript-based React components
- Runs separately from backend services

**HTTP-Based APIs:**
All client-server communication uses standard HTTP/REST:

```typescript
// Example: Patient booking appointment
POST /api/appointments
Headers: 
  Content-Type: application/json
  Cookie: token=<jwt-token>
Body: {
  "doctorId": "...",
  "date": "2025-01-15",
  "timeSlot": "10:00 AM",
  "reason": "Check-up"
}
```

**Distribution Transparency:**
Client uses environment variables and never knows physical locations:

```javascript
// frontend/.env.local
NEXT_PUBLIC_AUTH_API_URL=http://api.healthcare.com/auth
NEXT_PUBLIC_APPOINTMENT_API_URL=http://api.healthcare.com/appointments

// Services can be anywhere - client doesn't care
// Could be localhost, AWS, different servers, etc.
```

**API Endpoints Used:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/appointments/patient` - Get appointments
- `POST /api/appointments` - Create appointment
- `GET /api/notifications` - Get notifications

---

### 3.2 Service-Oriented Design ✅

#### Requirement
- At least three independent services
- Each with clear responsibility
- Loosely coupled
- Independently deployable
- Communicating via well-defined interfaces

#### Implementation

**Service 1: Auth Service**
- **Responsibility**: User authentication and authorization
- **Interfaces**:
  - REST API: `/api/auth/*`
  - gRPC: `AuthService` (VerifyToken, GetUser, GetDoctor)
- **Independent**: Can be deployed alone, has own Dockerfile
- **Ports**: 4001 (HTTP), 50051 (gRPC)

**Service 2: Appointment Service**
- **Responsibility**: Appointment lifecycle management
- **Interfaces**:
  - REST API: `/api/appointments/*`
  - gRPC Client: Calls auth-service for authentication
  - Kafka Producer: Publishes appointment events
- **Independent**: Can be deployed alone, has own Dockerfile
- **Port**: 4002 (HTTP)

**Service 3: Notification Service**
- **Responsibility**: Notification delivery and messaging
- **Interfaces**:
  - REST API: `/api/notifications/*`, `/api/messages/*`
  - Kafka Consumer: Subscribes to appointment events
  - Socket.IO: Real-time notifications to clients
  - gRPC Client: Can fetch user data if needed
- **Independent**: Can be deployed alone, has own Dockerfile
- **Port**: 4003 (HTTP)

**Loose Coupling Evidence:**
- No direct dependencies between services
- Services communicate only through APIs
- Can be written in different languages (all Node.js now, but interfaces support any language)
- Failure of one service doesn't crash others

**Independent Deployment:**
```bash
# Each service can be built and deployed separately
docker build -t auth-service ./backend/auth-service
docker build -t appointment-service ./backend/appointment-service
docker build -t notification-service ./backend/notification-service

# Each can run on different servers
# Each can be scaled independently (docker-compose scale appointment-service=3)
```

**Well-Defined Interfaces:**
- REST: OpenAPI-compatible endpoints
- gRPC: Protocol Buffers definitions (`proto/auth.proto`)
- Kafka: Event schemas with defined types

---

### 3.3 Communication Mechanisms ✅

The project implements **ALL THREE** required communication paradigms:

---

#### a) RESTful Communication ✅

**Requirement:**
- Client-facing APIs using REST principles
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON serialization

**Implementation:**

**REST Principles:**
1. **Resource-based URLs**
   - `/api/auth/users` - User resources
   - `/api/appointments` - Appointment resources
   - `/api/notifications` - Notification resources

2. **Standard HTTP Methods**
   ```
   GET    /api/appointments/patient  - Retrieve appointments
   POST   /api/appointments          - Create appointment
   PATCH  /api/appointments/:id/approve - Update appointment
   DELETE /api/appointments/:id      - Delete appointment (if implemented)
   ```

3. **Stateless Communication**
   - Each request contains all necessary information
   - JWT token in cookie for authentication
   - No server-side session storage

4. **JSON Serialization**
   ```json
   // Request
   {
     "doctorId": "507f1f77bcf86cd799439011",
     "date": "2025-01-15",
     "timeSlot": "10:00 AM",
     "reason": "Annual check-up"
   }
   
   // Response
   {
     "message": "Appointment created successfully",
     "appointment": {
       "_id": "507f1f77bcf86cd799439012",
       "patientId": "507f1f77bcf86cd799439013",
       "status": "pending",
       ...
     }
   }
   ```

**REST Endpoints List:**

Auth Service:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/doctors`

Appointment Service:
- `POST /api/appointments`
- `GET /api/appointments/patient`
- `GET /api/appointments/doctor`
- `GET /api/appointments/:id`
- `PATCH /api/appointments/:id/approve`
- `PATCH /api/appointments/:id/cancel`
- `PATCH /api/appointments/:id/complete`

Notification Service:
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/messages`
- `GET /api/messages/:conversationId`

---

#### b) Remote Procedure Calls (RPC/gRPC) ✅

**Requirement:**
- Inter-service communication using RPC
- Interfaces defined using IDL (e.g., Protocol Buffers)
- Automatic, type-safe serialization

**Implementation:**

**1. Interface Definition Language (IDL)**

File: `proto/auth.proto`

```protobuf
syntax = "proto3";

package auth;

service AuthService {
  rpc VerifyToken (VerifyTokenRequest) returns (VerifyTokenResponse);
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc GetDoctor (GetDoctorRequest) returns (GetDoctorResponse);
}

message VerifyTokenRequest {
  string token = 1;
}

message VerifyTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string role = 3;
  string email = 4;
  string name = 5;
  string error_message = 6;
}
// ... more messages
```

**2. gRPC Server (Auth Service)**

File: `backend/auth-service/src/grpc/server.js`

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../../proto/auth.proto');
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// Implement RPC methods
const verifyToken = async (call, callback) => {
  const { token } = call.request;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // ... verify and return user info
  callback(null, { valid: true, user_id: "...", ... });
};

// Start gRPC server on port 50051
server.addService(authProto.AuthService.service, {
  verifyToken,
  getUser,
  getDoctor
});
```

**3. gRPC Client (Appointment Service)**

File: `backend/appointment-service/src/grpc/authClient.js`

```javascript
const grpc = require('@grpc/grpc-js');
const authClient = new authProto.AuthService(
  'auth-service:50051',
  grpc.credentials.createInsecure()
);

// Make RPC call
const verifyTokenViaRpc = (token) => {
  return new Promise((resolve, reject) => {
    authClient.verifyToken({ token }, (error, response) => {
      resolve(response);
    });
  });
};
```

**4. Usage in Middleware**

File: `backend/appointment-service/src/middleware/authRpc.js`

```javascript
const authMiddlewareRpc = async (req, res, next) => {
  const token = req.cookies.token;
  
  // RPC call to auth service
  const response = await verifyTokenViaRpc(token);
  
  if (!response.valid) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  req.user = {
    id: response.user_id,
    role: response.role,
    email: response.email,
    name: response.name
  };
  
  next();
};
```

**Type-Safe Serialization:**
- Protocol Buffers automatically serialize/deserialize
- Type checking at compile time via proto definitions
- Binary encoding (more efficient than JSON)

**Inter-Service RPC Flow:**
```
Appointment Service                Auth Service
      |                                  |
      | 1. verifyToken(token)           |
      |-------------------------------->|
      |                                  | 2. Verify JWT
      |                                  | 3. Check DB
      | 4. {valid, user_id, role, ...}  |
      |<--------------------------------|
      |                                  |
```

**Routes Using RPC:**
- `POST /api/appointments` - Uses RPC auth
- `GET /api/appointments/patient` - Uses RPC auth
- `GET /api/appointments/doctor` - Uses RPC auth

---

#### c) Asynchronous Communication (Publish–Subscribe) ✅

**Requirement:**
- At least one asynchronous interaction
- Publish-subscribe or message queue model
- Producers and consumers decoupled in time and space

**Implementation:**

**Technology:** Apache Kafka

**1. Publisher (Appointment Service)**

File: `backend/appointment-service/src/events/publisher-kafka.js`

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'appointment-service',
  brokers: ['kafka:29092']
});

const producer = kafka.producer();

const publishEvent = async (topic, event) => {
  await producer.send({
    topic: 'appointments',
    messages: [{
      key: event.data.appointmentId,
      value: JSON.stringify({
        type: 'APPOINTMENT_CREATED',
        data: { ... },
        timestamp: new Date().toISOString()
      })
    }]
  });
};
```

**Usage:**
```javascript
// When appointment is created
await appointment.save();

// Publish event asynchronously
await publishEvent('appointments', {
  type: EVENTS.APPOINTMENT_CREATED,
  data: {
    appointmentId: appointment._id,
    patientName: 'John Doe',
    doctorName: 'Dr. Smith',
    ...
  }
});
```

**2. Subscriber (Notification Service)**

File: `backend/notification-service/src/events/subscriber-kafka.js`

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: ['kafka:29092']
});

const consumer = kafka.consumer({ 
  groupId: 'notification-service-group' 
});

await consumer.subscribe({ 
  topic: 'appointments',
  fromBeginning: false 
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    
    switch(event.type) {
      case 'APPOINTMENT_CREATED':
        await handleAppointmentCreated(event.data);
        break;
      case 'APPOINTMENT_APPROVED':
        await handleAppointmentApproved(event.data);
        break;
      // ... more event handlers
    }
  }
});
```

**3. Event Types**
```javascript
const EVENTS = {
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED'
};
```

**Decoupling Evidence:**

**Time Decoupling:**
- Producer publishes event and continues (doesn't wait)
- Consumer processes when ready (can be offline temporarily)
- Kafka stores messages until consumed

**Space Decoupling:**
- Producer doesn't know who consumes
- Consumer doesn't know who produces
- Can add more consumers without changing producer
- Multiple notification services can consume same events

**Example Flow:**
```
1. Patient books appointment (10:00 AM)
   └─> Appointment Service publishes APPOINTMENT_CREATED event
   
2. Kafka stores event

3. Notification Service processes event (10:00:05 AM)
   └─> Sends email to doctor
   └─> Creates in-app notification
   
4. If Notification Service was down at 10:00 AM,
   it processes when it comes back online
```

**Configuration:**
```yaml
# docker-compose.yml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  ports:
    - "9092:9092"
  environment:
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
```

---

## Summary: All Requirements Met ✅

### Requirements Checklist

**High-Level Requirements:**
- ✅ Multiple independent services
- ✅ Separate processes
- ✅ Network-based communication only
- ✅ No shared memory

**Client-Server:**
- ✅ Client component (Next.js)
- ✅ HTTP-based APIs
- ✅ Distribution transparency

**Service-Oriented Design:**
- ✅ Three independent services (auth, appointment, notification)
- ✅ Clear responsibilities
- ✅ Loosely coupled
- ✅ Independently deployable
- ✅ Well-defined interfaces

**Communication Mechanisms:**
- ✅ RESTful (HTTP, JSON, GET/POST/PATCH)
- ✅ RPC/gRPC (Protocol Buffers IDL, type-safe)
- ✅ Pub/Sub (Kafka, async, decoupled)

---

## Additional Strengths

**Beyond Requirements:**
1. **Security**
   - JWT authentication
   - HttpOnly cookies
   - Role-based access control
   - Rate limiting

2. **Scalability**
   - Docker containerization
   - Kafka consumer groups
   - Independent service scaling
   - Horizontal scaling ready

3. **Real-World Application**
   - Healthcare appointment booking
   - Patient and doctor dashboards
   - Real-time notifications
   - Email integration ready

4. **Documentation**
   - Comprehensive README
   - gRPC implementation guide
   - Kafka migration guide
   - API documentation

5. **Development Best Practices**
   - TypeScript for frontend
   - Environment-based configuration
   - Error handling
   - Logging
   - Health checks

---

## Evidence Files

**Proto Definitions:**
- `proto/auth.proto` - gRPC interface definition

**gRPC Implementation:**
- `backend/auth-service/src/grpc/server.js` - RPC server
- `backend/appointment-service/src/grpc/authClient.js` - RPC client
- `backend/notification-service/src/grpc/authClient.js` - RPC client
- `backend/appointment-service/src/middleware/authRpc.js` - RPC usage

**Kafka Implementation:**
- `backend/appointment-service/src/events/publisher-kafka.js` - Producer
- `backend/notification-service/src/events/subscriber-kafka.js` - Consumer

**REST Implementation:**
- `backend/auth-service/src/routes/auth.js` - REST endpoints
- `backend/appointment-service/src/routes/appointments.js` - REST endpoints
- `backend/notification-service/src/routes/notifications.js` - REST endpoints

**Documentation:**
- `README.md` - Main documentation
- `GRPC_IMPLEMENTATION.md` - RPC details
- `KAFKA_MIGRATION_GUIDE.md` - Pub/Sub details
- `REQUIREMENTS_COMPLIANCE.md` - This document

---

## Conclusion

The Smart Healthcare Appointment System **fully satisfies all requirements** for the Distributed Programming Final Project:

1. ✅ **Distributed System** with multiple autonomous components
2. ✅ **Client-Server** architecture with HTTP APIs and transparency
3. ✅ **Service-Oriented Design** with three independent services
4. ✅ **RESTful Communication** for client interactions
5. ✅ **RPC/gRPC** for inter-service communication with IDL
6. ✅ **Pub/Sub (Kafka)** for asynchronous event-driven messaging

The system demonstrates practical implementation of distributed programming concepts including service decomposition, network communication protocols, interface definition, loose coupling, and scalability patterns.
