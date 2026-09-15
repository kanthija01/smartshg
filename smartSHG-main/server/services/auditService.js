const AuditLog = require('../models/AuditLog');

async function logAudit({
  groupId,
  userId,
  userName = 'System',
  userRole = 'SYSTEM',
  action,
  targetModel = '',
  targetId = null,
  amount = null,
  description,
  reference = '',
  metadata = {},
  req = null,
}) {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      : '';

    const entry = new AuditLog({
      groupId,
      userId,
      userName,
      userRole,
      action,
      targetModel,
      targetId,
      amount,
      description,
      reference,
      metadata,
      ipAddress,
    });

    await entry.save();
    return entry;
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
  }
}

module.exports = {
  logAudit,
};
