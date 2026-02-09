const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { findUserByUsername, findAdminByUsername } = require('../temp-users');
const router = express.Router();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);

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
    
    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/super-admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Debug: Log environment variables and incoming request
    console.log('Backend - SUPER_ADMIN_USERNAME:', process.env.SUPER_ADMIN_USERNAME);
    console.log('Backend - SUPER_ADMIN_PASSWORD:', process.env.SUPER_ADMIN_PASSWORD);
    console.log('Backend - Request username:', username);
    console.log('Backend - Request password:', password);
    console.log('Backend - Username match:', username === process.env.SUPER_ADMIN_USERNAME);
    console.log('Backend - Password match:', password === process.env.SUPER_ADMIN_PASSWORD);

    if (username === process.env.SUPER_ADMIN_USERNAME && password === process.env.SUPER_ADMIN_PASSWORD) {
      const token = generateToken('super-admin', 'super_admin');
      res.json({
        token,
        user: {
          id: 'super-admin',
          username: process.env.SUPER_ADMIN_USERNAME,
          email: process.env.SUPER_ADMIN_EMAIL,
          role: 'super_admin'
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid super admin credentials' });
    }
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
