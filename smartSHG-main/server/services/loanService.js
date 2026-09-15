const Loan = require('../models/Loan');
const LoanInstallment = require('../models/LoanInstallment');
const Member = require('../models/Member');
const { calculateReducingBalanceEMI, calculateSimpleInterestSchedule } = require('../utils/emiCalculator');
const { recordTransaction } = require('./ledgerService');
const { logAudit } = require('./auditService');
const { createNotification } = require('./notificationService');

/**
 * Request a new loan
 */
async function requestLoan({ memberId, groupId, principal, purpose, tenureMonths, interestRate = 12, interestMethod = 'REDUCING_BALANCE', user }) {
  if (principal <= 0) throw new Error('Principal must be greater than zero');
  if (tenureMonths <= 0) throw new Error('Tenure must be at least 1 month');

  // Calculate projected EMI
  const calc = interestMethod === 'REDUCING_BALANCE'
    ? calculateReducingBalanceEMI(principal, interestRate, tenureMonths)
    : calculateSimpleInterestSchedule(principal, interestRate, tenureMonths);

  const loanCount = await Loan.countDocuments({ groupId });
  const loanId = `LN-${new Date().getFullYear()}-${String(loanCount + 1).padStart(3, '0')}`;

  const loan = new Loan({
    loanId,
    groupId,
    memberId,
    principal,
    purpose,
    interestRate,
    interestMethod,
    tenureMonths,
    status: 'REQUESTED',
    totalInterest: calc.totalInterest,
    totalPayable: calc.totalPayable,
    emiAmount: calc.emi,
    outstandingPrincipal: principal,
    outstandingInterest: calc.totalInterest,
  });

  await loan.save();

  await logAudit({
    groupId,
    userId: user._id,
    userName: user.name,
    userRole: user.role,
    action: 'LOAN_REQUESTED',
    targetModel: 'Loan',
    targetId: loan._id,
    amount: principal,
    description: `Loan of ₹${principal} requested by member for: ${purpose}`,
    reference: loanId,
  });

  return loan;
}

/**
 * Approve a loan
 */
async function approveLoan(loanId, approvedByUser) {
  const loan = await Loan.findById(loanId).populate('memberId');
  if (!loan) throw new Error('Loan not found');
  if (loan.status !== 'REQUESTED') {
    throw new Error(`Cannot approve loan in '${loan.status}' status`);
  }

  loan.status = 'APPROVED';
  loan.approvedBy = approvedByUser._id;
  loan.approvedAt = new Date();
  await loan.save();

  // Create projected amortization schedule
  const calc = loan.interestMethod === 'REDUCING_BALANCE'
    ? calculateReducingBalanceEMI(loan.principal, loan.interestRate, loan.tenureMonths)
    : calculateSimpleInterestSchedule(loan.principal, loan.interestRate, loan.tenureMonths);

  await LoanInstallment.deleteMany({ loanId: loan._id });

  const installmentDocs = calc.schedule.map((item) => ({
    loanId: loan._id,
    groupId: loan.groupId,
    memberId: loan.memberId._id,
    installmentNumber: item.installmentNumber,
    dueDate: item.dueDate,
    principalAmount: item.principalAmount,
    interestAmount: item.interestAmount,
    emiAmount: item.emiAmount,
    paidAmount: 0,
    remainingAmount: item.emiAmount,
    status: 'PENDING',
  }));

  await LoanInstallment.insertMany(installmentDocs);

  await logAudit({
    groupId: loan.groupId,
    userId: approvedByUser._id,
    userName: approvedByUser.name,
    userRole: approvedByUser.role,
    action: 'LOAN_APPROVED',
    targetModel: 'Loan',
    targetId: loan._id,
    amount: loan.principal,
    description: `Loan ${loan.loanId} of ₹${loan.principal} approved`,
    reference: loan.loanId,
  });

  // Notify member
  if (loan.memberId && loan.memberId.userId) {
    await createNotification({
      userId: loan.memberId.userId,
      groupId: loan.groupId,
      title: { en: 'Loan Approved', te: 'రుణం ఆమోదించబడింది' },
      message: {
        en: `Your loan request for ₹${loan.principal} has been approved by the Group Head.`,
        te: `మీ ₹${loan.principal} రుణ దరఖాస్తు గ్రూప్ లీడర్ ద్వారా ఆమోదించబడింది.`,
      },
      type: 'LOAN_APPROVED',
      link: `/loans`,
    });
  }

  return loan;
}

/**
 * Disburse a loan (Separate from approval! Affects ledger and balances)
 */
async function disburseLoan({ loanId, disbursedByUser, disbursementMethod = 'BANK_TRANSFER', reference = '' }) {
  const loan = await Loan.findById(loanId).populate('memberId');
  if (!loan) throw new Error('Loan not found');
  if (loan.status !== 'APPROVED') {
    throw new Error(`Cannot disburse loan in '${loan.status}' status. Loan must be APPROVED first.`);
  }

  const now = new Date();
  loan.status = 'DISBURSED';
  loan.startDate = now;
  loan.disbursedBy = disbursedByUser._id;
  loan.disbursedAt = now;
  loan.disbursementMethod = disbursementMethod;

  // Record financial transaction (Ledger movement: Cash or Bank -> Loan Account)
  const sourceAccount = disbursementMethod === 'CASH' ? 'CASH' : 'BANK';
  const finTx = await recordTransaction({
    groupId: loan.groupId,
    transactionType: 'LOAN_DISBURSEMENT',
    category: 'Loan Disbursement',
    description: `Loan disbursement to member for ${loan.loanId}`,
    amount: loan.principal,
    paymentMethod: disbursementMethod,
    sourceAccount,
    destinationAccount: 'LOAN_ACCOUNT',
    memberId: loan.memberId._id,
    reference: reference || `DISB-${loan.loanId}`,
    createdBy: disbursedByUser._id,
  });

  loan.disbursementTxId = finTx._id;
  await loan.save();

  // Update member's outstanding loan
  await Member.findByIdAndUpdate(loan.memberId._id, {
    $inc: { outstandingLoan: loan.principal },
  });

  // Re-align installment due dates starting from today
  const installments = await LoanInstallment.find({ loanId: loan._id }).sort({ installmentNumber: 1 });
  for (let i = 0; i < installments.length; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + (i + 1));
    installments[i].dueDate = d;
    await installments[i].save();
  }

  await logAudit({
    groupId: loan.groupId,
    userId: disbursedByUser._id,
    userName: disbursedByUser.name,
    userRole: disbursedByUser.role,
    action: 'LOAN_DISBURSED',
    targetModel: 'Loan',
    targetId: loan._id,
    amount: loan.principal,
    description: `Loan ${loan.loanId} of ₹${loan.principal} disbursed via ${disbursementMethod}`,
    reference: reference || finTx.transactionId,
  });

  // Notify member
  if (loan.memberId && loan.memberId.userId) {
    await createNotification({
      userId: loan.memberId.userId,
      groupId: loan.groupId,
      title: { en: 'Loan Disbursed', te: 'రుణం పంపిణీ చేయబడింది' },
      message: {
        en: `₹${loan.principal} has been disbursed for loan ${loan.loanId} via ${disbursementMethod}.`,
        te: `రుణం ${loan.loanId} కోసం ₹${loan.principal} ${disbursementMethod} ద్వారా పంపిణీ చేయబడింది.`,
      },
      type: 'LOAN_DISBURSED',
      link: `/loans`,
    });
  }

  return loan;
}

/**
 * Record loan repayment (Supports partial repayments, installment allocation, ledger update)
 */
async function recordRepayment({ loanId, amount, paymentMethod = 'CASH', reference = '', recordedByUser }) {
  if (amount <= 0) throw new Error('Repayment amount must be greater than zero');

  const loan = await Loan.findById(loanId).populate('memberId');
  if (!loan) throw new Error('Loan not found');
  if (loan.status !== 'DISBURSED') {
    throw new Error(`Cannot repay loan in '${loan.status}' status. Loan must be DISBURSED.`);
  }

  const receiptNumber = `RCP-LN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  // Record financial transaction (Ledger movement: Cash/Bank received from member into Bank/Cash)
  const destinationAccount = paymentMethod === 'CASH' ? 'CASH' : 'BANK';
  const finTx = await recordTransaction({
    groupId: loan.groupId,
    transactionType: 'LOAN_REPAYMENT',
    category: 'Loan Repayment',
    description: `Loan repayment of ₹${amount} for ${loan.loanId}`,
    amount,
    paymentMethod,
    sourceAccount: 'EXTERNAL',
    destinationAccount,
    memberId: loan.memberId._id,
    reference: reference || receiptNumber,
    createdBy: recordedByUser._id,
  });

  let remainingUnallocated = amount;

  // Allocate across pending/partially paid installments
  const installments = await LoanInstallment.find({
    loanId: loan._id,
    status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
  }).sort({ installmentNumber: 1 });

  for (const inst of installments) {
    if (remainingUnallocated <= 0) break;

    const neededForInst = inst.remainingAmount;
    const paymentToThisInst = Math.min(remainingUnallocated, neededForInst);

    // Approximate principal vs interest split
    const interestRatio = inst.interestAmount / inst.emiAmount;
    const interestPaidPortion = Math.round(paymentToThisInst * interestRatio * 100) / 100;
    const principalPaidPortion = Math.round((paymentToThisInst - interestPaidPortion) * 100) / 100;

    inst.paidAmount = Math.round((inst.paidAmount + paymentToThisInst) * 100) / 100;
    inst.remainingAmount = Math.max(0, Math.round((inst.remainingAmount - paymentToThisInst) * 100) / 100);

    if (inst.remainingAmount === 0) {
      inst.status = 'PAID';
      inst.paidDate = new Date();
    } else {
      inst.status = 'PARTIALLY_PAID';
    }

    inst.repaymentHistory.push({
      amount: paymentToThisInst,
      principalPaid: principalPaidPortion,
      interestPaid: interestPaidPortion,
      paymentMethod,
      transactionId: finTx._id,
      receiptNumber,
      date: new Date(),
      recordedBy: recordedByUser._id,
    });

    await inst.save();
    remainingUnallocated = Math.max(0, Math.round((remainingUnallocated - paymentToThisInst) * 100) / 100);
  }

  // Update loan record
  loan.totalRepaid = Math.round((loan.totalRepaid + amount) * 100) / 100;
  loan.outstandingPrincipal = Math.max(0, Math.round((loan.outstandingPrincipal - amount) * 100) / 100);

  // Check if loan is fully paid
  const pendingCount = await LoanInstallment.countDocuments({
    loanId: loan._id,
    status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
  });

  if (pendingCount === 0 || loan.totalRepaid >= loan.totalPayable) {
    loan.status = 'CLOSED';
    loan.outstandingPrincipal = 0;
    loan.outstandingInterest = 0;
  }

  await loan.save();

  // Update member outstanding loan
  await Member.findByIdAndUpdate(loan.memberId._id, {
    $inc: { outstandingLoan: -amount },
  });

  await logAudit({
    groupId: loan.groupId,
    userId: recordedByUser._id,
    userName: recordedByUser.name,
    userRole: recordedByUser.role,
    action: 'LOAN_REPAYMENT',
    targetModel: 'Loan',
    targetId: loan._id,
    amount,
    description: `Loan repayment of ₹${amount} recorded for ${loan.loanId}`,
    reference: receiptNumber,
  });

  // Notify member
  if (loan.memberId && loan.memberId.userId) {
    await createNotification({
      userId: loan.memberId.userId,
      groupId: loan.groupId,
      title: { en: 'Loan Payment Recorded', te: 'రుణ చెల్లింపు నమోదు చేయబడింది' },
      message: {
        en: `Repayment of ₹${amount} recorded for loan ${loan.loanId}. Receipt: ${receiptNumber}`,
        te: `రుణం ${loan.loanId} కోసం ₹${amount} చెల్లింపు నమోదు చేయబడింది. రసీదు: ${receiptNumber}`,
      },
      type: 'PAYMENT_SUCCESS',
      link: `/loans`,
    });
  }

  return {
    loan,
    receiptNumber,
    transactionId: finTx.transactionId,
  };
}

module.exports = {
  requestLoan,
  approveLoan,
  disburseLoan,
  recordRepayment,
};
