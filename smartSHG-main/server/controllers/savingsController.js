const Savings = require('../models/Savings');
const Member = require('../models/Member');
const Group = require('../models/Group');
const { recordTransaction } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { formatReceipt } = require('../utils/receiptGenerator');

// @desc    Record savings collection from a member
// @route   POST /api/groups/:groupId/savings
const recordSavings = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { memberId, amount, period, paymentMethod = 'CASH', notes = '', date } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be strictly greater than zero.' });
    }

    const member = await Member.findById(memberId).populate('userId', 'name email phone');
    if (!member || member.groupId.toString() !== groupId) {
      return res.status(404).json({ success: false, message: 'Member not found in this SHG group.' });
    }

    if (member.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Cannot record savings for an inactive member.' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Prevent accidental duplicate submission within 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const potentialDuplicate = await Savings.findOne({
      groupId,
      memberId,
      amount: numAmount,
      period,
      createdAt: { $gte: thirtySecondsAgo },
    });

    if (potentialDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'A matching savings transaction was recorded just a few moments ago. Prevented accidental duplicate.',
      });
    }

    const receiptNumber = `RCP-SAV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const txId = `TXN-SAV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Ledger Movement:
    // Cash collection increases Cash on Hand.
    // Bank Transfer / UPI / Online collection increases Bank Balance.
    const destinationAccount = paymentMethod === 'CASH' ? 'CASH' : 'BANK';

    const finTx = await recordTransaction({
      groupId,
      transactionType: 'SAVINGS_COLLECTION',
      category: 'Member Monthly Savings',
      description: `Monthly savings for period ${period} from ${member.userId.name}`,
      amount: numAmount,
      paymentMethod,
      sourceAccount: 'EXTERNAL',
      destinationAccount,
      memberId: member._id,
      reference: receiptNumber,
      createdBy: req.user._id,
      date: date || new Date(),
    });

    // Create Savings record
    const savings = await Savings.create({
      transactionId: txId,
      receiptNumber,
      groupId,
      memberId: member._id,
      userId: member.userId._id,
      period,
      amount: numAmount,
      paymentMethod,
      status: 'COMPLETED',
      date: date || new Date(),
      recordedBy: req.user._id,
      notes,
      financialTransactionId: finTx._id,
    });

    // Increment member total savings
    await Member.findByIdAndUpdate(member._id, {
      $inc: { totalSavings: numAmount },
    });

    // Audit log
    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SAVINGS_RECORDED',
      targetModel: 'Savings',
      targetId: savings._id,
      amount: numAmount,
      description: `Recorded savings of ₹${numAmount} for ${member.userId.name} (${period}) via ${paymentMethod}`,
      reference: receiptNumber,
      req,
    });

    // Send in-app notification to member
    await createNotification({
      userId: member.userId._id,
      groupId,
      title: { en: 'Savings Recorded', te: 'పొదుపు నమోదు చేయబడింది' },
      message: {
        en: `Your monthly savings of ₹${numAmount} for ${period} has been recorded. Receipt: ${receiptNumber}`,
        te: `${period} కాలానికి మీ ₹${numAmount} పొదుపు నమోదు చేయబడింది. రసీదు సంఖ్య: ${receiptNumber}`,
      },
      type: 'SAVINGS_RECORDED',
      link: `/savings`,
    });

    // Generate formatted digital receipt
    const receiptData = formatReceipt({
      receiptNumber,
      transactionId: txId,
      groupName: group.name,
      groupCode: group.code,
      villageTown: group.villageTown,
      district: group.district,
      memberName: member.userId.name,
      memberNumber: member.memberNumber,
      amount: numAmount,
      purpose: `Monthly Savings (${period})`,
      paymentMethod,
      date: savings.date,
      recordedByName: req.user.name,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Savings recorded successfully.',
      savings,
      receipt: receiptData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List savings records for a group with filters & pagination
// @route   GET /api/groups/:groupId/savings
const listSavings = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { period, memberId, paymentMethod, page = 1, limit = 20 } = req.query;

    const filter = { groupId };
    if (period) filter.period = period;
    if (memberId) filter.memberId = memberId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const total = await Savings.countDocuments(filter);
    const savings = await Savings.find(filter)
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name phone email' },
      })
      .populate('recordedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      savings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get savings history and monthly status for current member
// @route   GET /api/groups/:groupId/savings/my-savings
const getMemberSavings = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const member = await Member.findOne({ groupId, userId: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member profile not found for this group.' });
    }

    const group = await Group.findById(groupId);
    const monthlyExpected = group?.monthlySavingsAmount || 500;

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all completed savings for this member
    const allSavings = await Savings.find({ memberId: member._id, status: 'COMPLETED' }).sort({ date: -1 });

    const totalSavings = allSavings.reduce((acc, curr) => acc + curr.amount, 0);

    // Savings in current period
    const currentMonthPaid = allSavings
      .filter((s) => s.period === currentPeriod)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const currentMonthPending = Math.max(0, monthlyExpected - currentMonthPaid);

    res.json({
      success: true,
      summary: {
        monthlyExpected,
        currentMonthPaid,
        currentMonthPending,
        totalSavings,
        currentPeriod,
      },
      history: allSavings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get group monthly savings summary matrix for Head
// @route   GET /api/groups/:groupId/savings/summary
const getSavingsSummary = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { period } = req.query;

    const targetPeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const group = await Group.findById(groupId);
    const expectedPerMember = group?.monthlySavingsAmount || 500;

    const activeMembers = await Member.find({ groupId, status: 'ACTIVE' }).populate('userId', 'name phone');

    // Aggregate savings in target period
    const periodSavings = await Savings.aggregate([
      { $match: { groupId: group._id, period: targetPeriod, status: 'COMPLETED' } },
      { $group: { _id: '$memberId', totalPaid: { $sum: '$amount' }, txCount: { $sum: 1 } } },
    ]);

    const paidMap = new Map();
    for (const item of periodSavings) {
      paidMap.set(item._id.toString(), { totalPaid: item.totalPaid, txCount: item.txCount });
    }

    let groupCollected = 0;
    const memberStatuses = activeMembers.map((m) => {
      const paidData = paidMap.get(m._id.toString()) || { totalPaid: 0, txCount: 0 };
      const paid = paidData.totalPaid;
      const pending = Math.max(0, expectedPerMember - paid);
      groupCollected += paid;

      return {
        memberId: m._id,
        name: m.userId?.name,
        phone: m.userId?.phone,
        memberNumber: m.memberNumber,
        expected: expectedPerMember,
        paid,
        pending,
        status: paid >= expectedPerMember ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
        txCount: paidData.txCount,
      };
    });

    const groupExpected = activeMembers.length * expectedPerMember;
    const groupPending = Math.max(0, groupExpected - groupCollected);

    res.json({
      success: true,
      period: targetPeriod,
      summary: {
        expectedPerMember,
        groupExpected,
        groupCollected,
        groupPending,
        totalActiveMembers: activeMembers.length,
        fullyPaidCount: memberStatuses.filter((m) => m.status === 'PAID').length,
        partialCount: memberStatuses.filter((m) => m.status === 'PARTIAL').length,
        pendingCount: memberStatuses.filter((m) => m.status === 'PENDING').length,
      },
      members: memberStatuses,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordSavings,
  listSavings,
  getMemberSavings,
  getSavingsSummary,
};
