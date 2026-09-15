const validateRegistration = (req, res, next) => {
  const { name, password, email, phone, role, groupCode, groupName, villageTown, district } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  if (!email && !phone) {
    return res.status(400).json({ success: false, message: 'Either email or a 10-digit phone number is required.' });
  }

  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian phone number.' });
  }

  // Prevent arbitrary users from registering as HEAD for existing groups without group creation flow
  if (role && !['HEAD', 'MEMBER'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be either HEAD or MEMBER.' });
  }

  if (role === 'MEMBER' && (!groupCode || !groupCode.trim())) {
    return res.status(400).json({ success: false, message: 'Group code is required for member registration.' });
  }

  if (role === 'HEAD' && (!groupName || !groupName.trim() || !villageTown || !villageTown.trim() || !district || !district.trim())) {
    return res.status(400).json({ success: false, message: 'Group name, village or town, and district are required for leader registration.' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { identifier, email, phone, password } = req.body;
  const userIdentifier = identifier || email || phone;

  if (!userIdentifier) {
    return res.status(400).json({ success: false, message: 'Email or phone number is required.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  next();
};

module.exports = { validateRegistration, validateLogin };
