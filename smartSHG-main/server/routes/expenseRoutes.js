const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  recordExpense,
  listExpenses,
} = require('../controllers/expenseController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
} = require('../middleware/authMiddleware');
const { validateExpense } = require('../validators/expenseValidators');

// Endpoints under /api/groups/:groupId/expenses
router.post('/', verifyToken, verifyGroupMembership, requireHead, validateExpense, recordExpense);
router.get('/', verifyToken, verifyGroupMembership, listExpenses);

module.exports = router;
