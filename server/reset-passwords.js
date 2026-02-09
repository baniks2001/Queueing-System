const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/queueing-system')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Reset passwords for existing window users
const resetPasswords = async () => {
  try {
    // Find all window users
    const windowUsers = await User.find({ role: 'window' });
    
    console.log(`Found ${windowUsers.length} window users`);
    
    // Reset passwords to simple values for testing
    const passwordResets = [
      { username: 'window1', newPassword: 'window123' },
      { username: 'window2', newPassword: 'window123' },
      { username: 'window3', newPassword: 'window123' },
      { username: 'window4', newPassword: 'window123' },
      { username: 'window5', newPassword: 'window123' }
    ];
    
    for (const reset of passwordResets) {
      const user = await User.findOne({ username: reset.username });
      if (user) {
        user.password = reset.newPassword; // Will be hashed by pre-save middleware
        await user.save();
        console.log(`Reset password for ${reset.username}`);
      } else {
        console.log(`User ${reset.username} not found`);
      }
    }
    
    console.log('Password reset completed');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  }
};

resetPasswords();
