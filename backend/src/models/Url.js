const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
    minlength: 3, // Custom codes can be 3-20 chars (Requirement 3.4, 3.5)
    maxlength: 20, // Custom codes can be up to 20 chars (Requirement 3.5)
    index: true,
  },
  originalUrl: {
    type: String,
    required: true,
    maxlength: 2048,
    index: true,
  },
  customCode: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  clicks: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  metadata: {
    userAgent: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
  },
  analytics: {
    totalClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastClickAt: {
      type: Date,
      required: false,
    },
    topReferrers: [
      {
        source: {
          type: String,
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    clicksByDay: [
      {
        date: {
          type: Date,
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
  },
});

// Create indexes for analytics queries
urlSchema.index({ 'analytics.totalClicks': -1 });
urlSchema.index({ 'analytics.lastClickAt': -1 });

// Update the updatedAt timestamp before saving
urlSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Atomically increment the click counter
 * @returns {Promise<void>}
 */
urlSchema.methods.incrementClicks = async function () {
  await this.constructor.updateOne(
    { _id: this._id },
    { $inc: { clicks: 1 }, $set: { updatedAt: Date.now() } }
  );
  this.clicks += 1;
  this.updatedAt = Date.now();
};

/**
 * Mark URL as inactive
 * @returns {Promise<void>}
 */
urlSchema.methods.deactivate = async function () {
  this.isActive = false;
  this.updatedAt = Date.now();
  await this.save();
};

const Url = mongoose.model('Url', urlSchema);

module.exports = Url;
