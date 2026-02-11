const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate token structure
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }
    
    // For super admin, the userId is 'super-admin'
    if (decoded.role === 'super_admin' && decoded.userId === 'super-admin') {
      req.user = {
        id: 'super-admin',
        role: 'super_admin',
        username: process.env.SUPER_ADMIN_USERNAME
      };
      return next();
    }
    
    // For regular users, fetch from appropriate collection
    let user;
    if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      user = await Admin.findById(decoded.userId).select('-password');
    } else if (decoded.role === 'window') {
      user = await User.findById(decoded.userId).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    req.user = {
      id: user._id,
      role: user.role,
      username: user.username,
      windowNumber: user.windowNumber,
      service: user.service,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(401).json({ message: 'Token validation failed' });
  }
};

// Role-based middleware factory
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Specific role middleware functions
const requireAdmin = requireRole('admin', 'super_admin');
const requireWindow = requireRole('window');
const requireSuperAdmin = requireRole('super_admin');

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireWindow,
  requireSuperAdmin
};
