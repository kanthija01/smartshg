const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getBalances,
  listTransactions,
  recordDepositToBank,
  recordCashWithdrawal,
  reconcileBank,
  reverseTx,
} = require('../controllers/ledgerController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
} = require('../middleware/authMiddleware');

// Endpoints under /api/groups/:groupId/ledger
router.get('/balances', verifyToken, verifyGroupMembership, getBalances);
router.get('/transactions', verifyToken, verifyGroupMembership, listTransactions);
router.post('/deposit', verifyToken, verifyGroupMembership, requireHead, recordDepositToBank);
router.post('/withdrawal', verifyToken, verifyGroupMembership, requireHead, recordCashWithdrawal);
router.post('/reconcile', verifyToken, verifyGroupMembership, requireHead, reconcileBank);
router.post('/transactions/:txId/reverse', verifyToken, verifyGroupMembership, requireHead, reverseTx);

module.exports = router;
