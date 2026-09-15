const validateLoanRequest = (req, res, next) => {
  const { principal, purpose, tenureMonths, interestRate } = req.body;

  const numPrincipal = Number(principal);
  if (isNaN(numPrincipal) || numPrincipal < 100) {
    return res.status(400).json({ success: false, message: 'Principal must be at least ₹100.' });
  }

  if (!purpose || purpose.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Please provide a descriptive loan purpose.' });
  }

  const numTenure = Number(tenureMonths);
  if (isNaN(numTenure) || numTenure < 1 || numTenure > 60) {
    return res.status(400).json({ success: false, message: 'Tenure must be between 1 and 60 months.' });
  }

  if (interestRate !== undefined) {
    const numRate = Number(interestRate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      return res.status(400).json({ success: false, message: 'Interest rate must be between 0% and 100%.' });
    }
  }

  next();
};

const validateLoanRepayment = (req, res, next) => {
  const { amount, paymentMethod } = req.body;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Repayment amount must be strictly greater than zero.' });
  }

  const allowedMethods = ['CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];
  if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: `Payment method must be one of: ${allowedMethods.join(', ')}` });
  }

  next();
};

module.exports = { validateLoanRequest, validateLoanRepayment };
