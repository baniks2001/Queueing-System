const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Service = require('../models/Service');
const PersonType = require('../models/PersonType');
const TransactionFlow = require('../models/TransactionFlow');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/admins', async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (req.userId !== 'super-admin' && role === 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can create super admin accounts' });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const newAdmin = new User({
      username,
      password,
      role: role || 'admin'
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        role: newAdmin.role,
        isActive: newAdmin.isActive
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, isActive } = req.body;

    if (req.userId !== 'super-admin' && role === 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can assign super admin role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    user.username = username;
    user.role = role;
    user.isActive = isActive;

    await user.save();

    res.json({
      message: 'Admin updated successfully',
      admin: {
        id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete super admin account' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/public/services', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json(services);
  } catch (error) {
    console.error('Get public services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/service', async (req, res) => {
  try {
    const { name, description, prefix, windowFlow } = req.body;

    const existingService = await Service.findOne({
      $or: [{ name }, { prefix }]
    });

    if (existingService) {
      return res.status(400).json({ message: 'Service name or prefix already exists' });
    }

    const newService = new Service({
      name,
      description,
      prefix,
      windowFlow: windowFlow || []
    });

    await newService.save();

    res.status(201).json({
      message: 'Service created successfully',
      service: newService
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, prefix, windowFlow, isActive } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (name !== service.name) {
      const existingService = await Service.findOne({ name });
      if (existingService) {
        return res.status(400).json({ message: 'Service name already exists' });
      }
    }

    service.name = name;
    service.description = description;
    service.prefix = prefix;
    service.windowFlow = windowFlow || service.windowFlow;
    service.isActive = isActive;

    await service.save();

    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/service/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await Service.findByIdAndDelete(id);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/person-types', async (req, res) => {
  try {
    const personTypes = await PersonType.find().sort({ priority: -1, name: 1 });
    res.json(personTypes);
  } catch (error) {
    console.error('Get person types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public endpoint for person types (no authentication required)
router.get('/person-types/public', async (req, res) => {
  try {
    const personTypes = await PersonType.find({ isActive: true }).sort({ name: 1 });
    res.json(personTypes);
  } catch (error) {
    console.error('Get public person types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/person-type', async (req, res) => {
  try {
    const { name, description, priority, color } = req.body;

    const existingPersonType = await PersonType.findOne({ name });
    if (existingPersonType) {
      return res.status(400).json({ message: 'Person type already exists' });
    }

    const newPersonType = new PersonType({
      name,
      description,
      priority: priority || 0,
      color: color || '#3B82F6'
    });

    await newPersonType.save();

    res.status(201).json({
      message: 'Person type created successfully',
      personType: newPersonType
    });
  } catch (error) {
    console.error('Create person type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/person-type/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, priority, color, isActive } = req.body;

    const personType = await PersonType.findById(id);
    if (!personType) {
      return res.status(404).json({ message: 'Person type not found' });
    }

    if (name !== personType.name) {
      const existingPersonType = await PersonType.findOne({ name });
      if (existingPersonType) {
        return res.status(400).json({ message: 'Person type already exists' });
      }
    }

    personType.name = name;
    personType.description = description;
    personType.priority = priority;
    personType.color = color;
    personType.isActive = isActive;

    await personType.save();

    res.json({
      message: 'Person type updated successfully',
      personType
    });
  } catch (error) {
    console.error('Update person type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/person-type/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await PersonType.findByIdAndDelete(id);

    res.json({ message: 'Person type deleted successfully' });
  } catch (error) {
    console.error('Delete person type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public endpoint for transaction flows (no authentication required)
router.get('/public/transaction-flows', async (req, res) => {
  try {
    console.log('Fetching public transaction flows...');
    const transactionFlows = await TransactionFlow.find({ isActive: true }).sort({ createdAt: -1 });
    console.log('Public transaction flows found:', transactionFlows.length);
    res.json(transactionFlows);
  } catch (error) {
    console.error('Fetch public transaction flows error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transaction Flow Routes
// GET all transaction flows
router.get('/transaction-flows', async (req, res) => {
  try {
    console.log('=== Fetching transaction flows ===');
    console.log('🔍 Querying database...');
    const transactionFlows = await TransactionFlow.find().sort({ createdAt: -1 });
    console.log('📊 Found flows:', transactionFlows.length);
    console.log('📊 Flow data:', JSON.stringify(transactionFlows, null, 2));
    res.json(transactionFlows);
  } catch (error) {
    console.error('❌ Fetch transaction flows error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create transaction flow
router.post('/transaction-flow', async (req, res) => {
  try {
    console.log('=== Creating transaction flow ===');
    console.log('Request body:', req.body);
    const { name, description, prefix, steps } = req.body;

    // Validate required fields
    if (!name || !prefix || !steps || steps.length === 0) {
      console.log('❌ Validation failed: missing required fields');
      return res.status(400).json({ message: 'Name, prefix, and at least one step are required' });
    }

    // Check if transaction flow with same name or prefix already exists
    console.log('🔍 Checking for existing flow...');
    const existingFlow = await TransactionFlow.findOne({
      $or: [{ name }, { prefix }]
    });

    if (existingFlow) {
      console.log('❌ Flow already exists:', existingFlow.name);
      if (existingFlow.name === name) {
        return res.status(400).json({ message: 'Transaction flow with this name already exists' });
      }
      if (existingFlow.prefix === prefix) {
        return res.status(400).json({ message: 'Transaction flow with this prefix already exists' });
      }
    }

    // Validate steps
    for (const step of steps) {
      if (!step.stepName || step.stepNumber === undefined || step.windowNumber === undefined) {
        console.log('❌ Step validation failed:', step);
        return res.status(400).json({ message: 'Each step must have stepName, stepNumber, and windowNumber' });
      }
    }

    console.log('✅ Validation passed, creating flow...');
    const transactionFlow = new TransactionFlow({
      name,
      description,
      prefix: prefix.toUpperCase(),
      steps,
      isActive: true
    });

    console.log('💾 Saving to database...');
    await transactionFlow.save();
    console.log('✅ Transaction flow created successfully:', transactionFlow._id);
    console.log('📊 Flow data:', JSON.stringify(transactionFlow, null, 2));
    
    res.status(201).json(transactionFlow);
  } catch (error) {
    console.error('❌ Create transaction flow error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update transaction flow
router.put('/transaction-flow/:id', async (req, res) => {
  try {
    console.log('Updating transaction flow:', req.params.id, req.body);
    const { name, description, prefix, steps } = req.body;

    // Validate required fields
    if (!name || !prefix || !steps || steps.length === 0) {
      return res.status(400).json({ message: 'Name, prefix, and at least one step are required' });
    }

    // Check if another transaction flow with same name or prefix already exists
    const existingFlow = await TransactionFlow.findOne({
      _id: { $ne: req.params.id },
      $or: [{ name }, { prefix }]
    });

    if (existingFlow) {
      if (existingFlow.name === name) {
        return res.status(400).json({ message: 'Transaction flow with this name already exists' });
      }
      if (existingFlow.prefix === prefix) {
        return res.status(400).json({ message: 'Transaction flow with this prefix already exists' });
      }
    }

    // Validate steps
    for (const step of steps) {
      if (!step.stepName || step.stepNumber === undefined || step.windowNumber === undefined) {
        return res.status(400).json({ message: 'Each step must have stepName, stepNumber, and windowNumber' });
      }
    }

    const transactionFlow = await TransactionFlow.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        prefix: prefix.toUpperCase(),
        steps,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!transactionFlow) {
      return res.status(404).json({ message: 'Transaction flow not found' });
    }

    console.log('Transaction flow updated successfully:', transactionFlow._id);
    res.json(transactionFlow);
  } catch (error) {
    console.error('Update transaction flow error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE transaction flow
router.delete('/transaction-flow/:id', async (req, res) => {
  try {
    console.log('Deleting transaction flow:', req.params.id);
    const transactionFlow = await TransactionFlow.findByIdAndDelete(req.params.id);

    if (!transactionFlow) {
      return res.status(404).json({ message: 'Transaction flow not found' });
    }

    console.log('Transaction flow deleted successfully:', req.params.id);
    res.json({ message: 'Transaction flow deleted successfully' });
  } catch (error) {
    console.error('Delete transaction flow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
