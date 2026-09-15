const FinancialTransaction = require('../models/FinancialTransaction');
const Savings = require('../models/Savings');
const Loan = require('../models/Loan');
const LoanInstallment = require('../models/LoanInstallment');
const Expense = require('../models/Expense');
const Member = require('../models/Member');
const Group = require('../models/Group');
const { getDerivedBalances } = require('../services/ledgerService');

// @desc    Get comprehensive group financial summary & analytics
// @route   GET /api/groups/:groupId/reports/summary
const getFinancialSummaryReport = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { timeRange = 'MONTH' } = req.query; // 'TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'

    const group = await Group.findById(groupId);
    const balances = await getDerivedBalances(groupId);

    // Date range filter
    const now = new Date();
    let dateFilter = {};
    if (timeRange === 'TODAY') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { date: { $gte: startOfDay } };
    } else if (timeRange === 'WEEK') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { date: { $gte: weekAgo } };
    } else if (timeRange === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { date: { $gte: startOfMonth } };
    }

    // Cash flow breakdown (Inflows vs Outflows)
    const txMatch = { groupId: group._id, status: 'COMPLETED', ...dateFilter };
    const transactions = await FinancialTransaction.find(txMatch).sort({ date: 1 });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const tx of transactions) {
      if (['SAVINGS_COLLECTION', 'LOAN_REPAYMENT'].includes(tx.transactionType)) {
        totalInflow += tx.amount;
      } else if (['LOAN_DISBURSEMENT', 'EXPENSE'].includes(tx.transactionType)) {
        totalOutflow += tx.amount;
      }
    }

    // Monthly trend for the past 6 months for Recharts
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const sixMonthsTx = await FinancialTransaction.find({
      groupId: group._id,
      status: 'COMPLETED',
      date: { $gte: sixMonthsAgo },
    });

    const monthlyTrendsMap = {};
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      months.push({ key, label });
      monthlyTrendsMap[key] = { month: label, savings: 0, loansDisbursed: 0, repayments: 0, expenses: 0 };
    }

    for (const tx of sixMonthsTx) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendsMap[key]) {
        if (tx.transactionType === 'SAVINGS_COLLECTION') monthlyTrendsMap[key].savings += tx.amount;
        if (tx.transactionType === 'LOAN_DISBURSEMENT') monthlyTrendsMap[key].loansDisbursed += tx.amount;
        if (tx.transactionType === 'LOAN_REPAYMENT') monthlyTrendsMap[key].repayments += tx.amount;
        if (tx.transactionType === 'EXPENSE') monthlyTrendsMap[key].expenses += tx.amount;
      }
    }

    const chartData = Object.values(monthlyTrendsMap);

    res.json({
      success: true,
      timeRange,
      balances,
      cashFlow: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
      },
      chartData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Detailed Loan Portfolio Report
// @route   GET /api/groups/:groupId/reports/loans
const getLoanReport = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const loans = await Loan.find({ groupId })
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name phone' },
      })
      .sort({ createdAt: -1 });

    const disbursedLoans = loans.filter((l) => l.status === 'DISBURSED');
    const closedLoans = loans.filter((l) => l.status === 'CLOSED');
    const requestedLoans = loans.filter((l) => l.status === 'REQUESTED');

    const totalPrincipalDisbursed = disbursedLoans.reduce((sum, l) => sum + l.principal, 0) + closedLoans.reduce((sum, l) => sum + l.principal, 0);
    const totalPrincipalRepaid = loans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);
    const currentOutstanding = disbursedLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

    // Overdue analysis
    const overdueInstallments = await LoanInstallment.find({
      groupId,
      dueDate: { $lt: new Date() },
      status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
    }).populate({
      path: 'memberId',
      populate: { path: 'userId', select: 'name phone' },
    });

    const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + inst.remainingAmount, 0);

    res.json({
      success: true,
      summary: {
        totalLoans: loans.length,
        disbursedCount: disbursedLoans.length,
        closedCount: closedLoans.length,
        requestedCount: requestedLoans.length,
        totalPrincipalDisbursed,
        totalPrincipalRepaid,
        currentOutstanding,
        overdueCount: overdueInstallments.length,
        overdueAmount,
      },
      loans,
      overdueInstallments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Detailed Member Statement (Only own statement for members!)
// @route   GET /api/groups/:groupId/reports/member-statement/:memberId
const getMemberStatement = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;

    // Strict IDOR enforcement
    if (req.user.role === 'MEMBER') {
      const myMember = await Member.findOne({ groupId, userId: req.user._id });
      if (!myMember || myMember._id.toString() !== memberId) {
        return res.status(403).json({ success: false, message: 'Security check: You can only access your own financial statement.' });
      }
    }

    const member = await Member.findById(memberId).populate('userId', 'name email phone');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found.' });

    const group = await Group.findById(groupId).select('name code villageTown district');

    // 1. Savings History
    const savingsList = await Savings.find({ memberId, status: 'COMPLETED' }).sort({ date: -1 });
    const totalSavings = savingsList.reduce((sum, s) => sum + s.amount, 0);

    // 2. Loans History
    const loansList = await Loan.find({ memberId }).sort({ createdAt: -1 });

    // 3. Loan Repayments & Installments
    const installments = await LoanInstallment.find({ memberId }).sort({ dueDate: 1 });

    // 4. Combined chronological transaction ledger timeline for this member
    const ledgerTx = await FinancialTransaction.find({
      groupId,
      memberId,
      status: 'COMPLETED',
    }).sort({ date: -1 });

    res.json({
      success: true,
      statement: {
        member: {
          id: member._id,
          name: member.userId?.name,
          phone: member.userId?.phone,
          memberNumber: member.memberNumber,
          joinDate: member.joinDate,
          designation: member.designation,
        },
        group,
        totalSavings,
        outstandingLoan: member.outstandingLoan || 0,
        savingsHistory: savingsList,
        loansHistory: loansList,
        installments,
        timeline: ledgerTx,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFinancialSummaryReport,
  getLoanReport,
  getMemberStatement,
};
