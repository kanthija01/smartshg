const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Member = require('../models/Member');
const { JWT_SECRET } = require('../config/env');

/**
 * Verify JWT Token and attach user
 */
const verifyToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

/**
 * Enforce HEAD role
 */
const requireHead = (req, res, next) => {
  if (!req.user || req.user.role !== 'HEAD') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This action requires Group HEAD authorization.',
    });
  }
  next();
};

/**
 * Verify group membership and attach group context
 */
const verifyGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId || req.query.groupId || req.headers['x-group-id'];

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required.' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'SHG group not found.' });
    }

    // Check if user is the Group Head
    if (req.user.role === 'HEAD' && group.headId.toString() === req.user._id.toString()) {
      req.group = group;
      req.isHead = true;
      return next();
    }

    // Check if user is a member of this group
    const member = await Member.findOne({
      groupId,
      userId: req.user._id,
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this SHG.',
      });
    }

    if (member.status !== 'ACTIVE' && req.method !== 'GET') {
      return res.status(403).json({
        success: false,
        message: `Your membership is currently ${member.status}. Only active members can perform this action.`,
      });
    }

    req.group = group;
    req.member = member;
    req.isHead = false;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error checking group membership.', error: err.message });
  }
};

/**
 * Strict IDOR prevention:
 * Ensures a member can NEVER access another member's resource or records.
 */
const verifyResourceOwnership = (memberIdParam = 'memberId') => {
  return async (req, res, next) => {
    try {
      // Group HEAD can access all member records within the group
      if (req.user.role === 'HEAD') {
        return next();
      }

      const requestedMemberId = req.params[memberIdParam] || req.query[memberIdParam] || req.body[memberIdParam];

      if (!req.member) {
        // Fetch current member record
        const member = await Member.findOne({ userId: req.user._id });
        if (!member) {
          return res.status(403).json({ success: false, message: 'Member profile not found.' });
        }
        req.member = member;
      }

      if (requestedMemberId && req.member._id.toString() !== requestedMemberId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Security authorization violation: You cannot access or modify another member\'s financial data.',
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Ownership check failed.', error: err.message });
    }
  };
};

module.exports = {
  verifyToken,
  requireHead,
  verifyGroupMembership,
  verifyResourceOwnership,
};
