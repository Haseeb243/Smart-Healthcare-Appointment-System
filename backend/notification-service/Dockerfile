FROM node:20-alpine

WORKDIR /app

# Copy proto files from root
COPY proto ./proto

# Copy service files
COPY backend/notification-service/package*.json ./

RUN npm install

COPY backend/notification-service .

EXPOSE 4003

CMD ["npm", "start"]
