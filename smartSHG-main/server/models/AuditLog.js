const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetModel: String,
    targetId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    description: {
      type: String,
      required: true,
    },
    reference: String,
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
