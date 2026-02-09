const bcrypt = require('bcryptjs');

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Service = require('../models/Service');
const router = express.Router();

// Debug: Check User schema
console.log('🔍 User Schema fields:', Object.keys(User.schema.paths));
console.log('🔍 User Schema required fields:', Object.keys(User.schema.paths).filter(key => User.schema.paths[key].isRequired));

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
    const { username, password, role, windowNumber, service } = req.body;

    console.log('Creating admin/table user:', { username, role, windowNumber, service });

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Validate required fields based on role
    if ((role === 'window' || role === 'table') && (!windowNumber || !service)) {
      return res.status(400).json({ message: 'Window/Table number and service are required for window/table users' });
    }

    const newUser = new User({
      username,
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

// Public endpoint for window users (no authentication required)
router.get('/window-users/public', async (req, res) => {
  try {
    const windowUsers = await User.find({ 
      role: 'window',
      isActive: true 
    })
      .select('-password')
      .sort({ windowNumber: 1 });

    res.json(windowUsers);
  } catch (error) {
    console.error('Get public window users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/window-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('🔍 Creating window user with data:', req.body);
    const { username, password, windowNumber, service } = req.body;

    // Validate required fields
    if (!username || !password || !windowNumber || !service) {
      console.log('❌ Missing required fields:', { username: !!username, password: !!password, windowNumber: !!windowNumber, service: !!service });
      return res.status(400).json({ message: 'Username, password, window number, and service are required' });
    }

    console.log('🔍 Starting user creation process...');

    // Clean up existing documents that might have email field (migration)
    try {
      await User.updateMany(
        { email: { $exists: true } },
        { $unset: { email: 1 } }
      );
      console.log('🧹 Cleaned up email field from existing users');
    } catch (cleanupError) {
      console.log('⚠️ Email cleanup failed (non-critical):', cleanupError.message);
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('❌ Username already exists:', username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if window number already assigned
    const existingWindow = await User.findOne({ windowNumber });
    if (existingWindow) {
      return res.status(400).json({ message: 'Window number already assigned' });
    }

    // Validate service exists
    console.log('🔍 Looking for service:', service);
    const serviceDoc = await Service.findOne({ name: service });
    console.log('🔍 Service found:', serviceDoc);
    if (!serviceDoc) {
      console.log('❌ Service not found:', service);
      return res.status(400).json({ message: 'Service not found' });
    }

    // Create user without email field
    const newUser = new User({
      username,
      password,
      role: 'window',
      windowNumber,
      service
    });

    console.log('🔍 Creating new user object:', {
      username: newUser.username,
      role: newUser.role,
      windowNumber: newUser.windowNumber,
      service: newUser.service
    });

    console.log('🔍 Attempting to save user...');
    await newUser.save();
    console.log('✅ Window user created successfully:', newUser._id);

    res.status(201).json({
      message: 'Window user created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        windowNumber: newUser.windowNumber,
        service: newUser.service,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    console.error('❌ Create window user error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.put('/window-user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, windowNumber, service, isActive } = req.body;

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
    user.windowNumber = windowNumber;
    user.service = service;
    user.isActive = isActive;

    await user.save();

    res.json({
      message: 'Window user updated successfully',
      user: {
        id: user._id,
        username: user.username,
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
    const { username, password, role = 'admin' } = req.body;

    // Clean up existing documents that might have email field (migration)
    try {
      await Admin.updateMany(
        { email: { $exists: true } },
        { $unset: { email: 1 } }
      );
      console.log('🧹 Cleaned up email field from existing admins');
    } catch (cleanupError) {
      console.log('⚠️ Admin email cleanup failed (non-critical):', cleanupError.message);
    }

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const admin = new Admin({
      username,
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
    const { username, role, isActive } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { username, role, isActive },
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
