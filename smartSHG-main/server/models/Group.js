const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'SHG name is required'],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    villageTown: {
      type: String,
      required: [true, 'Village or Town is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      default: 'Andhra Pradesh',
      trim: true,
    },
    formationDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    monthlySavingsAmount: {
      type: Number,
      default: 500,
      min: [10, 'Monthly savings amount must be at least ₹10'],
    },
    dueDayOfMonth: {
      type: Number,
      default: 10,
      min: 1,
      max: 28,
    },
    bankDetails: {
      bankName: { type: String, trim: true, default: 'State Bank of India' },
      branch: { type: String, trim: true, default: 'Main Branch' },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
    },
    lastReconciliation: {
      passbookBalance: Number,
      difference: Number,
      explanation: String,
      reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reconciledAt: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate a readable SHG code before saving if not present
groupSchema.pre('save', function (next) {
  if (!this.code) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanPrefix = this.name.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase() || 'SHG';
    this.code = `${cleanPrefix}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
