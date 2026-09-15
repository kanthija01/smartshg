const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Member = require('../models/Member');
const Group = require('../models/Group');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'MEMBER',
      preferredLanguage = 'en',
      groupCode,
      groupName,
      villageTown,
      district,
    } = req.body;

    let registrationGroup = null;
    if (role === 'MEMBER') {
      registrationGroup = await Group.findOne({ code: groupCode.trim().toUpperCase(), status: 'ACTIVE' });
      if (!registrationGroup) {
        return res.status(404).json({ success: false, message: 'No active SHG found with that group code.' });
      }
    }

    // Check existing
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'An account with this phone number already exists.' });
      }
    }

    const user = await User.create({
      name,
      email: email ? email.toLowerCase() : undefined,
      phone,
      password,
      role,
      preferredLanguage,
    });

    if (role === 'HEAD') {
      registrationGroup = await Group.create({
        name: groupName.trim(),
        villageTown: villageTown.trim(),
        district: district.trim(),
        headId: user._id,
      });
    } else {
      const memberCount = await Member.countDocuments({ groupId: registrationGroup._id });
      await Member.create({
        groupId: registrationGroup._id,
        userId: user._id,
        memberNumber: `M-${String(memberCount + 1).padStart(2, '0')}`,
        status: 'ACTIVE',
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        defaultGroup: {
          id: registrationGroup._id,
          name: registrationGroup.name,
          code: registrationGroup.code,
          villageTown: registrationGroup.villageTown,
          district: registrationGroup.district,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = (identifier || email || phone || '').trim();

    // Support login by email or phone
    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { phone: loginId },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact group administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password.' });
    }

    const token = generateToken(user._id);

    // Fetch user's primary group membership
    let defaultGroup = null;
    let memberProfile = null;

    if (user.role === 'HEAD') {
      defaultGroup = await Group.findOne({ headId: user._id, status: 'ACTIVE' });
    } else {
      memberProfile = await Member.findOne({ userId: user._id, status: 'ACTIVE' }).populate('groupId');
      if (memberProfile && memberProfile.groupId) {
        defaultGroup = memberProfile.groupId;
      }
    }

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        defaultGroup: defaultGroup
          ? {
              id: defaultGroup._id,
              name: defaultGroup.name,
              code: defaultGroup.code,
              villageTown: defaultGroup.villageTown,
              district: defaultGroup.district,
            }
          : null,
        memberId: memberProfile ? memberProfile._id : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    let defaultGroup = null;
    let memberProfile = null;

    if (user.role === 'HEAD') {
      defaultGroup = await Group.findOne({ headId: user._id, status: 'ACTIVE' });
    } else {
      memberProfile = await Member.findOne({ userId: user._id, status: { $in: ['ACTIVE', 'PENDING'] } }).populate('groupId');
      if (memberProfile && memberProfile.groupId) {
        defaultGroup = memberProfile.groupId;
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        defaultGroup: defaultGroup
          ? {
              id: defaultGroup._id,
              name: defaultGroup.name,
              code: defaultGroup.code,
              villageTown: defaultGroup.villageTown,
              district: defaultGroup.district,
            }
          : null,
        memberProfile: memberProfile
          ? {
              id: memberProfile._id,
              status: memberProfile.status,
              designation: memberProfile.designation,
              memberNumber: memberProfile.memberNumber,
              totalSavings: memberProfile.totalSavings,
              outstandingLoan: memberProfile.outstandingLoan,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile & language preference
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, preferredLanguage } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (preferredLanguage && ['en', 'te'].includes(preferredLanguage)) {
      user.preferredLanguage = preferredLanguage;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request password reset token
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const user = await User.findOne({
      $or: [{ email: email ? email.toLowerCase() : null }, { phone: phone || null }],
    });

    if (!user) {
      // Return success even if not found to prevent user enumeration
      return res.json({
        success: true,
        message: 'If an account exists with those credentials, a reset token has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    res.json({
      success: true,
      message: 'Password reset code generated.',
      resetToken, // Provided in response for demo convenience
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Valid token and new password (min 6 chars) are required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
};
