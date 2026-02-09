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
    type: Number,
    default: 0,
    min: 0,
    max: 10
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
