const bcrypt = require('bcryptjs');

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Service = require('../models/Service');
const router = express.Router();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    console.error('Users auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    console.log('Users admin middleware - UserId:', req.userId);
    console.log('Users admin middleware - UserRole:', req.userRole);
    
    if (!req.userId) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    if (req.userId === 'super-admin' || req.userRole === 'admin' || req.userRole === 'super_admin') {
      return next();
    }
    
    console.log('Users admin middleware - Access denied for user:', req.userId, 'role:', req.userRole);
    return res.status(403).json({ message: 'Admin access required' });
  } catch (error) {
    console.error('Users admin middleware error:', error);
    res.status(403).json({ message: 'Admin access required' });
  }
};

// Get all users (for admin management)
router.get('/all-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create admin user
router.post('/admin-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password, role, windowNumber, service } = req.body;

    console.log('Creating admin/table user:', { username, email, role, windowNumber, service });

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Validate required fields based on role
    if ((role === 'window' || role === 'table') && (!windowNumber || !service)) {
      return res.status(400).json({ message: 'Window/Table number and service are required for window/table users' });
    }

    const newUser = new User({
      username,
      email,
      password, // Will be hashed by pre-save middleware
      role: role || 'admin',
      windowNumber: role === 'window' || role === 'table' ? windowNumber : undefined,
      service: role === 'window' || role === 'table' ? service : undefined
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        windowNumber: newUser.windowNumber,
        service: newUser.service,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user password
router.put('/update-password/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Use direct MongoDB update to bypass pre-save hook and prevent double hashing
    await User.findByIdAndUpdate(id, { password: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status (activate/deactivate)
router.put('/update-status/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset user password (for fixing existing users)
router.post('/reset-password/:username', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/window-users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const windowUsers = await User.find({ role: 'window' })
      .select('-password')
      .sort({ windowNumber: 1 });

    res.json(windowUsers);
  } catch (error) {
    console.error('Get window users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/window-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, email, password, windowNumber, service } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const existingWindow = await User.findOne({ windowNumber });
    if (existingWindow) {
      return res.status(400).json({ message: 'Window number already assigned' });
    }

    const serviceDoc = await Service.findOne({ name: service });
    if (!serviceDoc) {
      return res.status(400).json({ message: 'Service not found' });
    }

    const newUser = new User({
      username,
      email,
      password,
      role: 'window',
      windowNumber,
      service
    });

    await newUser.save();

    res.status(201).json({
      message: 'Window user created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        windowNumber: newUser.windowNumber,
        service: newUser.service,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    console.error('Create window user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/window-user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, windowNumber, service, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    if (windowNumber !== user.windowNumber) {
      const existingWindow = await User.findOne({ windowNumber });
      if (existingWindow) {
        return res.status(400).json({ message: 'Window number already assigned' });
      }
    }

    user.username = username;
    user.email = email;
    user.windowNumber = windowNumber;
    user.service = service;
    user.isActive = isActive;

    await user.save();

    res.json({
      message: 'Window user updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        windowNumber: user.windowNumber,
        service: user.service,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update window user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/window-user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Window user deleted successfully' });
  } catch (error) {
    console.error('Delete window user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Management Routes
// GET all admins
router.get('/admins', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching admins...');
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    console.log('Found admins:', admins.length);
    res.json(admins);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create admin
router.post('/admins', authMiddleware, async (req, res) => {
  try {
    console.log('Creating admin:', req.body);
    const { username, email, password, role = 'admin' } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      if (existingAdmin.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (existingAdmin.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const admin = new Admin({
      username,
      email,
      password,
      role
    });

    await admin.save();
    console.log('Admin created successfully:', admin._id);
    
    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.status(201).json(adminResponse);
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update admin
router.put('/admins/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Updating admin:', req.params.id, req.body);
    const { username, email, role, isActive } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { username, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    console.log('Admin updated successfully');
    res.json(admin);
  } catch (error) {
    console.error('Update admin error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE admin
router.delete('/admins/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Deleting admin:', req.params.id);
    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    console.log('Admin deleted successfully');
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST toggle admin status
router.post('/admins/:id/toggle', authMiddleware, async (req, res) => {
  try {
    console.log('Toggling admin status:', req.params.id);
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    const adminResponse = admin.toObject();
    delete adminResponse.password;

    console.log('Admin status toggled successfully');
    res.json(adminResponse);
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
