const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto file - resolve from project root for better maintainability
const PROTO_PATH = process.env.PROTO_PATH || path.join(__dirname, '../../../../proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

let authClient = null;

// Initialize gRPC client
const initAuthClient = () => {
  const AUTH_GRPC_URL = process.env.AUTH_GRPC_URL || 'auth-service:50051';
  
  authClient = new authProto.AuthService(
    AUTH_GRPC_URL,
    grpc.credentials.createInsecure()
  );
  
  console.log(`Auth gRPC client initialized: ${AUTH_GRPC_URL}`);
  
  return authClient;
};

// Verify token via gRPC
// Note: proto-loader automatically converts PascalCase RPC names (VerifyToken) to camelCase (verifyToken)
const verifyTokenViaRpc = (token) => {
  return new Promise((resolve, reject) => {
    if (!authClient) {
      return reject(new Error('Auth client not initialized'));
    }

    authClient.verifyToken({ token }, (error, response) => {
      if (error) {
        console.error('gRPC verifyToken error:', error);
        return reject(error);
      }
      resolve(response);
    });
  });
};

// Get user via gRPC
const getUserViaRpc = (userId) => {
  return new Promise((resolve, reject) => {
    if (!authClient) {
      return reject(new Error('Auth client not initialized'));
    }

    authClient.getUser({ user_id: userId }, (error, response) => {
      if (error) {
        console.error('gRPC getUser error:', error);
        return reject(error);
      }
      resolve(response);
    });
  });
};

// Get doctor via gRPC
const getDoctorViaRpc = (doctorId) => {
  return new Promise((resolve, reject) => {
    if (!authClient) {
      return reject(new Error('Auth client not initialized'));
    }

    authClient.getDoctor({ doctor_id: doctorId }, (error, response) => {
      if (error) {
        console.error('gRPC getDoctor error:', error);
        return reject(error);
      }
      resolve(response);
    });
  });
};

module.exports = {
  initAuthClient,
  verifyTokenViaRpc,
  getUserViaRpc,
  getDoctorViaRpc
};
