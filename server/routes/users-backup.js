const express = require('express');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('=== GET ALL USERS ===');
    console.log('Requester ID:', req.userId);
    console.log('Requester role:', req.userRole);
    
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log('Total users found:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('=== CREATE USER ===');
    console.log('Request body:', req.body);
    
    const { username, email, password, role, windowNumber, service } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate role
    const validRoles = ['admin', 'window', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check for existing username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check for existing window number if role is window
    if (role === 'window' && windowNumber) {
      const existingWindow = await User.findOne({ windowNumber });
      if (existingWindow) {
        return res.status(400).json({ message: 'Window number already assigned' });
      }
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12); // Higher salt rounds for security
    
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      windowNumber: role === 'window' ? windowNumber : undefined,
      service: role === 'window' ? service : undefined,
      isActive: true
    });

    await newUser.save();
    console.log('User created successfully');
    
    // Return user without password
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      windowNumber: newUser.windowNumber,
      service: newUser.service,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt
    };
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('=== UPDATE USER ===');
    console.log('Requester ID:', req.userId);
    console.log('Target user ID:', req.params.id);
    
    const { id } = req.params;
    const { username, email, password, role, windowNumber, service, isActive } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (windowNumber !== undefined) user.windowNumber = windowNumber;
    if (service !== undefined) user.service = service;
    if (isActive !== undefined) user.isActive = isActive;

    // Update password if provided
    if (password && password.trim() !== '') {
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash(password, 12);
    }

    await user.save();
    console.log('User updated successfully');
    
    res.json({
      message: 'User updated successfully',
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
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    console.log('=== DELETE USER ===');
    console.log('Requester ID:', req.userId);
    console.log('Target user ID:', req.params.id);
    
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);
    console.log('User deleted successfully');
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/window-users', async (req, res) => {
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

router.post('/window-user', async (req, res) => {
  try {
    console.log('=== CREATE WINDOW USER ===');
    console.log('Request body:', req.body);
    
    const { username, email, password, windowNumber, service } = req.body;
    
    console.log('Extracted data:', { username, email, windowNumber, service });
    console.log('Password provided:', password ? 'yes' : 'no');

    const existingUser = await User.findOne({ username });
    console.log('Existing user check:', existingUser ? 'found' : 'not found');
    
    if (existingUser) {
      console.log('Username already exists error');
      return res.status(400).json({ message: 'Username already exists' });
    }

    if (windowNumber) {
      const existingWindow = await User.findOne({ windowNumber });
      console.log('Existing window check:', existingWindow ? 'found' : 'not found');
      
      if (existingWindow) {
        console.log('Window number already assigned error');
        return res.status(400).json({ message: 'Window number already assigned' });
      }
    }

    console.log('Creating new user with hashed password...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'window',
      windowNumber,
      service,
      isActive: true
    });

    console.log('Saving new user to database...');
    await newUser.save();
    console.log('New user saved successfully');
    
    res.json({
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

router.put('/window-user/:id', async (req, res) => {
  try {
    console.log('PUT request received for user ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { id } = req.params;
    const { username, email, password, windowNumber, service, isActive } = req.body;

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

    // Update password only if provided
    if (password && password.trim() !== '') {
      console.log('Updating password for user:', user.username);
      console.log('Password before hashing:', password);
      console.log('Current password hash in DB:', user.password);
      
      const bcrypt = require('bcryptjs');
      const newPasswordHash = await bcrypt.hash(password, 10);
      console.log('New password hash:', newPasswordHash);
      
      user.password = newPasswordHash;
      console.log('User password field updated in memory:', user.password);
      
      try {
        await user.save();
        console.log('User saved successfully to database');
        
        // Verify the save by querying again
        const verifyUser = await User.findById(user._id);
        console.log('Verified password hash after save:', verifyUser.password);
        console.log('Password hashes match after save:', newPasswordHash === verifyUser.password);
      } catch (saveError) {
        console.error('Error saving user:', saveError);
      }
    } else {
      console.log('Password field empty or not provided, keeping current password');
    }

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

// Test endpoint to check user password
router.get('/test-user/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('=== USER PASSWORD CHECK ===');
    console.log('Username:', user.username);
    console.log('Stored password hash:', user.password);
    console.log('User role:', user.role);
    console.log('User active:', user.isActive);
    
    res.json({
      username: user.username,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('Test user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
