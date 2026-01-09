const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// RPC method implementations
const verifyToken = async (call, callback) => {
  try {
    const { token } = call.request;
    
    if (!token) {
      return callback(null, {
        valid: false,
        user_id: '',
        role: '',
        email: '',
        name: '',
        error_message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure user still exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return callback(null, {
        valid: false,
        user_id: '',
        role: '',
        email: '',
        name: '',
        error_message: 'User not found'
      });
    }

    callback(null, {
      valid: true,
      user_id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      error_message: ''
    });
  } catch (error) {
    console.error('Token verification error:', error);
    callback(null, {
      valid: false,
      user_id: '',
      role: '',
      email: '',
      name: '',
      error_message: error.message || 'Invalid token'
    });
  }
};

const getUser = async (call, callback) => {
  try {
    const { user_id } = call.request;
    
    if (!user_id) {
      return callback(null, {
        found: false,
        user_id: '',
        name: '',
        email: '',
        role: '',
        error_message: 'User ID required'
      });
    }

    const user = await User.findById(user_id);
    
    if (!user) {
      return callback(null, {
        found: false,
        user_id: '',
        name: '',
        email: '',
        role: '',
        error_message: 'User not found'
      });
    }

    callback(null, {
      found: true,
      user_id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      error_message: ''
    });
  } catch (error) {
    console.error('Get user error:', error);
    callback(null, {
      found: false,
      user_id: '',
      name: '',
      email: '',
      role: '',
      error_message: error.message || 'Error retrieving user'
    });
  }
};

const getDoctor = async (call, callback) => {
  try {
    const { doctor_id } = call.request;
    
    if (!doctor_id) {
      return callback(null, {
        found: false,
        doctor_id: '',
        name: '',
        email: '',
        specialization: '',
        error_message: 'Doctor ID required'
      });
    }

    const doctor = await User.findOne({ _id: doctor_id, role: 'doctor' });
    
    if (!doctor) {
      return callback(null, {
        found: false,
        doctor_id: '',
        name: '',
        email: '',
        specialization: '',
        error_message: 'Doctor not found'
      });
    }

    callback(null, {
      found: true,
      doctor_id: doctor._id.toString(),
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization || '',
      error_message: ''
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    callback(null, {
      found: false,
      doctor_id: '',
      name: '',
      email: '',
      specialization: '',
      error_message: error.message || 'Error retrieving doctor'
    });
  }
};

// Initialize and start gRPC server
const startGrpcServer = () => {
  const server = new grpc.Server();
  
  server.addService(authProto.AuthService.service, {
    verifyToken,
    getUser,
    getDoctor
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50051';
  const serverAddress = `0.0.0.0:${GRPC_PORT}`;
  
  server.bindAsync(
    serverAddress,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      console.log(`gRPC Server running on port ${port}`);
    }
  );
  
  return server;
};

module.exports = { startGrpcServer };
