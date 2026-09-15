const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    period: {
      type: String, // Format: 'YYYY-MM', e.g., '2026-09'
      required: [true, 'Savings period is required (YYYY-MM)'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in YYYY-MM format'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER'],
      required: true,
      default: 'CASH',
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PENDING', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    financialTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
  },
  {
    timestamps: true,
  }
);

savingsSchema.index({ groupId: 1, memberId: 1, period: 1, date: -1 });

module.exports = mongoose.model('Savings', savingsSchema);
