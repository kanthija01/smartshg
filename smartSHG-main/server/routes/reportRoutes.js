const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getFinancialSummaryReport,
  getLoanReport,
  getMemberStatement,
} = require('../controllers/reportController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
  verifyResourceOwnership,
} = require('../middleware/authMiddleware');

// Endpoints under /api/groups/:groupId/reports
router.get('/summary', verifyToken, verifyGroupMembership, requireHead, getFinancialSummaryReport);
router.get('/loans', verifyToken, verifyGroupMembership, requireHead, getLoanReport);
router.get('/member-statement/:memberId', verifyToken, verifyGroupMembership, verifyResourceOwnership('memberId'), getMemberStatement);

module.exports = router;
