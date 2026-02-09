const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { findUserByUsername, findAdminByUsername } = require('../temp-users');
const router = express.Router();

// Enhanced rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Apply rate limiting to authentication routes
router.use(authLimiter);

const generateToken = (userId, role) => {
  // Enhanced JWT with security claims
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expires in 24 hours
      iss: 'queueing-system', // Issuer
      aud: 'queueing-users' // Audience
    }, 
    process.env.JWT_SECRET, 
    { algorithm: 'HS256' }
  );
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation and sanitization
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Sanitize input
    const sanitizedUsername = username.trim().slice(0, 50);
    
    console.log('Login attempt for username:', sanitizedUsername);

    let user;
    
    try {
      // First check Admin collection for admin/superadmin roles
      user = await Admin.findOne({ username });
      console.log('Admin collection lookup result:', user ? `Found admin: ${user.role}` : 'Admin not found');
      
      // If not found in Admin collection, check User collection for window roles
      if (!user) {
        user = await User.findOne({ username });
        console.log('User collection lookup result:', user ? 'Found user: window' : 'User not found');
      }
      
    } catch (dbError) {
      console.log('MongoDB error, using fallback:', dbError.message);
      // Fallback to temporary users - check admin first, then user
      user = await findAdminByUsername(username);
      if (!user) {
        user = await findUserByUsername(username);
      }
      console.log('Fallback lookup result:', user ? 'Found user' : 'User not found');
    }

    if (!user) {
      console.log('User not found for username:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      console.log('User deactivated:', username);
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    console.log('User found and authenticated:', username, 'Role:', user.role);
    const token = generateToken(user._id, user.role);
    console.log('Generated token for user:', username);
    
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      windowNumber: user.windowNumber,
      service: user.service
    };
    
    console.log('User response object:', userResponse);
    
    // Enhanced security response
    res.json({
      token,
      user: userResponse,
      expiresIn: '24h',
      tokenType: 'Bearer'
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    // Generic error message for security
    res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/super-admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Sanitize input
    const sanitizedUsername = username.trim().slice(0, 50);
    
    // Debug: Log environment variables and incoming request (without sensitive data)
    console.log('Backend - SUPER_ADMIN_USERNAME:', process.env.SUPER_ADMIN_USERNAME);
    console.log('Backend - Request username:', sanitizedUsername);
    console.log('Backend - Username match:', sanitizedUsername === process.env.SUPER_ADMIN_USERNAME);

    if (sanitizedUsername === process.env.SUPER_ADMIN_USERNAME && password === process.env.SUPER_ADMIN_PASSWORD) {
      const token = generateToken('super-admin', 'super_admin');
      res.json({
        token,
        user: {
          id: 'super-admin',
          username: process.env.SUPER_ADMIN_USERNAME,
          email: process.env.SUPER_ADMIN_EMAIL,
          role: 'super_admin'
        },
        expiresIn: '24h',
        tokenType: 'Bearer'
      });
    } else {
      // Generic error message for security
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

module.exports = router;
