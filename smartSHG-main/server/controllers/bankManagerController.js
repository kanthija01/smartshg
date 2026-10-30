const Loan = require("../models/Loan");
const Member = require("../models/Member");
const Group = require("../models/Group");
const { logAudit } = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const MonthlyContribution = require("../models/MonthlyContribution");
const LoanInstallment = require("../models/LoanInstallment");

/**
 * @desc  Get all groups with financial info (Bank Manager only)
 * @route GET /api/bank-manager/groups
 */
const listGroupsForReview = async (req, res, next) => {
  try {
    const groups = await Group.find({ status: "ACTIVE" }).populate("headId", "name email phone").lean();

    const results = [];
    for (const g of groups) {
      const activeMembers = await Member.countDocuments({ groupId: g._id, status: "ACTIVE" });
      const pendingLoans = await Loan.countDocuments({ groupId: g._id, status: { $in: ["REQUESTED", "UNDER_REVIEW"] } });
      const activeLoans = await Loan.countDocuments({ groupId: g._id, status: "ACTIVE" });
      results.push({ ...g, activeMembers, pendingLoans, activeLoans });
    }

    res.json({ success: true, groups: results });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get loan applications for review by bank manager
 * @route GET /api/bank-manager/loans
 */
const listLoansForReview = async (req, res, next) => {
  try {
    const { status = "REQUESTED", groupId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status !== "ALL") {
      filter.status = { $in: status.split(",") };
    }
    if (groupId) filter.groupId = groupId;

    const total = await Loan.countDocuments(filter);
    const loans = await Loan.find(filter)
      .populate({ path: "memberId", populate: { path: "userId", select: "name phone email" } })
      .populate("groupId", "name code villageTown district")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: total, loans });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get detailed loan info for bank review
 * @route GET /api/bank-manager/loans/:loanId
 */
const getLoanForReview = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId)
      .populate({ path: "memberId", populate: { path: "userId", select: "name phone email" } })
      .populate("groupId", "name code villageTown district bankDetails monthlySavingsAmount")
      .populate("approvedBy", "name")
      .populate("bankManagerId", "name email");

    if (!loan) return res.status(404).json({ success: false, message: "Loan not found." });

    const installments = await LoanInstallment.find({ loanId: loan._id }).sort({ installmentNumber: 1 });

    // Savings history for the member
    const member = loan.memberId;
    const savingsHistory = await MonthlyContribution.find({ memberId: member._id })
      .sort({ period: -1 })
      .limit(6);

    res.json({ success: true, loan, installments, savingsHistory });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Bank Manager submits verification (marks as UNDER_REVIEW)
 * @route PUT /api/bank-manager/loans/:loanId/review
 */
const submitBankReview = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { verificationStatus, remarks, documentsChecked = [] } = req.body;

    const loan = await Loan.findById(loanId).populate("memberId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found." });

    if (!["REQUESTED", "UNDER_REVIEW"].includes(loan.status)) {
      return res.status(400).json({ success: false, message: `Cannot review loan in '${loan.status}' status.` });
    }

    const allowedVerificationStatuses = [
      "PENDING",
      "DOCUMENTS_CHECKED",
      "VERIFIED",
      "DECLINED",
    ];
    if (!allowedVerificationStatuses.includes(verificationStatus)) {
      return res.status(400).json({ success: false, message: "Invalid verification status." });
    }

    loan.status = "UNDER_REVIEW";
    loan.bankManagerId = req.user._id;
    loan.bankReviewedAt = new Date();
    loan.bankVerificationStatus = verificationStatus;
    loan.bankVerificationRemarks = remarks || "";
    loan.bankVerifiedDocuments = documentsChecked;

    await loan.save();

    await logAudit({
      groupId: loan.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "LOAN_REVIEWED",
      targetModel: "Loan",
      targetId: loan._id,
      amount: loan.principal,
      description: `Bank Manager review: ${verificationStatus}. Remarks: ${remarks || "None"}`,
      reference: loan.loanId,
    });

    if (loan.memberId && loan.memberId.userId) {
      await createNotification({
        userId: loan.memberId.userId,
        groupId: loan.groupId,
        title: { en: "Loan Under Bank Review", te: "రుణం బ్యాంకు సమీక్షలో ఉంది" },
        message: {
          en: `Your loan ${loan.loanId} is now under bank review. Status: ${verificationStatus}`,
          te: `మీ రుణం ${loan.loanId} బ్యాంకు సమీక్షలో ఉంది. స్థితి: ${verificationStatus}`,
        },
        type: "GENERAL",
        link: "/loans",
      });
    }

    res.json({ success: true, message: "Bank review recorded.", loan });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Bank Manager approves a loan (with optional adjusted terms)
 * @route PUT /api/bank-manager/loans/:loanId/approve
 */
const bankApproveLoan = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { approvedPrincipal, approvedInterestRate, approvedTenureMonths, remarks } = req.body;

    const loan = await Loan.findById(loanId).populate("memberId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found." });

    if (!["REQUESTED", "UNDER_REVIEW"].includes(loan.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve loan in '${loan.status}' status.`,
      });
    }

    const { calculateReducingBalanceEMI, calculateSimpleInterestSchedule } = require("../utils/emiCalculator");
    const LoanInstallment = require("../models/LoanInstallment");

    // Use approved terms if provided, else original
    const finalPrincipal = approvedPrincipal ? Number(approvedPrincipal) : loan.principal;
    const finalRate = approvedInterestRate !== undefined ? Number(approvedInterestRate) : loan.interestRate;
    const finalTenure = approvedTenureMonths ? Number(approvedTenureMonths) : loan.tenureMonths;

    const calc =
      loan.interestMethod === "REDUCING_BALANCE"
        ? calculateReducingBalanceEMI(finalPrincipal, finalRate, finalTenure)
        : calculateSimpleInterestSchedule(finalPrincipal, finalRate, finalTenure);

    loan.status = "APPROVED";
    loan.bankManagerId = req.user._id;
    loan.bankReviewedAt = new Date();
    loan.bankVerificationStatus = "VERIFIED";
    loan.approvedBy = req.user._id;
    loan.approvedAt = new Date();
    loan.approvedPrincipal = finalPrincipal;
    loan.approvedInterestRate = finalRate;
    loan.approvedTenureMonths = finalTenure;
    loan.principal = finalPrincipal;
    loan.interestRate = finalRate;
    loan.tenureMonths = finalTenure;
    loan.totalInterest = calc.totalInterest;
    loan.totalPayable = calc.totalPayable;
    loan.emiAmount = calc.emi;
    loan.outstandingPrincipal = finalPrincipal;
    loan.outstandingInterest = calc.totalInterest;
    if (remarks) loan.bankVerificationRemarks = remarks;

    await loan.save();

    // Re-generate installment schedule
    await LoanInstallment.deleteMany({ loanId: loan._id });
    const installmentDocs = calc.schedule.map((item) => ({
      loanId: loan._id,
      groupId: loan.groupId,
      memberId: loan.memberId._id,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate,
      principalAmount: item.principalAmount,
      interestAmount: item.interestAmount,
      emiAmount: item.emiAmount,
      paidAmount: 0,
      remainingAmount: item.emiAmount,
      status: "PENDING",
    }));
    await LoanInstallment.insertMany(installmentDocs);

    await logAudit({
      groupId: loan.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "LOAN_APPROVED",
      targetModel: "Loan",
      targetId: loan._id,
      amount: finalPrincipal,
      description: `Bank Manager approved loan ${loan.loanId} for Rs${finalPrincipal} at ${finalRate}% for ${finalTenure} months`,
      reference: loan.loanId,
    });

    if (loan.memberId && loan.memberId.userId) {
      await createNotification({
        userId: loan.memberId.userId,
        groupId: loan.groupId,
        title: { en: "Loan Approved by Bank", te: "రుణం బ్యాంకు ఆమోదించింది" },
        message: {
          en: `Your loan ${loan.loanId} of Rs${finalPrincipal} has been approved. EMI: Rs${calc.emi}/month.`,
          te: `మీ రుణం ${loan.loanId} రూ${finalPrincipal} ఆమోదించబడింది. EMI: రూ${calc.emi}/నెల.`,
        },
        type: "LOAN_APPROVED",
        link: "/loans",
      });
    }

    res.json({ success: true, message: "Loan approved by bank manager.", loan });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Bank Manager rejects a loan
 * @route PUT /api/bank-manager/loans/:loanId/reject
 */
const bankRejectLoan = async (req, res, next) => {
  try {
    const { loanId } = req.params;
    const { reason } = req.body;

    const loan = await Loan.findById(loanId).populate("memberId");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found." });

    if (!["REQUESTED", "UNDER_REVIEW"].includes(loan.status)) {
      return res.status(400).json({ success: false, message: `Cannot reject loan in '${loan.status}' status.` });
    }

    loan.status = "REJECTED";
    loan.bankManagerId = req.user._id;
    loan.bankReviewedAt = new Date();
    loan.bankVerificationStatus = "DECLINED";
    loan.rejectionReason = reason || "Does not meet bank criteria";
    await loan.save();

    await logAudit({
      groupId: loan.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "LOAN_REJECTED",
      targetModel: "Loan",
      targetId: loan._id,
      amount: loan.principal,
      description: `Bank Manager rejected loan ${loan.loanId}. Reason: ${loan.rejectionReason}`,
      reference: loan.loanId,
    });

    if (loan.memberId && loan.memberId.userId) {
      await createNotification({
        userId: loan.memberId.userId,
        groupId: loan.groupId,
        title: { en: "Loan Rejected by Bank", te: "రుణం బ్యాంకు తిరస్కరించింది" },
        message: {
          en: `Your loan ${loan.loanId} was rejected. Reason: ${loan.rejectionReason}`,
          te: `మీ రుణం ${loan.loanId} తిరస్కరించబడింది. కారణం: ${loan.rejectionReason}`,
        },
        type: "LOAN_REJECTED",
        link: "/loans",
      });
    }

    res.json({ success: true, message: "Loan rejected.", loan });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Bank Manager dashboard metrics
 * @route GET /api/bank-manager/dashboard
 */
const getBankManagerDashboard = async (req, res, next) => {
  try {
    const [
      totalGroups,
      activeGroups,
      pendingReview,
      underReview,
      approved,
      activeLoans,
      totalDisbursed,
    ] = await Promise.all([
      Group.countDocuments({}),
      Group.countDocuments({ status: "ACTIVE" }),
      Loan.countDocuments({ status: "REQUESTED" }),
      Loan.countDocuments({ status: "UNDER_REVIEW" }),
      Loan.countDocuments({ status: "APPROVED" }),
      Loan.countDocuments({ status: "ACTIVE" }),
      Loan.aggregate([
        { $match: { status: { $in: ["ACTIVE", "CLOSED"] } } },
        { $group: { _id: null, total: { $sum: "$principal" } } },
      ]),
    ]);

    const recentApplications = await Loan.find({
      status: { $in: ["REQUESTED", "UNDER_REVIEW"] },
    })
      .populate({ path: "memberId", populate: { path: "userId", select: "name phone" } })
      .populate("groupId", "name code villageTown")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      metrics: {
        totalGroups,
        activeGroups,
        pendingReview,
        underReview,
        approved,
        activeLoans,
        totalDisbursed: totalDisbursed[0]?.total || 0,
      },
      recentApplications,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listGroupsForReview,
  listLoansForReview,
  getLoanForReview,
  submitBankReview,
  bankApproveLoan,
  bankRejectLoan,
  getBankManagerDashboard,
};
