const { verifyTokenViaRpc } = require('../grpc/authClient');

// gRPC-based authentication middleware
const authMiddlewareRpc = async (req, res, next) => {
  try {
    // Get token from HttpOnly cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token via gRPC call to auth service
    const response = await verifyTokenViaRpc(token);
    
    if (!response.valid) {
      return res.status(401).json({ 
        message: 'Invalid token.',
        error: response.error_message 
      });
    }

    // Set user information from gRPC response
    req.user = {
      id: response.user_id,
      role: response.role,
      email: response.email,
      name: response.name
    };
    
    next();
  } catch (error) {
    console.error('RPC Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed via RPC.' });
  }
};

// Role-based access middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = { authMiddlewareRpc, requireRole };
