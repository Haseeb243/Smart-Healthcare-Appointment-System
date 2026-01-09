FROM node:20-alpine

WORKDIR /app

# Copy proto files from root
COPY proto ./proto

# Copy service files
COPY backend/auth-service/package*.json ./

RUN npm install

COPY backend/auth-service .

EXPOSE 4001 50051

CMD ["npm", "start"]
