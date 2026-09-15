const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
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
    transactionType: {
      type: String,
      enum: [
        'SAVINGS_COLLECTION',
        'BANK_DEPOSIT',
        'BANK_WITHDRAWAL',
        'LOAN_DISBURSEMENT',
        'LOAN_REPAYMENT',
        'EXPENSE',
        'ADJUSTMENT',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'ONLINE', 'CHEQUE', 'OTHER'],
      default: 'CASH',
    },
    sourceAccount: {
      type: String,
      enum: ['CASH', 'BANK', 'MEMBER_SAVINGS', 'EXTERNAL'],
      required: true,
    },
    destinationAccount: {
      type: String,
      enum: ['BANK', 'CASH', 'LOAN_ACCOUNT', 'EXPENSE_ACCOUNT', 'MEMBER_SAVINGS'],
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    reference: {
      type: String, // E.g., Challan No, UTR, Loan Ref, Receipt No
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'REVERSED'],
      default: 'COMPLETED',
      index: true,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
    },
    reversalReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

financialTransactionSchema.index({ groupId: 1, date: -1 });

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
