const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  anonymizedIp: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    required: false,
  },
  os: {
    type: String,
    required: false,
  },
  referrer: {
    type: String,
    required: false,
  },
  country: {
    type: String,
    required: false,
  },
});

// Compound index for efficient analytics queries
clickEventSchema.index({ shortCode: 1, timestamp: -1 });

// TTL index for automatic deletion after 90 days (7776000 seconds)
clickEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const ClickEvent = mongoose.model('ClickEvent', clickEventSchema);

module.exports = ClickEvent;
