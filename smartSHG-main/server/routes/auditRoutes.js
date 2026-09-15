const express = require('express');
const router = express.Router({ mergeParams: true });
const { listAuditLogs } = require('../controllers/auditController');
const { verifyToken, requireHead, verifyGroupMembership } = require('../middleware/authMiddleware');

router.get('/', verifyToken, verifyGroupMembership, requireHead, listAuditLogs);

module.exports = router;
