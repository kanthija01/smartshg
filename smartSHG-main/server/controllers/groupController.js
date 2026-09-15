const Group = require('../models/Group');
const Member = require('../models/Member');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Loan = require('../models/Loan');
const FinancialTransaction = require('../models/FinancialTransaction');
const Savings = require('../models/Savings');
const { getDerivedBalances } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');

// @desc    Create a new SHG
// @route   POST /api/groups
const createGroup = async (req, res, next) => {
  try {
    const { name, villageTown, district, state, description, monthlySavingsAmount, dueDayOfMonth, bankDetails } = req.body;

    // Ensure user has HEAD role if creating a group
    if (req.user.role !== 'HEAD') {
      req.user.role = 'HEAD';
      await req.user.save();
    }

    const group = await Group.create({
      name,
      villageTown,
      district,
      state: state || 'Andhra Pradesh',
      description,
      headId: req.user._id,
      monthlySavingsAmount: monthlySavingsAmount || 500,
      dueDayOfMonth: dueDayOfMonth || 10,
      bankDetails: bankDetails || {},
    });

    await logAudit({
      groupId: group._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'GROUP_CREATED',
      targetModel: 'Group',
      targetId: group._id,
      description: `Created new Self-Help Group: ${group.name} (${group.code})`,
      reference: group.code,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Self-Help Group created successfully.',
      group,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get group details
// @route   GET /api/groups/:groupId
const getGroupDetails = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('headId', 'name email phone');
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    res.json({
      success: true,
      group,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update group profile
// @route   PUT /api/groups/:groupId
const updateGroup = async (req, res, next) => {
  try {
    const { name, villageTown, district, state, description, monthlySavingsAmount, dueDayOfMonth, bankDetails, status } = req.body;

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (name) group.name = name;
    if (villageTown) group.villageTown = villageTown;
    if (district) group.district = district;
    if (state) group.state = state;
    if (description !== undefined) group.description = description;
    if (monthlySavingsAmount) group.monthlySavingsAmount = monthlySavingsAmount;
    if (dueDayOfMonth) group.dueDayOfMonth = dueDayOfMonth;
    if (bankDetails) group.bankDetails = { ...group.bankDetails, ...bankDetails };
    if (status) group.status = status;

    await group.save();

    await logAudit({
      groupId: group._id,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'GROUP_UPDATED',
      targetModel: 'Group',
      targetId: group._id,
      description: `Updated group settings for ${group.name}`,
      req,
    });

    res.json({
      success: true,
      message: 'Group updated successfully.',
      group,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get group summary statistics and dashboard metrics
// @route   GET /api/groups/:groupId/stats
const getGroupStats = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;

    // Active & pending members
    const [totalMembers, activeMembers, pendingMembers] = await Promise.all([
      Member.countDocuments({ groupId }),
      Member.countDocuments({ groupId, status: 'ACTIVE' }),
      Member.countDocuments({ groupId, status: 'PENDING' }),
    ]);

    // Financial balances (DERIVED from ledger)
    const balances = await getDerivedBalances(groupId);

    const group = await Group.findById(groupId);
    const expectedMonthlySavings = (activeMembers || 0) * (group?.monthlySavingsAmount || 500);

    // Current month savings calculation
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthSavingsAgg = await Savings.aggregate([
      { $match: { groupId: group._id, period: currentPeriod, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const savingsThisMonth = currentMonthSavingsAgg.length > 0 ? currentMonthSavingsAgg[0].total : 0;
    const pendingMonthlySavings = Math.max(0, expectedMonthlySavings - savingsThisMonth);

    // Active & Overdue loans
    const [activeLoansCount, overdueLoansCount] = await Promise.all([
      Loan.countDocuments({ groupId, status: 'DISBURSED' }),
      Loan.countDocuments({
        groupId,
        status: 'DISBURSED',
        outstandingPrincipal: { $gt: 0 },
      }),
    ]);

    // Upcoming meeting
    const upcomingMeeting = await Meeting.findOne({
      groupId,
      meetingDate: { $gte: new Date() },
      status: 'SCHEDULED',
    }).sort({ meetingDate: 1 });

    // Recent 5 financial ledger movements
    const recentTransactions = await FinancialTransaction.find({ groupId })
      .sort({ date: -1 })
      .limit(5)
      .populate('createdBy', 'name')
      .lean();

    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        pendingMembers,
        cashOnHand: balances.cashOnHand,
        bankBalance: balances.bankBalance,
        totalSavingsCollected: balances.totalSavingsCollected,
        savingsThisMonth,
        expectedMonthlySavings,
        pendingMonthlySavings,
        totalLoansDisbursed: balances.totalLoansDisbursed,
        totalLoansRepaid: balances.totalLoansRepaid,
        outstandingLoans: balances.outstandingLoanPrincipal,
        activeLoansCount,
        overdueLoansCount,
        upcomingMeeting,
        recentTransactions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's associated groups
// @route   GET /api/groups/my-groups
const getMyGroups = async (req, res, next) => {
  try {
    if (req.user.role === 'HEAD') {
      const groups = await Group.find({ headId: req.user._id }).sort({ createdAt: -1 });
      return res.json({ success: true, groups });
    }

    const memberships = await Member.find({ userId: req.user._id }).populate('groupId');
    const groups = memberships.map((m) => m.groupId).filter(Boolean);

    res.json({ success: true, groups });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGroup,
  getGroupDetails,
  updateGroup,
  getGroupStats,
  getMyGroups,
};
