const mongoose = require('mongoose');

const transactionStepSchema = new mongoose.Schema({
  stepNumber: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    required: true,
    trim: true
  },
  windowNumber: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  }
});

const transactionFlowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  prefix: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    maxlength: 3
  },
  steps: [transactionStepSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transactionFlowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure steps are sorted by stepNumber
  if (this.steps && this.steps.length > 0) {
    this.steps.sort((a, b) => a.stepNumber - b.stepNumber);
  }
  
  next();
});

module.exports = mongoose.model('TransactionFlow', transactionFlowSchema);
