const validateSavingsRecord = (req, res, next) => {
  const { memberId, amount, period, paymentMethod } = req.body;

  if (!memberId) {
    return res.status(400).json({ success: false, message: 'Member ID is required.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be a positive number greater than 0.' });
  }

  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return res.status(400).json({ success: false, message: 'Savings period must be in YYYY-MM format (e.g. 2026-09).' });
  }

  const allowedMethods = ['CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'OTHER'];
  if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: `Payment method must be one of: ${allowedMethods.join(', ')}` });
  }

  next();
};

module.exports = { validateSavingsRecord };
