const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Queue = require('../models/Queue');
const TransactionHistory = require('../models/TransactionHistory');
const KioskStatus = require('../models/KioskStatus');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get kiosk status (public endpoint - no auth required)
router.get('/status', async (req, res) => {
  try {
    // Get current kiosk status from database
    const kioskStatus = await KioskStatus.getCurrentStatus();
    
    // Check active queues for additional info
    const activeQueues = await Queue.find({ status: { $in: ['waiting', 'serving'] } });
    
    res.json({
      status: kioskStatus.status,
      isOpen: kioskStatus.isOpen, // Backward compatibility
      title: kioskStatus.title,
      governmentOfficeName: kioskStatus.governmentOfficeName,
      logo: kioskStatus.logo,
      message: kioskStatus.message,
      openedAt: kioskStatus.openedAt,
      standbyAt: kioskStatus.standbyAt,
      closedAt: kioskStatus.closedAt,
      activeQueues: activeQueues.length,
      businessHours: kioskStatus.businessHours
    });
  } catch (error) {
    console.error('Error fetching kiosk status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Open kiosk
router.post('/open', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Kiosk open request received');
    const { title, governmentOfficeName, message } = req.body;
    console.log('🔧 Requested title:', title);
    console.log('🔧 Requested government office name:', governmentOfficeName);
    
    // Update kiosk status using the model method
    const updatedStatus = await KioskStatus.updateStatus({
      status: 'open',
      title: title || 'Queue Management System',
      governmentOfficeName: governmentOfficeName || 'Government Office',
      message: message || 'Kiosk is now open for service'
    }, req.user?.id || null);
    
    console.log('🔧 Kiosk status updated successfully');
    
    res.json({ 
      message: 'Kiosk opened successfully', 
      status: updatedStatus 
    });
  } catch (error) {
    console.error('❌ Error opening kiosk:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Standby kiosk
router.post('/standby', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Kiosk standby request received');
    const { title, governmentOfficeName, message } = req.body;
    
    // Update kiosk status using the model method
    const updatedStatus = await KioskStatus.updateStatus({
      status: 'standby',
      title: title || 'Queue Management System',
      governmentOfficeName: governmentOfficeName || 'Government Office',
      message: message || 'Kiosk is temporarily paused'
    }, req.user?.id || null);
    
    console.log('🔧 Kiosk status updated to standby');
    
    res.json({ 
      message: 'Kiosk set to standby successfully', 
      status: updatedStatus 
    });
  } catch (error) {
    console.error('❌ Error setting kiosk to standby:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Close kiosk
router.post('/close', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Kiosk close request received');
    const today = new Date().toDateString();
    console.log('🔧 Today date:', today);
    
    // Get all queues for today's session
    const allQueues = await Queue.find({
      createdAt: {
        $gte: new Date(today)
      }
    });
    console.log('🔧 Found queues:', allQueues.length);
    
    // Group by transaction type and collect queue numbers
    const transactionTypes = {};
    const queueNumbers = [];
    
    allQueues.forEach(queue => {
      const service = queue.service || queue.transactionName || 'General';
      transactionTypes[service] = (transactionTypes[service] || 0) + 1;
      queueNumbers.push(queue.queueNumber);
    });
    console.log('🔧 Transaction types:', transactionTypes);
    
    // Update kiosk status
    const updatedStatus = await KioskStatus.updateStatus({
      status: 'closed',
      message: 'Kiosk is now closed'
    }, req.user?.id || null);
    
    // Create transaction history record for today
    const transactionHistory = await TransactionHistory.findOneAndUpdate(
      { date: today },
      { 
        date: today,
        title: updatedStatus.title,
        isOpen: false,
        closedAt: new Date(),
        totalTransactions: allQueues.length,
        transactionTypes: transactionTypes,
        queueNumbers: queueNumbers
      },
      { upsert: true, new: true }
    );
    console.log('🔧 Transaction history created/updated');
    
    // Delete ALL queues to reset for next session
    await Queue.deleteMany({});
    console.log('🔧 All queues deleted for reset');
    
    // Reset queue counter
    const lastQueue = await Queue.findOne().sort({ queueNumber: -1 });
    const nextNumber = lastQueue ? parseInt(lastQueue.queueNumber.replace(/\D/g, '')) + 1 : 1;
    console.log('🔧 Next queue number:', nextNumber);
    
    // Update counter in a separate collection or environment variable
    process.env.NEXT_QUEUE_NUMBER = nextNumber.toString();
    
    res.json({ 
      message: 'Kiosk closed successfully', 
      status: updatedStatus,
      transactionHistory: {
        id: transactionHistory._id,
        date: transactionHistory.date,
        title: transactionHistory.title,
        totalTransactions: transactionHistory.totalTransactions,
        transactionTypes: transactionHistory.transactionTypes,
        queueNumbers: transactionHistory.queueNumbers
      },
      totalTransactions: allQueues.length,
      transactionTypes,
      queueNumbers
    });
  } catch (error) {
    console.error('❌ Error closing kiosk:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get transaction history
router.get('/transactions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Transaction history request received');
    const transactions = await TransactionHistory.find().sort({ date: -1 });
    console.log('🔧 Found transactions:', transactions.length);
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export transaction to CSV
router.get('/export/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const transaction = await TransactionHistory.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Create CSV content
    let csvContent = 'Date,Title,Total Transactions,Queue Numbers,Transaction Types\n';
    
    // Add transaction types
    Object.entries(transaction.transactionTypes).forEach(([type, count]) => {
      csvContent += `,${type}`;
    });
    csvContent += '\n';
    
    // Add data row
    csvContent += `${transaction.date},${transaction.title},${transaction.totalTransactions},"${transaction.queueNumbers.join('; ')}"`;
    
    // Add transaction type counts
    Object.entries(transaction.transactionTypes).forEach(([type, count]) => {
      csvContent += `,${count}`;
    });
    csvContent += '\n';
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transaction-${transaction.date}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete transaction
router.delete('/transactions/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const deletedTransaction = await TransactionHistory.findByIdAndDelete(req.params.id);
    
    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get kiosk status with full details (admin only)
router.get('/status/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const kioskStatus = await KioskStatus.getCurrentStatus();
    const activeQueues = await Queue.find({ status: { $in: ['waiting', 'serving'] } });
    
    res.json({
      status: kioskStatus,
      activeQueues: activeQueues.length,
      queueDetails: activeQueues
    });
  } catch (error) {
    console.error('Error fetching admin kiosk status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update kiosk settings (admin only)
router.put('/settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { title, governmentOfficeName, message, businessHours, autoOpenClose } = req.body;
    
    const updatedStatus = await KioskStatus.updateStatus({
      title,
      governmentOfficeName,
      message,
      businessHours,
      autoOpenClose
    }, req.user?.id || null);
    
    res.json({
      message: 'Kiosk settings updated successfully',
      status: updatedStatus
    });
  } catch (error) {
    console.error('Error updating kiosk settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload logo (admin only)
router.post('/upload-logo', authMiddleware, requireAdmin, (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large (max 5MB)' });
      }
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    } else if (err) {
      console.log('❌ Upload error:', err);
      return res.status(400).json({ message: 'Upload error: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('🔧 Upload logo route hit');
    console.log('🔧 Request file:', req.file);
    console.log('🔧 Request body:', req.body);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('🔧 Logo upload request received:', req.file.filename);
    
    // Get current kiosk status
    const currentStatus = await KioskStatus.getCurrentStatus();
    
    // Delete old logo if exists
    if (currentStatus.logo) {
      const oldLogoPath = path.join(__dirname, '..', 'uploads', currentStatus.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
        console.log('🔧 Old logo deleted:', currentStatus.logo);
      }
    }
    
    // Update kiosk status with new logo filename
    const updatedStatus = await KioskStatus.updateStatus({
      logo: req.file.filename
    }, req.user?.id || null);
    
    console.log('🔧 Logo uploaded successfully:', req.file.filename);
    
    res.json({
      message: 'Logo uploaded successfully',
      logo: req.file.filename,
      logoUrl: `/uploads/${req.file.filename}`,
      status: updatedStatus
    });
  } catch (error) {
    console.error('❌ Error uploading logo:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle kiosk status (admin only)
router.post('/toggle', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const currentStatus = await KioskStatus.getCurrentStatus();
    let newStatus;
    
    // Cycle through: closed -> open -> standby -> closed
    if (currentStatus.status === 'closed') {
      newStatus = 'open';
    } else if (currentStatus.status === 'open') {
      newStatus = 'standby';
    } else {
      newStatus = 'closed';
    }
    
    const updatedStatus = await KioskStatus.updateStatus({
      status: newStatus
    }, req.user?.id || null);
    
    res.json({
      message: `Kiosk ${newStatus} successfully`,
      status: updatedStatus
    });
  } catch (error) {
    console.error('Error toggling kiosk status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set specific kiosk status (admin only)
router.post('/set-status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, title, message } = req.body;
    
    if (!['open', 'standby', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: open, standby, or closed' });
    }
    
    const updatedStatus = await KioskStatus.updateStatus({
      status,
      title,
      message
    }, req.user?.id || null);
    
    res.json({
      message: `Kiosk set to ${status} successfully`,
      status: updatedStatus
    });
  } catch (error) {
    console.error('Error setting kiosk status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
