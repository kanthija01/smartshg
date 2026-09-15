/**
 * SmartSHG EMI & Interest Calculator
 */

/**
 * Calculate Reducing Balance EMI
 * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * @param {number} principal - Loan amount (P)
 * @param {number} annualRate - Annual interest rate in % (e.g. 12 for 12%)
 * @param {number} tenureMonths - Tenure in months (n)
 */
function calculateReducingBalanceEMI(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) {
    return { emi: 0, totalInterest: 0, totalPayable: 0, schedule: [] };
  }

  // Monthly interest rate r
  const monthlyRate = annualRate / 12 / 100;

  let emi;
  if (monthlyRate === 0) {
    emi = principal / tenureMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    emi = (principal * monthlyRate * factor) / (factor - 1);
  }

  emi = Math.round(emi * 100) / 100;

  // Generate amortization schedule
  let remainingPrincipal = principal;
  let totalInterest = 0;
  const schedule = [];

  const startDate = new Date();

  for (let i = 1; i <= tenureMonths; i++) {
    const interestForMonth = Math.round(remainingPrincipal * monthlyRate * 100) / 100;
    let principalForMonth = Math.round((emi - interestForMonth) * 100) / 100;

    // Handle last month rounding
    if (i === tenureMonths || remainingPrincipal - principalForMonth < 1) {
      principalForMonth = remainingPrincipal;
      emi = Math.round((principalForMonth + interestForMonth) * 100) / 100;
    }

    remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - principalForMonth) * 100) / 100);
    totalInterest += interestForMonth;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      dueDate,
      principalAmount: principalForMonth,
      interestAmount: interestForMonth,
      emiAmount: emi,
      paidAmount: 0,
      remainingAmount: emi,
      status: 'PENDING',
    });
  }

  totalInterest = Math.round(totalInterest * 100) / 100;
  const totalPayable = Math.round((principal + totalInterest) * 100) / 100;

  return {
    emi,
    totalInterest,
    totalPayable,
    schedule,
  };
}

/**
 * Calculate Simple Interest Loan Schedule
 * Total Interest = (P * R * T) / 100 where T is years = tenureMonths / 12
 * Monthly Principal = P / tenureMonths
 * Monthly Interest = Total Interest / tenureMonths
 */
function calculateSimpleInterestSchedule(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) {
    return { emi: 0, totalInterest: 0, totalPayable: 0, schedule: [] };
  }

  const timeInYears = tenureMonths / 12;
  const totalInterest = Math.round(((principal * annualRate * timeInYears) / 100) * 100) / 100;
  const totalPayable = Math.round((principal + totalInterest) * 100) / 100;

  const monthlyPrincipal = Math.round((principal / tenureMonths) * 100) / 100;
  const monthlyInterest = Math.round((totalInterest / tenureMonths) * 100) / 100;
  const emi = Math.round((monthlyPrincipal + monthlyInterest) * 100) / 100;

  const schedule = [];
  const startDate = new Date();
  let remainingPrincipal = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    let pAmount = monthlyPrincipal;
    if (i === tenureMonths) {
      pAmount = remainingPrincipal;
    }
    remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - pAmount) * 100) / 100);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      dueDate,
      principalAmount: pAmount,
      interestAmount: monthlyInterest,
      emiAmount: Math.round((pAmount + monthlyInterest) * 100) / 100,
      paidAmount: 0,
      remainingAmount: Math.round((pAmount + monthlyInterest) * 100) / 100,
      status: 'PENDING',
    });
  }

  return {
    emi,
    totalInterest,
    totalPayable,
    schedule,
  };
}

module.exports = {
  calculateReducingBalanceEMI,
  calculateSimpleInterestSchedule,
};
