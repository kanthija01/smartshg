const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    title: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    message: {
      en: { type: String, required: true },
      te: { type: String, required: true },
    },
    type: {
      type: String,
      enum: [
        'SAVINGS_DUE',
        'SAVINGS_RECORDED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'LOAN_REQUESTED',
        'LOAN_APPROVED',
        'LOAN_REJECTED',
        'LOAN_DISBURSED',
        'EMI_DUE',
        'EMI_OVERDUE',
        'MEETING_REMINDER',
        'SCHEME_UPDATE',
        'GENERAL',
      ],
      default: 'GENERAL',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
