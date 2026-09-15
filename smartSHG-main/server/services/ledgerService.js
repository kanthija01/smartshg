const FinancialTransaction = require('../models/FinancialTransaction');
const Group = require('../models/Group');

/**
 * Record a financial ledger movement
 */
async function recordTransaction(data) {
  const {
    groupId,
    transactionType,
    category,
    description,
    amount,
    paymentMethod = 'CASH',
    sourceAccount,
    destinationAccount,
    memberId = null,
    reference = '',
    createdBy,
  } = data;

  if (!amount || Number(amount) <= 0) {
    throw new Error('Transaction amount must be strictly greater than zero');
  }

  const txId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const transaction = new FinancialTransaction({
    transactionId: txId,
    groupId,
    transactionType,
    category,
    description,
    amount: Number(amount),
    paymentMethod,
    sourceAccount,
    destinationAccount,
    memberId,
    reference,
    createdBy,
    date: data.date || new Date(),
    status: 'COMPLETED',
  });

  await transaction.save();
  return transaction;
}

/**
 * Calculate derived Cash on Hand and Bank Balance for an SHG group
 * Balance is NEVER manually overwritten - it is strictly computed from ledger movements.
 */
async function getDerivedBalances(groupId) {
  const transactions = await FinancialTransaction.find({
    groupId,
    status: 'COMPLETED',
  }).lean();

  let cashOnHand = 0;
  let bankBalance = 0;
  let totalSavingsCollected = 0;
  let totalLoansDisbursed = 0;
  let totalLoansRepaid = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount);

    // Track Categories
    if (tx.transactionType === 'SAVINGS_COLLECTION') {
      totalSavingsCollected += amt;
    } else if (tx.transactionType === 'LOAN_DISBURSEMENT') {
      totalLoansDisbursed += amt;
    } else if (tx.transactionType === 'LOAN_REPAYMENT') {
      totalLoansRepaid += amt;
    } else if (tx.transactionType === 'EXPENSE') {
      totalExpenses += amt;
    }

    // Cash Ledger calculations
    if (tx.destinationAccount === 'CASH') {
      cashOnHand += amt;
    }
    if (tx.sourceAccount === 'CASH') {
      cashOnHand -= amt;
    }

    // Bank Ledger calculations
    if (tx.destinationAccount === 'BANK') {
      bankBalance += amt;
    }
    if (tx.sourceAccount === 'BANK') {
      bankBalance -= amt;
    }
  }

  cashOnHand = Math.round(cashOnHand * 100) / 100;
  bankBalance = Math.round(bankBalance * 100) / 100;
  totalSavingsCollected = Math.round(totalSavingsCollected * 100) / 100;
  totalLoansDisbursed = Math.round(totalLoansDisbursed * 100) / 100;
  totalLoansRepaid = Math.round(totalLoansRepaid * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;

  const outstandingLoanPrincipal = Math.max(0, Math.round((totalLoansDisbursed - totalLoansRepaid) * 100) / 100);

  return {
    cashOnHand,
    bankBalance,
    totalSavingsCollected,
    totalLoansDisbursed,
    totalLoansRepaid,
    outstandingLoanPrincipal,
    totalExpenses,
    transactionCount: transactions.length,
  };
}

/**
 * Reverse a financial transaction (Correction record with audit trail)
 * Financial history is not deleted.
 */
async function reverseTransaction(originalTxId, reason, userId) {
  const originalTx = await FinancialTransaction.findOne({
    transactionId: originalTxId,
    status: 'COMPLETED',
  });

  if (!originalTx) {
    throw new Error('Valid completed transaction not found to reverse');
  }

  // Swap source and destination accounts to reverse the flow
  const reversalTxId = `REV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const reversalTx = new FinancialTransaction({
    transactionId: reversalTxId,
    groupId: originalTx.groupId,
    transactionType: 'ADJUSTMENT',
    category: 'Transaction Reversal',
    description: `Reversal of ${originalTx.transactionId}: ${reason}`,
    amount: originalTx.amount,
    paymentMethod: originalTx.paymentMethod,
    sourceAccount: originalTx.destinationAccount,
    destinationAccount: originalTx.sourceAccount,
    memberId: originalTx.memberId,
    reference: `REF-${originalTx.transactionId}`,
    createdBy: userId,
    status: 'COMPLETED',
    reversalOf: originalTx._id,
    reversalReason: reason,
  });

  await reversalTx.save();

  originalTx.status = 'REVERSED';
  originalTx.reversalReason = reason;
  await originalTx.save();

  return { originalTx, reversalTx };
}

module.exports = {
  recordTransaction,
  getDerivedBalances,
  reverseTransaction,
};
