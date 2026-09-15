const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'STATIONARY',
        'REFRESHMENTS',
        'TRAVEL',
        'BOOKKEEPING',
        'BANK_CHARGES',
        'COMMUNITY_EVENT',
        'TRAINING',
        'OTHER',
      ],
      default: 'OTHER',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    paymentSource: {
      type: String,
      enum: ['CASH', 'BANK', 'OTHER'],
      required: true,
      default: 'CASH',
    },
    reference: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

expenseSchema.index({ groupId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
