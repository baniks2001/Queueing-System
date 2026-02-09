const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  queueNumber: {
    type: String,
    required: true,
    unique: true
  },
  personType: {
    type: String,
    enum: ['Normal', 'Person with disabilities', 'Pregnant', 'Senior Citizen', 'Priority'],
    default: 'Normal'
  },
  service: {
    type: String,
    required: true
  },
  // Transaction flow specific fields
  transactionName: {
    type: String,
    required: false
  },
  transactionPrefix: {
    type: String,
    required: false
  },
  currentStep: {
    type: Number,
    default: 0
  },
  totalSteps: {
    type: Number,
    default: 0
  },
  windowFlow: [{
    windowNumber: Number,
    order: Number
  }],
  status: {
    type: String,
    enum: ['waiting', 'serving', 'completed', 'missed'],
    default: 'waiting'
  },
  currentWindow: {
    type: Number,
    default: null
  },
  nextWindow: {
    type: Number,
    default: null
  },
  previousWindows: [{
    windowNumber: Number,
    timestamp: Date
  }],
  waitingTime: {
    type: Number,
    default: 0
  },
  serviceStartTime: {
    type: Date,
    default: null
  },
  serviceEndTime: {
    type: Date,
    default: null
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

queueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Queue', queueSchema);
