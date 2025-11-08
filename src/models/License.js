const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  licenseKeyHash: { type: String, required: true, unique: true },
  type: { type: String, enum: ['free', 'free trial', 'monthly', 'yearly'], required: true },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  machineId: { type: String },
  features: { type: Object },
  createdAt: { type: Date, default: Date.now },
  lastValidated: { type: Date },
  remainingSyncs: { type: Number, default: 0 },
  lastSyncReset: { type: Date, default: Date.now },
  totalSyncsUsed: { type: Number, default: 0 }
});

module.exports = mongoose.model('License', licenseSchema); 