# gRPC Implementation Guide

## Overview
This document describes the gRPC (Remote Procedure Call) implementation in the Smart Healthcare Appointment System, fulfilling the distributed programming requirement for inter-service RPC communication.

## Architecture

The system implements **three communication mechanisms**:

1. **REST APIs** - Client-facing HTTP/JSON APIs for frontend communication
2. **gRPC** - Inter-service RPC for authentication and user data retrieval
3. **Kafka Pub/Sub** - Asynchronous event-driven communication for notifications

## gRPC Service Definition

### Protocol Buffers (IDL)

Location: `/proto/auth.proto`

The system defines the `AuthService` with three RPC methods:

```protobuf
service AuthService {
  rpc VerifyToken (VerifyTokenRequest) returns (VerifyTokenResponse);
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc GetDoctor (GetDoctorRequest) returns (GetDoctorResponse);
}
```

### Service Endpoints

| RPC Method | Purpose | Request | Response |
|------------|---------|---------|----------|
| `VerifyToken` | Verify JWT token and get user info | `token: string` | `valid, user_id, role, email, name` |
| `GetUser` | Get user details by ID | `user_id: string` | `found, user_id, name, email, role` |
| `GetDoctor` | Get doctor details by ID | `doctor_id: string` | `found, doctor_id, name, email, specialization` |

## Implementation Details

### gRPC Server (Auth Service)

**Location**: `backend/auth-service/src/grpc/server.js`

- Runs on port `50051` (configurable via `GRPC_PORT`)
- Implements all three RPC methods defined in the proto file
- Uses automatic serialization via Protocol Buffers
- Type-safe communication through IDL

**Key Features**:
- JWT token verification with database validation
- User existence checking
- Role-based data retrieval
- Error handling with meaningful error messages

### gRPC Clients

#### Appointment Service Client
**Location**: `backend/appointment-service/src/grpc/authClient.js`

Uses gRPC to verify tokens instead of local JWT verification:
```javascript
const response = await verifyTokenViaRpc(token);
// Returns: { valid, user_id, role, email, name, error_message }
```

#### Notification Service Client
**Location**: `backend/notification-service/src/grpc/authClient.js`

Similar client implementation for future authentication needs.

### RPC-Based Middleware

**Location**: `backend/appointment-service/src/middleware/authRpc.js`

New middleware that uses RPC instead of local JWT verification:
```javascript
const authMiddlewareRpc = async (req, res, next) => {
  const token = req.cookies.token;
  const response = await verifyTokenViaRpc(token);
  // Set req.user from RPC response
};
```

## Routes Using RPC

The following appointment service routes demonstrate RPC usage:

- `POST /api/appointments` - Create appointment (uses RPC auth)
- `GET /api/appointments/patient` - Get patient appointments (uses RPC auth)
- `GET /api/appointments/doctor` - Get doctor appointments (uses RPC auth)

## Configuration

### Environment Variables

#### Auth Service
```bash
GRPC_PORT=50051        # gRPC server port
```

#### Appointment Service
```bash
AUTH_GRPC_URL=auth-service:50051  # gRPC server address
```

#### Notification Service
```bash
AUTH_GRPC_URL=auth-service:50051  # gRPC server address
```

### Docker Compose

The `docker-compose.yml` exposes the gRPC port and sets up service dependencies:

```yaml
auth-service:
  ports:
    - "4001:4001"    # HTTP/REST
    - "50051:50051"  # gRPC
  environment:
    - GRPC_PORT=50051

appointment-service:
  environment:
    - AUTH_GRPC_URL=auth-service:50051
  depends_on:
    - auth-service
```

## Benefits of This Implementation

### 1. Type Safety
- Protocol Buffers provide strict type checking
- Compile-time validation of message structures
- Auto-generated code reduces errors

### 2. Performance
- Binary serialization (Protocol Buffers) is faster than JSON
- Efficient encoding/decoding
- Smaller message sizes

### 3. Clear Interface Definition
- `.proto` files serve as contracts between services
- Self-documenting API
- Language-agnostic definitions

### 4. Separation of Concerns
- Auth logic centralized in auth-service
- No JWT secret duplication across services
- Single source of truth for user data

### 5. Scalability
- Services can be scaled independently
- gRPC supports bi-directional streaming (for future enhancements)
- Connection pooling and load balancing support

## Testing gRPC

### Manual Testing with grpcurl

Install grpcurl:
```bash
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

Test VerifyToken:
```bash
grpcurl -plaintext \
  -d '{"token": "your-jwt-token-here"}' \
  localhost:50051 \
  auth.AuthService/VerifyToken
```

Test GetUser:
```bash
grpcurl -plaintext \
  -d '{"user_id": "user-id-here"}' \
  localhost:50051 \
  auth.AuthService/GetUser
```

### Verify in Logs

When services start, you should see:
```
Auth Service:
  gRPC Server running on port 50051

Appointment Service:
  Auth gRPC client initialized: auth-service:50051

Notification Service:
  Auth gRPC client initialized: auth-service:50051
```

## Communication Flow Example

### Scenario: Patient Creates Appointment

1. **Frontend → Appointment Service (REST)**
   ```
   POST /api/appointments
   Headers: Cookie: token=<jwt>
   Body: { doctorId, date, timeSlot, ... }
   ```

2. **Appointment Service → Auth Service (gRPC)**
   ```
   RPC: VerifyToken({ token: "<jwt>" })
   Response: { valid: true, user_id: "123", role: "patient", ... }
   ```

3. **Appointment Service → Database**
   ```
   Save appointment with patientId: "123"
   ```

4. **Appointment Service → Kafka (Pub/Sub)**
   ```
   Publish: APPOINTMENT_CREATED event
   Topic: appointments
   ```

5. **Kafka → Notification Service (Pub/Sub)**
   ```
   Consume: APPOINTMENT_CREATED event
   Send notification to doctor
   ```

This demonstrates all three communication mechanisms working together!

## Comparison with Previous Implementation

| Aspect | Before (Local JWT) | After (gRPC) |
|--------|-------------------|--------------|
| Token Verification | Each service verifies locally | Centralized in auth-service |
| JWT Secret | Duplicated in all services | Only in auth-service |
| User Data | No direct access | RPC call to get user info |
| Type Safety | Manual JSON parsing | Protocol Buffers (automatic) |
| Performance | N/A | Binary serialization |
| Coupling | Services need JWT library | Services use gRPC client |

## Future Enhancements

1. **Bi-directional Streaming**
   - Real-time user status updates
   - Live appointment notifications

2. **Additional RPC Methods**
   - `UpdateUser` - Modify user data
   - `ValidatePermission` - Fine-grained authorization

3. **Security**
   - TLS/SSL encryption for gRPC
   - Mutual TLS authentication
   - Service mesh integration (Istio, Linkerd)

4. **Load Balancing**
   - gRPC load balancing
   - Service discovery (Consul, etcd)

5. **Monitoring**
   - gRPC metrics and tracing
   - Prometheus integration
   - OpenTelemetry support

## Troubleshooting

### gRPC Connection Errors

**Problem**: `Error: 14 UNAVAILABLE: failed to connect to all addresses`

**Solutions**:
1. Check if auth-service is running
2. Verify `AUTH_GRPC_URL` environment variable
3. Check network connectivity between containers
4. Ensure port 50051 is exposed

### Proto File Not Found

**Problem**: `Error: ENOENT: no such file or directory, open '...auth.proto'`

**Solution**: Ensure proto file is in the correct location:
```bash
project-root/proto/auth.proto
```

### Token Verification Fails

**Problem**: RPC returns `valid: false`

**Solutions**:
1. Check JWT secret matches in both services
2. Verify token is valid and not expired
3. Check user exists in database
4. Review auth-service logs for errors

## Resources

- [gRPC Official Documentation](https://grpc.io/docs/)
- [Protocol Buffers Guide](https://protobuf.dev/)
- [gRPC-Node Documentation](https://grpc.github.io/grpc/node/)
- [gRPC Best Practices](https://grpc.io/docs/guides/performance/)
