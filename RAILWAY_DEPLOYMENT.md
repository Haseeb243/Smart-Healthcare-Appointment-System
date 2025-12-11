# Railway Deployment Guide

## Prerequisites
- Railway.app account (sign up at https://railway.app)
- GitHub account connected to Railway

## Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 2: Deploy Services on Railway

### 2.1 Create New Project
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `Smart-Healthcare-Appointment-System` repository

### 2.2 Deploy MongoDB
1. In your Railway project, click "+ New"
2. Select "Database" → "MongoDB"
3. MongoDB will be automatically provisioned
4. Copy the `MONGO_URL` from the Variables tab

### 2.3 Deploy Kafka & Zookeeper
1. Click "+ New" → "Empty Service"
2. Name it "zookeeper"
3. In Settings → Docker Image: `confluentinc/cp-zookeeper:7.5.0`
4. Add Environment Variables:
   ```
   ZOOKEEPER_CLIENT_PORT=2181
   ZOOKEEPER_TICK_TIME=2000
   ```

5. Click "+ New" → "Empty Service" for Kafka
6. Name it "kafka"
7. In Settings → Docker Image: `confluentinc/cp-kafka:7.5.0`
8. Add Environment Variables:
   ```
   KAFKA_BROKER_ID=1
   KAFKA_ZOOKEEPER_CONNECT=zookeeper.railway.internal:2181
   KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka.railway.internal:29092
   KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT
   KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
   ```

### 2.4 Deploy Auth Service
1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. In Settings:
   - Root Directory: `backend/auth-service`
   - Dockerfile Path: `Dockerfile.railway`
4. Add Environment Variables:
   ```
   PORT=4001
   MONGODB_URI=<your-mongodb-url-from-step-2.2>
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   FRONTEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   NODE_ENV=production
   ```
5. In Settings → Networking → Enable "Generate Domain"
6. Copy the public URL (e.g., `https://auth-service.railway.app`)

### 2.5 Deploy Appointment Service
1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. In Settings:
   - Root Directory: `backend/appointment-service`
   - Dockerfile Path: `Dockerfile.railway`
4. Add Environment Variables:
   ```
   PORT=4002
   MONGODB_URI=<your-mongodb-url>
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   FRONTEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   KAFKA_BROKERS=kafka.railway.internal:29092
   NODE_ENV=production
   ```
5. Enable "Generate Domain"
6. Copy the public URL

### 2.6 Deploy Notification Service
1. Click "+ New" → "GitHub Repo"
2. Select your repository
3. In Settings:
   - Root Directory: `backend/notification-service`
   - Dockerfile Path: `Dockerfile.railway`
4. Add Environment Variables:
   ```
   PORT=4003
   MONGODB_URI=<your-mongodb-url>
   KAFKA_BROKERS=kafka.railway.internal:29092
   FRONTEND_URL=${{RAILWAY_PUBLIC_DOMAIN}}
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=haseebahmad8986@gmail.com
   SMTP_PASS=ofem lqig lpof qcys
   NODE_ENV=production
   ```
5. Enable "Generate Domain"
6. Copy the public URL

## Step 3: Update Frontend Environment Variables

Create `/frontend/.env.local`:
```
NEXT_PUBLIC_AUTH_API_URL=https://your-auth-service.railway.app/api
NEXT_PUBLIC_APPOINTMENT_API_URL=https://your-appointment-service.railway.app/api
NEXT_PUBLIC_NOTIFICATION_API_URL=https://your-notification-service.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-notification-service.railway.app
```

## Step 4: Deploy Frontend to Vercel
```bash
cd frontend
vercel --prod
```

Add environment variables in Vercel dashboard.

## URLs You'll Have:
- Auth Service: `https://auth-service-xxx.railway.app`
- Appointment Service: `https://appointment-service-xxx.railway.app`
- Notification Service: `https://notification-service-xxx.railway.app`
- Frontend: `https://your-app.vercel.app`

## Testing
All services will have HTTPS automatically, fixing CORS issues!
