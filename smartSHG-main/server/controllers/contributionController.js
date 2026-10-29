const MonthlyContribution = require("../models/MonthlyContribution");
const Member = require("../models/Member");
const Group = require("../models/Group");
const Savings = require("../models/Savings");
const { logAudit } = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const { recordTransaction } = require("../services/ledgerService");

/**
 * Get or create a MonthlyContribution record for a member for the current period.
 * Carries forward unpaid balance from the previous month if any.
 */
async function getOrCreateContribution(groupId, memberId, userId, period) {
  const existing = await MonthlyContribution.findOne({ memberId, period });
  if (existing) return existing;

  const group = await Group.findById(groupId);
  const expectedAmount = group?.monthlySavingsAmount || 500;
  const dueDayOfMonth = group?.dueDayOfMonth || 10;

  const [year, month] = period.split("-").map(Number);
  const dueDate = new Date(year, month - 1, dueDayOfMonth);

  // Calculate carry-forward from previous month
  let carriedForwardAmount = 0;
  const prevDate = new Date(year, month - 2, 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const prevContrib = await MonthlyContribution.findOne({ memberId, period: prevPeriod });
  if (prevContrib && prevContrib.pendingBalance > 0) {
    carriedForwardAmount = prevContrib.pendingBalance;
    // Mark previous as OVERDUE if not already
    if (prevContrib.status !== "PAID" && prevContrib.status !== "OVERDUE") {
      prevContrib.status = "OVERDUE";
      await prevContrib.save();
    }
  }

  const totalPayable = expectedAmount + carriedForwardAmount;

  const contribution = await MonthlyContribution.create({
    groupId,
    memberId,
    userId,
    period,
    expectedAmount,
    carriedForwardAmount,
    totalPayable,
    amountPaid: 0,
    pendingBalance: totalPayable,
    status: "PENDING",
    dueDate,
  });

  return contribution;
}

/**
 * @desc  Get current month contribution status for logged-in member
 * @route GET /api/groups/:groupId/contributions/my-contribution
 */
const getMyContribution = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { period } = req.query;

    const member = await Member.findOne({ groupId, userId: req.user._id, status: "ACTIVE" });
    if (!member) {
      return res.status(404).json({ success: false, message: "Active member profile not found." });
    }

    const now = new Date();
    const currentPeriod =
      period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const contribution = await getOrCreateContribution(
      groupId,
      member._id,
      req.user._id,
      currentPeriod
    );

    // History: last 12 months
    const history = await MonthlyContribution.find({ memberId: member._id })
      .sort({ period: -1 })
      .limit(12)
      .populate("savingsRecords", "receiptNumber amount date paymentMethod");

    const group = await Group.findById(groupId);

    res.json({
      success: true,
      contribution,
      history,
      group: {
        monthlySavingsAmount: group?.monthlySavingsAmount || 500,
        dueDayOfMonth: group?.dueDayOfMonth || 10,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get all members' contribution status for current period (HEAD only)
 * @route GET /api/groups/:groupId/contributions/summary
 */
const getContributionSummary = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { period } = req.query;

    const now = new Date();
    const targetPeriod =
      period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const group = await Group.findById(groupId);
    const activeMembers = await Member.find({ groupId, status: "ACTIVE" }).populate(
      "userId",
      "name phone email"
    );

    // Ensure all active members have a contribution record for this period
    for (const m of activeMembers) {
      await getOrCreateContribution(groupId, m._id, m.userId._id, targetPeriod);
    }

    const contributions = await MonthlyContribution.find({
      groupId,
      period: targetPeriod,
    }).populate({
      path: "memberId",
      populate: { path: "userId", select: "name phone email" },
    });

    const totalExpected = contributions.reduce((s, c) => s + c.totalPayable, 0);
    const totalCollected = contributions.reduce((s, c) => s + c.amountPaid, 0);
    const totalPending = contributions.reduce((s, c) => s + c.pendingBalance, 0);

    res.json({
      success: true,
      period: targetPeriod,
      summary: {
        totalExpected,
        totalCollected,
        totalPending,
        paidCount: contributions.filter((c) => c.status === "PAID").length,
        partialCount: contributions.filter((c) => c.status === "PARTIAL").length,
        pendingCount: contributions.filter((c) => c.status === "PENDING").length,
        overdueCount: contributions.filter((c) => c.status === "OVERDUE").length,
        totalMembers: activeMembers.length,
      },
      contributions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  HEAD records a cash/offline payment for a member's contribution
 * @route POST /api/groups/:groupId/contributions/:contributionId/record-payment
 */
const recordOfflinePayment = async (req, res, next) => {
  try {
    const { contributionId } = req.params;
    const { amount, paymentMethod = "CASH", notes = "" } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero." });
    }

    const contribution = await MonthlyContribution.findById(contributionId).populate({
      path: "memberId",
      populate: { path: "userId", select: "name phone email" },
    });

    if (!contribution) {
      return res.status(404).json({ success: false, message: "Contribution record not found." });
    }
    if (contribution.status === "PAID") {
      return res.status(400).json({ success: false, message: "This contribution is already fully paid." });
    }

    const payableNow = Math.min(numAmount, contribution.pendingBalance);

    const receiptNumber = `RCP-SAV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const txId = `TXN-SAV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dest = paymentMethod === "CASH" ? "CASH" : "BANK";

    const finTx = await recordTransaction({
      groupId: contribution.groupId,
      transactionType: "SAVINGS_COLLECTION",
      category: "Member Monthly Savings",
      description: `Monthly savings for ${contribution.period} from ${contribution.memberId.userId.name}`,
      amount: payableNow,
      paymentMethod,
      sourceAccount: "EXTERNAL",
      destinationAccount: dest,
      memberId: contribution.memberId._id,
      reference: receiptNumber,
      createdBy: req.user._id,
    });

    const savings = await Savings.create({
      transactionId: txId,
      receiptNumber,
      groupId: contribution.groupId,
      memberId: contribution.memberId._id,
      userId: contribution.userId,
      period: contribution.period,
      amount: payableNow,
      paymentMethod,
      status: "COMPLETED",
      date: new Date(),
      recordedBy: req.user._id,
      notes,
      financialTransactionId: finTx._id,
    });

    contribution.savingsRecords.push(savings._id);
    contribution.amountPaid = Math.round((contribution.amountPaid + payableNow) * 100) / 100;
    contribution.pendingBalance = Math.max(
      0,
      Math.round((contribution.totalPayable - contribution.amountPaid) * 100) / 100
    );
    contribution.status =
      contribution.pendingBalance === 0
        ? "PAID"
        : contribution.amountPaid > 0
        ? "PARTIAL"
        : "PENDING";
    if (notes) contribution.notes = notes;
    await contribution.save();

    await Member.findByIdAndUpdate(contribution.memberId._id, {
      $inc: { totalSavings: payableNow },
    });

    await logAudit({
      groupId: contribution.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "SAVINGS_RECORDED",
      targetModel: "MonthlyContribution",
      targetId: contribution._id,
      amount: payableNow,
      description: `Cash payment Rs${payableNow} for ${contribution.period} by ${contribution.memberId.userId.name}`,
      reference: receiptNumber,
    });

    await createNotification({
      userId: contribution.userId,
      groupId: contribution.groupId,
      title: { en: "Savings Recorded", te: "పొదుపు నమోదు చేయబడింది" },
      message: {
        en: `Payment of Rs${payableNow} for ${contribution.period} recorded. Receipt: ${receiptNumber}`,
        te: `${contribution.period} కి Rs${payableNow} చెల్లింపు నమోదు అయింది. రసీదు: ${receiptNumber}`,
      },
      type: "SAVINGS_RECORDED",
      link: "/contributions",
    });

    res.json({
      success: true,
      message: "Payment recorded successfully.",
      contribution,
      receiptNumber,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  List contributions for a group (HEAD view with filters)
 * @route GET /api/groups/:groupId/contributions
 */
const listContributions = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { period, status, memberId, page = 1, limit = 30 } = req.query;

    const now = new Date();
    const targetPeriod =
      period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const filter = { groupId, period: targetPeriod };
    if (status && status !== "ALL") filter.status = status;
    if (memberId) filter.memberId = memberId;

    // Members can only see their own
    if (req.user.role === "MEMBER") {
      const m = await Member.findOne({ groupId, userId: req.user._id });
      if (!m) return res.status(403).json({ success: false, message: "Member profile not found." });
      filter.memberId = m._id;
    }

    const total = await MonthlyContribution.countDocuments(filter);
    const contributions = await MonthlyContribution.find(filter)
      .populate({ path: "memberId", populate: { path: "userId", select: "name phone email" } })
      .sort({ period: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: total, contributions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyContribution,
  getContributionSummary,
  recordOfflinePayment,
  listContributions,
};
