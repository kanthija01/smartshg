const Expense = require('../models/Expense');
const { recordTransaction } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');

// @desc    Record a group expense (HEAD only)
// @route   POST /api/groups/:groupId/expenses
const recordExpense = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { date, category, amount, description, paymentSource = 'CASH', reference = '' } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero.' });
    }

    // Record in ledger: sourceAccount is CASH or BANK, destination is EXPENSE_ACCOUNT
    const sourceAccount = paymentSource === 'BANK' ? 'BANK' : 'CASH';
    const finTx = await recordTransaction({
      groupId,
      transactionType: 'EXPENSE',
      category: `Expense: ${category}`,
      description,
      amount: numAmount,
      paymentMethod: paymentSource === 'BANK' ? 'BANK_TRANSFER' : 'CASH',
      sourceAccount,
      destinationAccount: 'EXPENSE_ACCOUNT',
      reference: reference || `EXP-${Date.now()}`,
      createdBy: req.user._id,
      date: date || new Date(),
    });

    const expense = await Expense.create({
      groupId,
      date: date || new Date(),
      category,
      amount: numAmount,
      description,
      paymentSource,
      reference,
      recordedBy: req.user._id,
      financialTransactionId: finTx._id,
    });

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EXPENSE_RECORDED',
      targetModel: 'Expense',
      targetId: expense._id,
      amount: numAmount,
      description: `Recorded ₹${numAmount} expense for ${category}: ${description}`,
      reference: reference || expense._id.toString(),
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      expense,
      transactionId: finTx.transactionId,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List group expenses with filters & pagination
// @route   GET /api/groups/:groupId/expenses
const listExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { category, paymentSource, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { groupId };
    if (category && category !== 'ALL') filter.category = category;
    if (paymentSource && paymentSource !== 'ALL') filter.paymentSource = paymentSource;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('recordedBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Calculate category breakdown
    const categoryAgg = await Expense.aggregate([
      { $match: { groupId: req.group._id } },
      { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      expenses,
      categorySummary: categoryAgg,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordExpense,
  listExpenses,
};
