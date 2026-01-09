FROM node:20-alpine

WORKDIR /app

# Copy proto files from root
COPY proto ./proto

# Copy service files
COPY backend/appointment-service/package*.json ./

RUN npm install

COPY backend/appointment-service .

EXPOSE 4002

CMD ["npm", "start"]
