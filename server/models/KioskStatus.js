const mongoose = require('mongoose');

const kioskStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['open', 'standby', 'closed'],
    default: 'closed',
    required: true
  },
  title: {
    type: String,
    default: 'Queue Management System',
    required: true
  },
  governmentOfficeName: {
    type: String,
    default: 'Government Office',
    required: false
  },
  logo: {
    type: String,
    default: null,
    required: false
  },
  message: {
    type: String,
    default: 'System is initializing...'
  },
  openedAt: {
    type: Date,
    default: null
  },
  standbyAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  businessHours: {
    openingTime: {
      type: String,
      default: '09:00'
    },
    closingTime: {
      type: String,
      default: '17:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  autoOpenClose: {
    enabled: {
      type: Boolean,
      default: false
    },
    holidays: [{
      date: Date,
      name: String
    }]
  }
}, {
  timestamps: true
});

// Virtual for backward compatibility
kioskStatusSchema.virtual('isOpen').get(function() {
  return this.status === 'open';
});

// Static method to get current kiosk status
kioskStatusSchema.statics.getCurrentStatus = async function() {
  let status = await this.findOne().sort({ updatedAt: -1 });
  
  // If no status exists, create a default one
  if (!status) {
    status = await this.create({
      status: 'closed',
      title: 'Queue Management System',
      message: 'System is initializing...'
    });
  }
  
  return status;
};

// Static method to update kiosk status
kioskStatusSchema.statics.updateStatus = async function(updateData, updatedBy = null) {
  const currentStatus = await this.getCurrentStatus();
  
  const updateFields = {
    ...updateData,
    lastUpdatedBy: updatedBy,
    updatedAt: new Date()
  };
  
  // Add timestamps for status changes
  if (updateData.status !== undefined) {
    const now = new Date();
    
    // Reset all timestamps first
    updateFields.openedAt = null;
    updateFields.standbyAt = null;
    updateFields.closedAt = null;
    
    // Set appropriate timestamp based on new status
    if (updateData.status === 'open') {
      updateFields.openedAt = now;
      if (!updateData.message) {
        updateFields.message = 'Kiosk is now open for service';
      }
    } else if (updateData.status === 'standby') {
      updateFields.standbyAt = now;
      if (!updateData.message) {
        updateFields.message = 'Kiosk is temporarily paused';
      }
    } else if (updateData.status === 'closed') {
      updateFields.closedAt = now;
      if (!updateData.message) {
        updateFields.message = 'Kiosk is now closed';
      }
    }
  }
  
  try {
    return await this.findByIdAndUpdate(
      currentStatus._id,
      updateFields,
      { new: true, upsert: true }
    ).populate('lastUpdatedBy', 'username email');
  } catch (error) {
    // If populate fails (Admin model not available), return without population
    return await this.findByIdAndUpdate(
      currentStatus._id,
      updateFields,
      { new: true, upsert: true }
    );
  }
};

// Ensure virtuals are included in JSON output
kioskStatusSchema.set('toJSON', { virtuals: true });
kioskStatusSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('KioskStatus', kioskStatusSchema);
