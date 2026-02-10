const mongoose = require('mongoose');

const transactionHistorySchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  openedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  transactionTypes: {
    type: Map,
    of: String,
    default: {}
  },
  queueNumbers: [{
    type: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
transactionHistorySchema.index({ isOpen: 1 });

module.exports = mongoose.model('TransactionHistory', transactionHistorySchema);
