const AuditLog = require('../models/AuditLog');

// @desc    List group audit logs (HEAD only)
// @route   GET /api/groups/:groupId/audit
const listAuditLogs = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { action, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter = { groupId };
    if (action && action !== 'ALL') filter.action = action;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      logs,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAuditLogs,
};
