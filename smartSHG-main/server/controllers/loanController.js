const Loan = require('../models/Loan');
const LoanInstallment = require('../models/LoanInstallment');
const Member = require('../models/Member');
const { requestLoan, approveLoan, disburseLoan, recordRepayment } = require('../services/loanService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Request a loan (by Member or Head on member's behalf)
// @route   POST /api/groups/:groupId/loans
const createLoanRequest = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    let { memberId, principal, purpose, tenureMonths, interestRate, interestMethod } = req.body;

    // If logged in as MEMBER, ensure they can only request for themselves
    if (req.user.role === 'MEMBER') {
      const myMember = await Member.findOne({ groupId, userId: req.user._id });
      if (!myMember) {
        return res.status(403).json({ success: false, message: 'Member profile not found in this group.' });
      }
      memberId = myMember._id;
    }

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required.' });
    }

    const loan = await requestLoan({
      memberId,
      groupId,
      principal: Number(principal),
      purpose,
      tenureMonths: Number(tenureMonths),
      interestRate: interestRate ? Number(interestRate) : 12,
      interestMethod: interestMethod || 'REDUCING_BALANCE',
      user: req.user,
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully.',
      loan,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List loans for a group with filters & pagination
// @route   GET /api/groups/:groupId/loans
const listLoans = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status, memberId, page = 1, limit = 20 } = req.query;

    const filter = { groupId };
    if (status && status !== 'ALL') filter.status = status;

    // If Member, restrict strictly to their own member record
    if (req.user.role === 'MEMBER') {
      const myMember = await Member.findOne({ groupId, userId: req.user._id });
      if (!myMember) {
        return res.status(403).json({ success: false, message: 'Member profile not found.' });
      }
      filter.memberId = myMember._id;
    } else if (memberId) {
      filter.memberId = memberId;
    }

    const total = await Loan.countDocuments(filter);
    const loans = await Loan.find(filter)
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name phone email' },
      })
      .populate('approvedBy', 'name')
      .populate('disbursedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      loans,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get loan details and installment repayment schedule
// @route   GET /api/groups/:groupId/loans/:loanId
const getLoanDetails = async (req, res, next) => {
  try {
    const { loanId } = req.params;

    const loan = await Loan.findById(loanId)
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name phone email' },
      })
      .populate('approvedBy', 'name')
      .populate('disbursedBy', 'name');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found.' });
    }

    // Strict IDOR prevention: if member, ensure loan belongs to them
    if (req.user.role === 'MEMBER') {
      const myMember = await Member.findOne({ groupId: loan.groupId, userId: req.user._id });
      if (!myMember || loan.memberId._id.toString() !== myMember._id.toString()) {
        return res.status(403).json({ success: false, message: 'Security check: You can only view your own loan details.' });
      }
    }

    const installments = await LoanInstallment.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

    res.json({
      success: true,
      loan,
      installments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve a loan request (HEAD only)
// @route   PUT /api/groups/:groupId/loans/:loanId/approve
const approveLoanRequest = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const loan = await approveLoan(loanId, req.user);

    res.json({
      success: true,
      message: `Loan ${loan.loanId} has been approved. Ready for disbursement.`,
      loan,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject a loan request (HEAD only)
// @route   PUT /api/groups/:groupId/loans/:loanId/reject
const rejectLoanRequest = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { reason } = req.body;

    const loan = await Loan.findById(loanId).populate('memberId');
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found.' });
    if (loan.status !== 'REQUESTED') {
      return res.status(400).json({ success: false, message: `Cannot reject loan in '${loan.status}' status.` });
    }

    loan.status = 'REJECTED';
    loan.rejectionReason = reason || 'Not meeting current group criteria';
    await loan.save();

    await logAudit({
      groupId: loan.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LOAN_REJECTED',
      targetModel: 'Loan',
      targetId: loan._id,
      amount: loan.principal,
      description: `Rejected loan ${loan.loanId}. Reason: ${loan.rejectionReason}`,
      req,
    });

    if (loan.memberId && loan.memberId.userId) {
      await createNotification({
        userId: loan.memberId.userId,
        groupId: loan.groupId,
        title: { en: 'Loan Request Rejected', te: 'రుణ దరఖాస్తు తిరస్కరించబడింది' },
        message: {
          en: `Your loan request for ₹${loan.principal} was rejected. Reason: ${loan.rejectionReason}`,
          te: `మీ ₹${loan.principal} రుణ దరఖాస్తు తిరస్కరించబడింది. కారణం: ${loan.rejectionReason}`,
        },
        type: 'LOAN_REJECTED',
        link: `/loans`,
      });
    }

    res.json({
      success: true,
      message: 'Loan application rejected.',
      loan,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Disburse loan (Separate step from approval! Decreases Bank/Cash, increases member outstanding)
// @route   POST /api/groups/:groupId/loans/:loanId/disburse
const disburseLoanAction = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { disbursementMethod = 'BANK_TRANSFER', reference = '' } = req.body;

    const loan = await disburseLoan({
      loanId,
      disbursedByUser: req.user,
      disbursementMethod,
      reference,
    });

    res.json({
      success: true,
      message: `Loan ${loan.loanId} of ₹${loan.principal} disbursed successfully via ${disbursementMethod}.`,
      loan,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record loan repayment installment (HEAD or Member payment)
// @route   POST /api/groups/:groupId/loans/:loanId/repay
const recordLoanRepaymentAction = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { amount, paymentMethod = 'CASH', reference = '' } = req.body;

    const result = await recordRepayment({
      loanId,
      amount: Number(amount),
      paymentMethod,
      reference,
      recordedByUser: req.user,
    });

    res.json({
      success: true,
      message: `Repayment of ₹${amount} recorded successfully.`,
      receiptNumber: result.receiptNumber,
      transactionId: result.transactionId,
      loan: result.loan,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLoanRequest,
  listLoans,
  getLoanDetails,
  approveLoanRequest,
  rejectLoanRequest,
  disburseLoanAction,
  recordLoanRepaymentAction,
};
