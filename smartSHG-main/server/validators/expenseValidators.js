const validateExpense = (req, res, next) => {
  const { amount, category, description, paymentSource } = req.body;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero.' });
  }

  if (!description || description.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Expense description is required.' });
  }

  const allowedCategories = [
    'STATIONARY',
    'REFRESHMENTS',
    'TRAVEL',
    'BOOKKEEPING',
    'BANK_CHARGES',
    'COMMUNITY_EVENT',
    'TRAINING',
    'OTHER',
  ];
  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({ success: false, message: `Category must be one of: ${allowedCategories.join(', ')}` });
  }

  const allowedSources = ['CASH', 'BANK', 'OTHER'];
  if (paymentSource && !allowedSources.includes(paymentSource)) {
    return res.status(400).json({ success: false, message: `Payment source must be one of: ${allowedSources.join(', ')}` });
  }

  next();
};

module.exports = { validateExpense };
