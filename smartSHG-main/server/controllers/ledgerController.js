const FinancialTransaction = require('../models/FinancialTransaction');
const Group = require('../models/Group');
const { getDerivedBalances, recordTransaction, reverseTransaction } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');

// @desc    Get derived balances and financial health summary
// @route   GET /api/groups/:groupId/ledger/balances
const getBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const balances = await getDerivedBalances(groupId);

    const group = await Group.findById(groupId).select('name code bankDetails lastReconciliation');

    res.json({
      success: true,
      balances,
      bankDetails: group?.bankDetails,
      lastReconciliation: group?.lastReconciliation,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List financial transactions with filters, search, and pagination
// @route   GET /api/groups/:groupId/ledger/transactions
const listTransactions = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { type, account, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { groupId };
    if (type && type !== 'ALL') filter.transactionType = type;
    if (paymentMethod && paymentMethod !== 'ALL') filter.paymentMethod = paymentMethod;

    if (account && account !== 'ALL') {
      filter.$or = [{ sourceAccount: account }, { destinationAccount: account }];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const total = await FinancialTransaction.countDocuments(filter);
    const transactions = await FinancialTransaction.find(filter)
      .populate('createdBy', 'name')
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name' },
      })
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record Bank Deposit (Cash on hand deposited into bank account)
// @route   POST /api/groups/:groupId/ledger/deposit
const recordDepositToBank = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { amount, reference, notes, date } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be greater than zero.' });
    }

    // Check available cash on hand
    const balances = await getDerivedBalances(groupId);
    if (numAmount > balances.cashOnHand) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Cash on Hand. Available cash: ₹${balances.cashOnHand}, attempted deposit: ₹${numAmount}.`,
      });
    }

    const tx = await recordTransaction({
      groupId,
      transactionType: 'BANK_DEPOSIT',
      category: 'Bank Deposit',
      description: `Cash on hand deposited to bank account${notes ? ': ' + notes : ''}`,
      amount: numAmount,
      paymentMethod: 'CASH',
      sourceAccount: 'CASH',
      destinationAccount: 'BANK',
      reference: reference || `DEP-${Date.now()}`,
      createdBy: req.user._id,
      date: date || new Date(),
    });

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BANK_DEPOSIT_RECORDED',
      targetModel: 'FinancialTransaction',
      targetId: tx._id,
      amount: numAmount,
      description: `Deposited ₹${numAmount} cash to bank. Reference: ${tx.reference}`,
      reference: tx.reference,
      req,
    });

    const updatedBalances = await getDerivedBalances(groupId);

    res.status(201).json({
      success: true,
      message: `₹${numAmount} cash deposit successfully recorded.`,
      transaction: tx,
      balances: updatedBalances,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record Bank Withdrawal (Bank balance withdrawn into cash on hand)
// @route   POST /api/groups/:groupId/ledger/withdrawal
const recordCashWithdrawal = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { amount, reference, notes, date } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount must be greater than zero.' });
    }

    const balances = await getDerivedBalances(groupId);
    if (numAmount > balances.bankBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient Bank Balance. Available bank balance: ₹${balances.bankBalance}, attempted withdrawal: ₹${numAmount}.`,
      });
    }

    const tx = await recordTransaction({
      groupId,
      transactionType: 'BANK_WITHDRAWAL',
      category: 'Bank Withdrawal',
      description: `Withdrawn cash from bank for group operations${notes ? ': ' + notes : ''}`,
      amount: numAmount,
      paymentMethod: 'CHEQUE',
      sourceAccount: 'BANK',
      destinationAccount: 'CASH',
      reference: reference || `WTH-${Date.now()}`,
      createdBy: req.user._id,
      date: date || new Date(),
    });

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BANK_WITHDRAWAL_RECORDED',
      targetModel: 'FinancialTransaction',
      targetId: tx._id,
      amount: numAmount,
      description: `Withdrew ₹${numAmount} from bank to cash on hand. Reference: ${tx.reference}`,
      reference: tx.reference,
      req,
    });

    const updatedBalances = await getDerivedBalances(groupId);

    res.status(201).json({
      success: true,
      message: `₹${numAmount} bank withdrawal successfully recorded.`,
      transaction: tx,
      balances: updatedBalances,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Perform Bank Reconciliation
// @route   POST /api/groups/:groupId/ledger/reconcile
const reconcileBank = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { actualBankBalance, explanation, passbookDate } = req.body;

    const numActual = Number(actualBankBalance);
    if (isNaN(numActual) || numActual < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid actual passbook balance.' });
    }

    const balances = await getDerivedBalances(groupId);
    const difference = Math.round((numActual - balances.bankBalance) * 100) / 100;

    const group = await Group.findById(groupId);
    group.lastReconciliation = {
      passbookBalance: numActual,
      difference,
      explanation: explanation || 'Monthly passbook verification',
      reconciledBy: req.user._id,
      reconciledAt: new Date(),
    };
    await group.save();

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RECONCILIATION_PERFORMED',
      targetModel: 'Group',
      targetId: group._id,
      description: `Bank passbook reconciled. System: ₹${balances.bankBalance}, Actual: ₹${numActual}, Difference: ₹${difference}`,
      reference: `Passbook Date: ${passbookDate || new Date().toISOString().split('T')[0]}`,
      req,
    });

    res.json({
      success: true,
      message: 'Bank reconciliation recorded successfully.',
      reconciliation: {
        systemBankBalance: balances.bankBalance,
        actualBankBalance: numActual,
        difference,
        explanation: group.lastReconciliation.explanation,
        reconciledAt: group.lastReconciliation.reconciledAt,
        status: difference === 0 ? 'BALANCED' : 'DISCREPANCY_NOTED',
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reverse a transaction with audit trail
// @route   POST /api/groups/:groupId/ledger/transactions/:txId/reverse
const reverseTx = async (req, res, next) => {
  try {
    const { txId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'A clear reason for reversal is required.' });
    }

    const { originalTx, reversalTx } = await reverseTransaction(txId, reason, req.user._id);

    await logAudit({
      groupId: originalTx.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'TRANSACTION_REVERSED',
      targetModel: 'FinancialTransaction',
      targetId: reversalTx._id,
      amount: originalTx.amount,
      description: `Reversed transaction ${originalTx.transactionId}. Reason: ${reason}`,
      reference: reversalTx.transactionId,
      req,
    });

    res.json({
      success: true,
      message: `Transaction ${originalTx.transactionId} reversed successfully.`,
      reversalTransaction: reversalTx,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBalances,
  listTransactions,
  recordDepositToBank,
  recordCashWithdrawal,
  reconcileBank,
  reverseTx,
};
