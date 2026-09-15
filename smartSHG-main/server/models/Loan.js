const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanId: {
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
    principal: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [100, 'Principal must be at least ₹100'],
    },
    purpose: {
      type: String,
      required: [true, 'Loan purpose is required'],
      trim: true,
    },
    interestRate: {
      type: Number, // Annual percentage rate, e.g., 12 for 12% per year (1% per month)
      required: true,
      default: 12,
      min: 0,
      max: 100,
    },
    interestMethod: {
      type: String,
      enum: ['REDUCING_BALANCE', 'SIMPLE_INTEREST'],
      default: 'REDUCING_BALANCE',
    },
    tenureMonths: {
      type: Number,
      required: true,
      min: [1, 'Tenure must be at least 1 month'],
      max: [60, 'Tenure cannot exceed 60 months'],
    },
    startDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED'],
      default: 'REQUESTED',
      index: true,
    },
    rejectionReason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disbursedAt: Date,
    disbursementMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER'],
      default: 'BANK_TRANSFER',
    },
    disbursementTxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
    totalInterest: {
      type: Number,
      default: 0,
    },
    totalPayable: {
      type: Number,
      default: 0,
    },
    emiAmount: {
      type: Number,
      default: 0,
    },
    outstandingPrincipal: {
      type: Number,
      default: 0,
    },
    outstandingInterest: {
      type: Number,
      default: 0,
    },
    totalRepaid: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

loanSchema.index({ groupId: 1, memberId: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);
