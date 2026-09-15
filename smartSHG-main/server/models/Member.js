const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
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
    memberNumber: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      enum: ['PRESIDENT', 'SECRETARY', 'TREASURER', 'MEMBER'],
      default: 'MEMBER',
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'INACTIVE'],
      default: 'PENDING',
    },
    totalSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingLoan: {
      type: Number,
      default: 0,
      min: 0,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

memberSchema.index({ userId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('Member', memberSchema);
