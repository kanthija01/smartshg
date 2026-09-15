const Member = require('../models/Member');
const User = require('../models/User');
const Group = require('../models/Group');
const Savings = require('../models/Savings');
const Loan = require('../models/Loan');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    List members of a group with search, filter, pagination
// @route   GET /api/groups/:groupId/members
const listMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status, search, page = 1, limit = 50 } = req.query;

    const query = { groupId };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const members = await Member.find(query)
      .populate('userId', 'name email phone preferredLanguage isActive')
      .sort({ createdAt: -1 });

    // Client-side/in-memory filtering for populated search term
    let filtered = members;
    if (search) {
      const s = search.toLowerCase();
      filtered = members.filter(
        (m) =>
          m.userId?.name?.toLowerCase().includes(s) ||
          m.userId?.phone?.includes(s) ||
          m.memberNumber?.toLowerCase().includes(s)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      count: filtered.length,
      page: Number(page),
      totalPages: Math.ceil(filtered.length / limit) || 1,
      members: paginated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get member details & financial profile
// @route   GET /api/groups/:groupId/members/:memberId
const getMemberDetails = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId)
      .populate('userId', 'name email phone preferredLanguage createdAt')
      .populate('groupId', 'name code villageTown district monthlySavingsAmount');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    // Savings summary for member
    const recentSavings = await Savings.find({ memberId: member._id, status: 'COMPLETED' })
      .sort({ date: -1 })
      .limit(10);

    const totalSavingsSum = await Savings.aggregate([
      { $match: { memberId: member._id, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const computedTotalSavings = totalSavingsSum.length > 0 ? totalSavingsSum[0].total : 0;

    // Active loan for member
    const activeLoan = await Loan.findOne({
      memberId: member._id,
      status: { $in: ['REQUESTED', 'APPROVED', 'DISBURSED'] },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      member,
      financialSummary: {
        totalSavings: computedTotalSavings,
        outstandingLoan: member.outstandingLoan || 0,
        recentSavings,
        activeLoan,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add member directly by Head
// @route   POST /api/groups/:groupId/members
const addMemberByHead = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, phone, email, designation = 'MEMBER', notes, emergencyContact } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and 10-digit phone number are required.' });
    }

    // Check if user exists or create new user account for member
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        name,
        phone,
        email: email ? email.toLowerCase() : undefined,
        password: 'password123', // Default temporary password
        role: 'MEMBER',
      });
    }

    // Check if already in this group
    const existingMember = await Member.findOne({ groupId, userId: user._id });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'This user is already a member of this SHG.' });
    }

    const memberCount = await Member.countDocuments({ groupId });
    const memberNumber = `M-${String(memberCount + 1).padStart(2, '0')}`;

    const member = await Member.create({
      groupId,
      userId: user._id,
      memberNumber,
      designation,
      status: 'ACTIVE',
      notes,
      emergencyContact,
    });

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEMBER_ADDED',
      targetModel: 'Member',
      targetId: member._id,
      description: `Added new member ${name} (${memberNumber}) to group`,
      reference: memberNumber,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      member,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request to join group by member using code
// @route   POST /api/members/join
const joinGroupRequest = async (req, res, next) => {
  try {
    const { groupCode } = req.body;

    if (!groupCode) {
      return res.status(400).json({ success: false, message: 'Group code is required.' });
    }

    const group = await Group.findOne({ code: groupCode.trim().toUpperCase() });
    if (!group) {
      return res.status(404).json({ success: false, message: 'No SHG found with this code.' });
    }

    const existing = await Member.findOne({ groupId: group._id, userId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: `You already have a ${existing.status} membership with this group.` });
    }

    const member = await Member.create({
      groupId: group._id,
      userId: req.user._id,
      status: 'PENDING',
    });

    // Notify Head
    await createNotification({
      userId: group.headId,
      groupId: group._id,
      title: { en: 'New Member Join Request', te: 'కొత్త సభ్యురాలి చేరిక అభ్యర్థన' },
      message: {
        en: `${req.user.name} has requested to join your SHG (${group.name}).`,
        te: `${req.user.name} మీ స్వయం సహాయక సంఘంలో చేరడానికి అభ్యర్థించారు.`,
      },
      type: 'GENERAL',
      link: `/members`,
    });

    res.status(201).json({
      success: true,
      message: 'Join request submitted. Awaiting Group Head approval.',
      member,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve pending member (HEAD only)
// @route   PUT /api/groups/:groupId/members/:memberId/approve
const approveMember = async (req, res, next) => {
  try {
    const { memberId, groupId } = req.params;

    const member = await Member.findById(memberId).populate('userId', 'name');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (member.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Member is already active.' });
    }

    const activeCount = await Member.countDocuments({ groupId, status: 'ACTIVE' });
    if (!member.memberNumber) {
      member.memberNumber = `M-${String(activeCount + 1).padStart(2, '0')}`;
    }

    member.status = 'ACTIVE';
    member.joinDate = new Date();
    await member.save();

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEMBER_APPROVED',
      targetModel: 'Member',
      targetId: member._id,
      description: `Approved membership for ${member.userId?.name} (${member.memberNumber})`,
      reference: member.memberNumber,
      req,
    });

    // Notify member
    await createNotification({
      userId: member.userId._id,
      groupId,
      title: { en: 'Membership Approved', te: 'సభ్యత్వం ఆమోదించబడింది' },
      message: {
        en: 'Congratulations! Your SHG membership has been approved.',
        te: 'అభినందనలు! మీ స్వయం సహాయక సంఘం సభ్యత్వం ఆమోదించబడింది.',
      },
      type: 'GENERAL',
      link: `/dashboard`,
    });

    res.json({
      success: true,
      message: 'Member approved successfully.',
      member,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reject pending member request (HEAD only)
// @route   PUT /api/groups/:groupId/members/:memberId/reject
const rejectMember = async (req, res, next) => {
  try {
    const { memberId, groupId } = req.params;

    const member = await Member.findById(memberId).populate('userId', 'name');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.status = 'INACTIVE';
    await member.save();

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEMBER_REJECTED',
      targetModel: 'Member',
      targetId: member._id,
      description: `Rejected membership request for ${member.userId?.name}`,
      req,
    });

    res.json({
      success: true,
      message: 'Member request rejected.',
      member,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update member status or details
// @route   PUT /api/groups/:groupId/members/:memberId
const updateMemberProfile = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { designation, notes, emergencyContact, status } = req.body;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (designation) member.designation = designation;
    if (notes !== undefined) member.notes = notes;
    if (emergencyContact) member.emergencyContact = emergencyContact;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) member.status = status;

    await member.save();

    res.json({
      success: true,
      message: 'Member profile updated successfully.',
      member,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMembers,
  getMemberDetails,
  addMemberByHead,
  joinGroupRequest,
  approveMember,
  rejectMember,
  updateMemberProfile,
};
