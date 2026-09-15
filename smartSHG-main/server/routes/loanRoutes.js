const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createLoanRequest,
  listLoans,
  getLoanDetails,
  approveLoanRequest,
  rejectLoanRequest,
  disburseLoanAction,
  recordLoanRepaymentAction,
} = require('../controllers/loanController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
} = require('../middleware/authMiddleware');
const { validateLoanRequest, validateLoanRepayment } = require('../validators/loanValidators');

// Endpoints under /api/groups/:groupId/loans
router.post('/', verifyToken, verifyGroupMembership, validateLoanRequest, createLoanRequest);
router.get('/', verifyToken, verifyGroupMembership, listLoans);
router.get('/:loanId', verifyToken, verifyGroupMembership, getLoanDetails);
router.put('/:loanId/approve', verifyToken, verifyGroupMembership, requireHead, approveLoanRequest);
router.put('/:loanId/reject', verifyToken, verifyGroupMembership, requireHead, rejectLoanRequest);
router.post('/:loanId/disburse', verifyToken, verifyGroupMembership, requireHead, disburseLoanAction);
router.post('/:loanId/repay', verifyToken, verifyGroupMembership, validateLoanRepayment, recordLoanRepaymentAction);

module.exports = router;
