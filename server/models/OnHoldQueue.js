const mongoose = require('mongoose');

const onHoldQueueSchema = new mongoose.Schema({
  // Reference to original queue
  originalQueueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Queue',
    required: true
  },
  // Copy of essential queue data for redundancy
  queueNumber: {
    type: String,
    required: true
  },
  personType: {
    type: String,
    required: true,
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
  // On-hold specific fields
  holdStartTime: {
    type: Date,
    default: Date.now
  },
  holdReason: {
    type: String,
    required: false,
    default: 'Manual hold by operator'
  },
  // Window assignment
  currentWindow: {
    type: Number,
    default: null
  },
  // Timing fields
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
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

onHoldQueueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('OnHoldQueue', onHoldQueueSchema);
