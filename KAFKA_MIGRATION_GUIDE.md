# Redis to Kafka Migration Guide

## Overview
This document outlines the migration from Redis Pub/Sub to Apache Kafka for the event-driven architecture in the Smart Healthcare Appointment System.

## Changes Made

### 1. Docker Compose Updates
- **Removed**: Redis container
- **Added**: 
  - Zookeeper container (required for Kafka)
  - Kafka broker container
- **Updated**: Service environment variables to use `KAFKA_BROKERS` instead of `REDIS_URL`

### 2. Package Dependencies
Updated `package.json` in both services:
- **Removed**: `ioredis` dependency
- **Added**: `kafkajs@^2.2.4` dependency

### 3. Event Publisher (Appointment Service)
**File**: `backend/appointment-service/src/events/publisher-kafka.js`

Key differences from Redis:
- Uses KafkaJS library instead of ioredis
- Publishes to Kafka **topics** instead of Redis channels
- Supports message keys for partitioning
- Requires async connect/disconnect
- Better error handling and retry logic

### 4. Event Subscriber (Notification Service)  
**File**: `backend/notification-service/src/events/subscriber-kafka.js`

Key differences from Redis:
- Uses Kafka consumer groups for scalability
- Processes messages with `eachMessage` handler
- Supports offset management
- Can replay messages from specific offsets
- Better fault tolerance

### 5. Service Initialization
Both services now:
- Use `await` for Kafka connection (async)
- Initialize Kafka before starting the HTTP server
- Handle Kafka connection errors gracefully

## Benefits of Kafka over Redis

### 1. **Persistence & Durability**
- Kafka stores messages on disk (Redis is in-memory)
- Messages persist even if consumers are offline
- Can replay historical events

### 2. **Scalability**
- Consumer groups allow multiple instances
- Horizontal scaling without message duplication
- Better load distribution

### 3. **Reliability**
- Message acknowledgments and offset management
- Guaranteed message delivery
- Replication support (in production clusters)

### 4. **Message Ordering**
- Maintains order within partitions
- Uses message keys for related event grouping

### 5. **Monitoring & Observability**
- Rich ecosystem of monitoring tools
- Built-in metrics and health checks
- Better troubleshooting capabilities

## Environment Variables

### Old (Redis)
```env
REDIS_URL=redis://redis:6379
```

### New (Kafka)
```env
KAFKA_BROKERS=kafka:29092
# Or for multiple brokers:
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
```

## Running the System

### Development (Docker Compose)
```bash
# Start all services including Kafka
docker-compose up -d

# Check Kafka is running
docker logs healthcare-kafka

# View appointment service logs
docker logs healthcare-appointment-service

# View notification service logs
docker logs healthcare-notification-service
```

### Local Development
If running services locally (not in Docker):

1. **Start Zookeeper**:
```bash
bin/zookeeper-server-start.sh config/zookeeper.properties
```

2. **Start Kafka**:
```bash
bin/kafka-server-start.sh config/server.properties
```

3. **Set environment variable**:
```bash
export KAFKA_BROKERS=localhost:9092
```

4. **Install dependencies**:
```bash
cd backend/appointment-service && npm install
cd backend/notification-service && npm install
```

5. **Start services**:
```bash
# Terminal 1
cd backend/appointment-service && npm start

# Terminal 2  
cd backend/notification-service && npm start
```

## Kafka Management

### Create Topics (if auto-create is disabled)
```bash
docker exec healthcare-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic appointments \
  --partitions 3 \
  --replication-factor 1
```

### List Topics
```bash
docker exec healthcare-kafka kafka-topics --list \
  --bootstrap-server localhost:9092
```

### View Messages
```bash
docker exec healthcare-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic appointments \
  --from-beginning
```

### Check Consumer Groups
```bash
docker exec healthcare-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list
```

### View Consumer Lag
```bash
docker exec healthcare-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group notification-service-group \
  --describe
```

## Backward Compatibility

The old Redis files are kept for reference:
- `backend/appointment-service/src/events/publisher.js` (Redis version)
- `backend/notification-service/src/events/subscriber.js` (Redis version)

To revert to Redis:
1. Update docker-compose.yml to use Redis
2. Update package.json dependencies
3. Change imports in index.js files from `-kafka` to original files
4. Update environment variables

## Testing Event Flow

### 1. Create an Appointment
```bash
curl -X POST http://localhost:4002/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "doctorId": "...",
    "doctorName": "Dr. Smith",
    "date": "2025-12-15",
    "timeSlot": "10:00 AM",
    "reason": "Check-up"
  }'
```

### 2. Check Kafka Messages
```bash
docker exec healthcare-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic appointments \
  --from-beginning \
  --max-messages 1
```

### 3. Verify Notification Created
Check notification-service logs for processing confirmation:
```bash
docker logs healthcare-notification-service | grep "NOTIFICATION:"
```

## Troubleshooting

### Kafka Connection Issues
```bash
# Check if Kafka is running
docker ps | grep kafka

# Check Kafka logs
docker logs healthcare-kafka

# Check if topics exist
docker exec healthcare-kafka kafka-topics --list \
  --bootstrap-server localhost:9092
```

### Consumer Not Receiving Messages
1. Check consumer group status
2. Verify topic exists
3. Check for consumer lag
4. Review service logs for errors

### Performance Tuning
For production, consider:
- Increasing partition count for parallel processing
- Adjusting batch size and linger settings
- Configuring compression (gzip, snappy, lz4)
- Setting up replication factor > 1
- Monitoring consumer lag

## Production Considerations

### 1. Kafka Cluster
- Run at least 3 Kafka brokers
- Set replication factor to 3
- Use dedicated Zookeeper ensemble

### 2. Security
- Enable SSL/TLS encryption
- Configure SASL authentication
- Use ACLs for topic access control

### 3. Monitoring
- Use Prometheus + Grafana
- Monitor consumer lag
- Set up alerts for broker failures
- Track message throughput

### 4. Backup & Recovery
- Regular snapshots of Kafka data
- Document topic configurations
- Have rollback plan

## Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Confluent Platform](https://docs.confluent.io/)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)
