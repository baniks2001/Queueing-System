const mongoose = require('mongoose');

const personTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: mongoose.Schema.Types.Mixed,
    default: 0,
    validate: {
      validator: function(value) {
        // Allow both numbers and strings, convert to number
        const numValue = typeof value === 'string' ? 
          value.toLowerCase() === 'low' ? 0 :
          value.toLowerCase() === 'medium' ? 5 :
          value.toLowerCase() === 'high' ? 9 :
          parseInt(value) : value;
        
        return !isNaN(numValue) && numValue >= 0 && numValue <= 10;
      },
      message: 'Priority must be between 0 and 10'
    }
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

personTypeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('PersonType', personTypeSchema);
