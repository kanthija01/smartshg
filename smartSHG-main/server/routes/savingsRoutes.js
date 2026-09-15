const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  recordSavings,
  listSavings,
  getMemberSavings,
  getSavingsSummary,
} = require('../controllers/savingsController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
} = require('../middleware/authMiddleware');
const { validateSavingsRecord } = require('../validators/savingsValidators');

// Endpoints under /api/groups/:groupId/savings
router.get('/', verifyToken, verifyGroupMembership, listSavings);
router.post('/', verifyToken, verifyGroupMembership, requireHead, validateSavingsRecord, recordSavings);
router.get('/my-savings', verifyToken, verifyGroupMembership, getMemberSavings);
router.get('/summary', verifyToken, verifyGroupMembership, requireHead, getSavingsSummary);

module.exports = router;
