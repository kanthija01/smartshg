const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const Member = require('../models/Member');
const Savings = require('../models/Savings');
const FinancialTransaction = require('../models/FinancialTransaction');
const Loan = require('../models/Loan');
const LoanInstallment = require('../models/LoanInstallment');
const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');
const Scheme = require('../models/Scheme');
const AuditLog = require('../models/AuditLog');
const { calculateReducingBalanceEMI } = require('../utils/emiCalculator');

async function seedDatabase(shouldExit = true) {
  try {
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Group.deleteMany({}),
      Member.deleteMany({}),
      Savings.deleteMany({}),
      FinancialTransaction.deleteMany({}),
      Loan.deleteMany({}),
      LoanInstallment.deleteMany({}),
      Meeting.deleteMany({}),
      Attendance.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
      Scheme.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed] Creating demo users...');
    // 1 Demo Head
    const headUser = await User.create({
      name: 'Radha Devi (President)',
      email: 'radha@smartshg.org',
      phone: '9876543210',
      password: 'password123',
      role: 'HEAD',
      preferredLanguage: 'en',
    });

    // 3 Demo Members
    const memberUser1 = await User.create({
      name: 'Lakshmi Bai',
      email: 'lakshmi@smartshg.org',
      phone: '9876543211',
      password: 'password123',
      role: 'MEMBER',
      preferredLanguage: 'te',
    });

    const memberUser2 = await User.create({
      name: 'Saraswathi Rao',
      email: 'saraswathi@smartshg.org',
      phone: '9876543212',
      password: 'password123',
      role: 'MEMBER',
      preferredLanguage: 'en',
    });

    const memberUser3 = await User.create({
      name: 'Anitha Kumari',
      email: 'anitha@smartshg.org',
      phone: '9876543213',
      password: 'password123',
      role: 'MEMBER',
      preferredLanguage: 'te',
    });

    console.log('[Seed] Creating demo SHG group...');
    const group = await Group.create({
      name: 'Sri Chaitanya Mahila Podupu Sangham',
      code: 'SCMS-101',
      registrationNumber: 'AP/KRI/2021/SHG-4892',
      villageTown: 'Gollapudi',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      formationDate: new Date('2021-04-15'),
      description: 'Women empowerment and micro-lending self-help group fostering livelihood and community savings.',
      headId: headUser._id,
      monthlySavingsAmount: 500,
      dueDayOfMonth: 10,
      bankDetails: {
        bankName: 'State Bank of India',
        branch: 'Gollapudi Main',
        accountNumber: '38491029481',
        ifscCode: 'SBIN0012849',
        accountHolderName: 'Sri Chaitanya Mahila SHG',
      },
      lastReconciliation: {
        passbookBalance: 24500,
        difference: 0,
        explanation: 'Monthly passbook verification matched system records.',
        reconciledBy: headUser._id,
        reconciledAt: new Date(),
      },
    });

    console.log('[Seed] Creating member profiles...');
    const member1 = await Member.create({
      groupId: group._id,
      userId: memberUser1._id,
      memberNumber: 'M-01',
      designation: 'SECRETARY',
      joinDate: new Date('2021-04-15'),
      status: 'ACTIVE',
      totalSavings: 4500,
      outstandingLoan: 15400,
      emergencyContact: { name: 'Ramesh Bai', phone: '9876500001', relation: 'Spouse' },
    });

    const member2 = await Member.create({
      groupId: group._id,
      userId: memberUser2._id,
      memberNumber: 'M-02',
      designation: 'TREASURER',
      joinDate: new Date('2021-04-15'),
      status: 'ACTIVE',
      totalSavings: 5000,
      outstandingLoan: 0,
      emergencyContact: { name: 'Srinivas Rao', phone: '9876500002', relation: 'Spouse' },
    });

    const member3 = await Member.create({
      groupId: group._id,
      userId: memberUser3._id,
      memberNumber: 'M-03',
      designation: 'MEMBER',
      joinDate: new Date('2021-05-10'),
      status: 'ACTIVE',
      totalSavings: 4000,
      outstandingLoan: 0,
      emergencyContact: { name: 'Venkat Kumari', phone: '9876500003', relation: 'Brother' },
    });

    console.log('[Seed] Creating financial transactions & savings history...');
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastPeriod = `${now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`;

    // Transactions
    // 1. Past savings collections in Cash
    const tx1 = await FinancialTransaction.create({
      transactionId: 'TXN-2026-0001',
      groupId: group._id,
      transactionType: 'SAVINGS_COLLECTION',
      category: 'Member Monthly Savings',
      description: `Monthly savings for period ${lastPeriod} from Lakshmi Bai`,
      amount: 500,
      paymentMethod: 'CASH',
      sourceAccount: 'EXTERNAL',
      destinationAccount: 'CASH',
      memberId: member1._id,
      reference: 'RCP-SAV-001',
      createdBy: headUser._id,
      date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    });

    await Savings.create({
      transactionId: 'TXN-2026-0001',
      receiptNumber: 'RCP-SAV-001',
      groupId: group._id,
      memberId: member1._id,
      userId: memberUser1._id,
      period: lastPeriod,
      amount: 500,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      date: tx1.date,
      recordedBy: headUser._id,
      notes: 'Collected during monthly meeting',
      financialTransactionId: tx1._id,
    });

    // 2. Saraswathi paid via Online/Bank
    const tx2 = await FinancialTransaction.create({
      transactionId: 'TXN-2026-0002',
      groupId: group._id,
      transactionType: 'SAVINGS_COLLECTION',
      category: 'Member Monthly Savings',
      description: `Monthly savings for period ${lastPeriod} from Saraswathi Rao`,
      amount: 500,
      paymentMethod: 'ONLINE',
      sourceAccount: 'EXTERNAL',
      destinationAccount: 'BANK',
      memberId: member2._id,
      reference: 'pay_rzp_demo_123',
      createdBy: memberUser2._id,
      date: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
    });

    await Savings.create({
      transactionId: 'TXN-2026-0002',
      receiptNumber: 'RCP-SAV-002',
      groupId: group._id,
      memberId: member2._id,
      userId: memberUser2._id,
      period: lastPeriod,
      amount: 500,
      paymentMethod: 'ONLINE',
      status: 'COMPLETED',
      date: tx2.date,
      recordedBy: headUser._id,
      notes: 'UPI payment verified',
      financialTransactionId: tx2._id,
    });

    // 3. Current month partial payment (Lakshmi paid ₹300 of ₹500)
    const tx3 = await FinancialTransaction.create({
      transactionId: 'TXN-2026-0003',
      groupId: group._id,
      transactionType: 'SAVINGS_COLLECTION',
      category: 'Member Monthly Savings',
      description: `Partial monthly savings for period ${currentPeriod} from Lakshmi Bai`,
      amount: 300,
      paymentMethod: 'CASH',
      sourceAccount: 'EXTERNAL',
      destinationAccount: 'CASH',
      memberId: member1._id,
      reference: 'RCP-SAV-003',
      createdBy: headUser._id,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    await Savings.create({
      transactionId: 'TXN-2026-0003',
      receiptNumber: 'RCP-SAV-003',
      groupId: group._id,
      memberId: member1._id,
      userId: memberUser1._id,
      period: currentPeriod,
      amount: 300,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      date: tx3.date,
      recordedBy: headUser._id,
      notes: 'Partial payment; ₹200 pending for this month',
      financialTransactionId: tx3._id,
    });

    // 4. Initial Bank Deposit by Head
    await FinancialTransaction.create({
      transactionId: 'TXN-2026-0004',
      groupId: group._id,
      transactionType: 'BANK_DEPOSIT',
      category: 'Bank Deposit',
      description: 'Deposited pooled group cash into SBI account',
      amount: 25000,
      paymentMethod: 'CASH',
      sourceAccount: 'CASH',
      destinationAccount: 'BANK',
      reference: 'CHQ-SBI-99120',
      createdBy: headUser._id,
      date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    });

    // Additional opening balance cash pool
    await FinancialTransaction.create({
      transactionId: 'TXN-2026-0000',
      groupId: group._id,
      transactionType: 'ADJUSTMENT',
      category: 'Opening Cash Pool',
      description: 'Historical accumulated cash on hand prior to digital onboarding',
      amount: 28000,
      paymentMethod: 'CASH',
      sourceAccount: 'EXTERNAL',
      destinationAccount: 'CASH',
      reference: 'INIT-CASH-2026',
      createdBy: headUser._id,
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    });

    console.log('[Seed] Creating demo loan with reducing-balance EMI...');
    const emiCalc = calculateReducingBalanceEMI(20000, 12, 12);

    const loan = await Loan.create({
      loanId: 'LN-2026-001',
      groupId: group._id,
      memberId: member1._id,
      principal: 20000,
      purpose: 'Purchasing commercial sewing machine and tailoring materials',
      interestRate: 12,
      interestMethod: 'REDUCING_BALANCE',
      tenureMonths: 12,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      status: 'DISBURSED',
      approvedBy: headUser._id,
      approvedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
      disbursedBy: headUser._id,
      disbursedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      disbursementMethod: 'BANK_TRANSFER',
      totalInterest: emiCalc.totalInterest,
      totalPayable: emiCalc.totalPayable,
      emiAmount: emiCalc.emi,
      outstandingPrincipal: 16900,
      outstandingInterest: emiCalc.totalInterest - 380,
      totalRepaid: 3550,
    });

    // Create loan disbursement transaction
    await FinancialTransaction.create({
      transactionId: 'TXN-2026-0005',
      groupId: group._id,
      transactionType: 'LOAN_DISBURSEMENT',
      category: 'Loan Disbursement',
      description: `Disbursed loan ${loan.loanId} to Lakshmi Bai via Bank Transfer`,
      amount: 20000,
      paymentMethod: 'BANK_TRANSFER',
      sourceAccount: 'BANK',
      destinationAccount: 'LOAN_ACCOUNT',
      memberId: member1._id,
      reference: `DISB-${loan.loanId}`,
      createdBy: headUser._id,
      date: loan.disbursedAt,
    });

    // Installments
    for (let i = 0; i < emiCalc.schedule.length; i++) {
      const item = emiCalc.schedule[i];
      const dueDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      dueDate.setMonth(dueDate.getMonth() + item.installmentNumber);

      const isPaid = i < 2; // First 2 installments paid
      await LoanInstallment.create({
        loanId: loan._id,
        groupId: group._id,
        memberId: member1._id,
        installmentNumber: item.installmentNumber,
        dueDate,
        principalAmount: item.principalAmount,
        interestAmount: item.interestAmount,
        emiAmount: item.emiAmount,
        paidAmount: isPaid ? item.emiAmount : 0,
        remainingAmount: isPaid ? 0 : item.emiAmount,
        status: isPaid ? 'PAID' : 'PENDING',
        paidDate: isPaid ? dueDate : undefined,
      });
    }

    // Record repayment transaction
    await FinancialTransaction.create({
      transactionId: 'TXN-2026-0006',
      groupId: group._id,
      transactionType: 'LOAN_REPAYMENT',
      category: 'Loan Repayment',
      description: `EMI installment repayments for loan ${loan.loanId}`,
      amount: 3550,
      paymentMethod: 'CASH',
      sourceAccount: 'EXTERNAL',
      destinationAccount: 'CASH',
      memberId: member1._id,
      reference: 'RCP-LN-9921',
      createdBy: headUser._id,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    console.log('[Seed] Creating demo meeting & attendance...');
    const meeting = await Meeting.create({
      groupId: group._id,
      title: 'Monthly Savings & Livelihood Meeting',
      meetingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      time: '10:30 AM',
      location: 'Gollapudi Community Center',
      agenda: 'Collection of monthly savings, review of Lakshmi sewing enterprise loan, and overview of government subvention schemes.',
      notes: 'All members agreed on timely repayments and discussed participating in district handicraft exhibition.',
      actionItems: [
        { task: 'Prepare passbook reconciliation for audit', assignedTo: member2._id, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), completed: false },
        { task: 'Submit handicraft stall application', assignedTo: member1._id, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), completed: true },
      ],
      status: 'COMPLETED',
      createdBy: headUser._id,
    });

    await Attendance.create([
      { meetingId: meeting._id, groupId: group._id, memberId: member1._id, status: 'PRESENT', recordedBy: headUser._id },
      { meetingId: meeting._id, groupId: group._id, memberId: member2._id, status: 'PRESENT', recordedBy: headUser._id },
      { meetingId: meeting._id, groupId: group._id, memberId: member3._id, status: 'LATE', fineAmount: 10, notes: 'Arrived 15 mins late due to farm work', recordedBy: headUser._id },
    ]);

    // Upcoming meeting
    await Meeting.create({
      groupId: group._id,
      title: 'Quarterly Audit & New Loan Requests',
      meetingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      time: '11:00 AM',
      location: 'Anganwadi Center, Gollapudi',
      agenda: 'Quarterly financial ledger verification, new loan application reviews, and festive season savings bonus.',
      status: 'SCHEDULED',
      createdBy: headUser._id,
    });

    console.log('[Seed] Creating demo group expenses...');
    const expTx = await FinancialTransaction.create({
      transactionId: 'TXN-2026-0007',
      groupId: group._id,
      transactionType: 'EXPENSE',
      category: 'Expense: STATIONARY',
      description: 'Meeting register books, pen sets, and receipt carbon pads',
      amount: 350,
      paymentMethod: 'CASH',
      sourceAccount: 'CASH',
      destinationAccount: 'EXPENSE_ACCOUNT',
      reference: 'BILL-SRI-881',
      createdBy: headUser._id,
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    });

    await Expense.create({
      groupId: group._id,
      date: expTx.date,
      category: 'STATIONARY',
      amount: 350,
      description: 'Meeting register books, pen sets, and receipt carbon pads',
      paymentSource: 'CASH',
      reference: 'BILL-SRI-881',
      recordedBy: headUser._id,
      financialTransactionId: expTx._id,
    });

    console.log('[Seed] Creating demo notifications...');
    await Notification.create([
      {
        userId: memberUser1._id,
        groupId: group._id,
        title: { en: 'Savings Due Reminder', te: 'పొదుపు బకాయి రిమైండర్' },
        message: {
          en: `Your monthly savings for ${currentPeriod} has ₹200 pending. Kindly complete by the 10th.`,
          te: `${currentPeriod} కాలానికి మీ నెలవారీ పొదుపులో ₹200 బకాయి ఉంది. దయచేసి 10వ తేదీలోగా చెల్లించండి.`,
        },
        type: 'SAVINGS_DUE',
        link: '/savings',
      },
      {
        userId: memberUser1._id,
        groupId: group._id,
        title: { en: 'Next EMI Due Soon', te: 'తదుపరి ఈఎంఐ త్వరలో చెల్లించాలి' },
        message: {
          en: `Installment #3 of ₹${emiCalc.emi} for loan LN-2026-001 is due on the 15th.`,
          te: `రుణం LN-2026-001 కి సంబంధించి 3వ వాయిదా ₹${emiCalc.emi} 15వ తేదీన చెల్లించాల్సి ఉంది.`,
        },
        type: 'EMI_DUE',
        link: '/loans',
      },
      {
        userId: headUser._id,
        groupId: group._id,
        title: { en: 'Bank Passbook Reconciled', te: 'బ్యాంక్ పాస్‌బుక్ ధృవీకరించబడింది' },
        message: {
          en: 'System ledger and bank passbook reconciliation completed successfully.',
          te: 'వ్యవస్థ లెడ్జర్ మరియు బ్యాంక్ పాస్‌బుక్ వివరాలు విజయవంతంగా సరిపోలాయి.',
        },
        type: 'GENERAL',
        link: '/cash-bank',
      },
    ]);

    console.log('[Seed] Creating curated government schemes information...');
    await Scheme.create([
      {
        title: {
          en: 'YSR Sunna Vaddi (Zero Interest Loan Scheme)',
          te: 'వైఎస్సార్ సున్నా వడ్డీ పథకం',
        },
        slug: 'ysr-sunna-vaddi',
        category: 'SUBSIDIES',
        shortSummary: {
          en: 'Full interest subvention on bank linkage loans for prompt-repaying women SHGs.',
          te: 'సకాలంలో రుణాలు చెల్లించే మహిళా స్వయం సహాయక సంఘాలకు పూర్తి వడ్డీ రాయితీ.',
        },
        description: {
          en: 'The scheme provides 100% interest reimbursement on bank loans taken by Self-Help Groups in Andhra Pradesh who maintain disciplined monthly repayment records. The government credits the interest amount directly to the SHG bank account.',
          te: 'ఈ పథకం కింద క్రమశిక్షణతో నెలవారీ రుణాలు చెల్లించే ఆంధ్రప్రదేశ్ మహిళా స్వయం సహాయక సంఘాలకు బ్యాంకు రుణాలపై 100% వడ్డీని ప్రభుత్వమే భరించి నేరుగా సంఘం ఖాతాలో జమ చేస్తుంది.',
        },
        eligibility: {
          en: [
            'Registered women SHG in Andhra Pradesh',
            'Active bank linkage loan under ₹5,00,000',
            'Prompt repayment track record without non-performing asset (NPA) defaults',
          ],
          te: [
            'ఆంధ్రప్రదేశ్‌లో నమోదైన మహిళా స్వయం సహాయక సంఘాలు',
            'రూ. 5,00,000 లోపు బ్యాంక్ లింకేజ్ రుణం ఉన్న సంఘాలు',
            'ఎటువంటి ఎన్‌పీఏ లేదా బకాయిలు లేకుండా సకాలంలో చెల్లించే సంఘాలు',
          ],
        },
        benefits: {
          en: ['Zero effective interest on bank loans', 'Direct financial reimbursement into SHG bank account', 'Strengthened credit rating for higher bank linkage'],
          te: ['బ్యాంకు రుణాలపై సున్నా వడ్డీ', 'సంఘం బ్యాంకు ఖాతాలోకి నేరుగా నగదు జమ', 'భవిష్యత్తులో పెద్ద రుణాల కోసం క్రెడిట్ రేటింగ్ పెరుగుదల'],
        },
        requiredDocuments: {
          en: ['SHG Bank Passbook', 'Loan repayment ledger / statement', 'Member Aadhaar copies', 'SERP / MEPMA SHG registration certificate'],
          te: ['సంఘం బ్యాంక్ పాస్‌బుక్', 'రుణ చెల్లింపు లెడ్జర్ / స్టేట్‌మెంట్', 'సభ్యుల ఆధార్ కార్డుల నకళ్లు', 'సెర్ప్ / మెప్మా రిజిస్ట్రేషన్ సర్టిఫికెట్'],
        },
        howToApply: {
          en: 'Submit bank loan repayment certificates through the Village Organization (VO) / SERP portal or your local Mandal Samakhya coordinator.',
          te: 'గ్రామ సమాఖ్య (VO) లేదా స్థానిక మండల సమాఖ్య సమన్వయకర్త ద్వారా బ్యాంక్ లోన్ రీపేమెంట్ సర్టిఫికేట్‌ను సమర్పించండి.',
        },
        officialSource: 'Society for Elimination of Rural Poverty (SERP), Govt of Andhra Pradesh (serp.ap.gov.in)',
        stateApplicability: 'Andhra Pradesh',
        activeStatus: true,
      },
      {
        title: {
          en: 'Deendayal Antyodaya Yojana - NRLM Community Investment Support',
          te: 'దీనదయాళ్ అంత్యోదయ యోజన - ఎన్.ఆర్.ఎల్.ఎం',
        },
        slug: 'day-nrlm-fund',
        category: 'SHG_SUPPORT',
        shortSummary: {
          en: 'Revolving Fund (RF) and Community Investment Fund (CIF) for women SHGs.',
          te: 'మహిళా సంఘాలకు రివాల్వింగ్ ఫండ్ మరియు కమ్యూనిటీ ఇన్వెస్ట్‌మెంట్ ఫండ్ గ్రాంట్లు.',
        },
        description: {
          en: 'The National Rural Livelihoods Mission (DAY-NRLM) provides Revolving Funds (₹20,000 - ₹30,000) and Community Investment Support Funds to build internal lending capital and empower women micro-entrepreneurs.',
          te: 'జాతీయ గ్రామీణ జీవనోపాధి మిషన్ (DAY-NRLM) మహిళా స్వయం సహాయక సంఘాలకు అంతర్గత పొదుపు మరియు రుణ నిధిని పెంపొందించడానికి రివాల్వింగ్ ఫండ్ మరియు పెట్టుబడి మద్దతు అందిస్తుంది.',
        },
        eligibility: {
          en: [
            'Group active for at least 3 to 6 months',
            'Following the "Panchasutra": regular meetings, regular savings, regular internal lending, regular repayments, and maintained book-keeping',
          ],
          te: [
            'కనీసం 3 నుండి 6 నెలలు క్రియాశీలంగా ఉన్న సంఘాలు',
            'పంచసూత్రాలను పాటిస్తున్న సంఘాలు (సక్రమ సమావేశాలు, పొదుపు, అంతర్గత రుణాలు, సకాలంలో చెల్లింపు, సరైన రికార్డులు)',
          ],
        },
        benefits: {
          en: ['Grant of ₹20,000 to ₹30,000 Revolving Fund', 'Low-interest Community Investment Support', 'Skill development and enterprise training'],
          te: ['రూ. 20,000 నుండి రూ. 30,000 వరకు రివాల్వింగ్ ఫండ్', 'తక్కువ వడ్డీతో కమ్యూనిటీ ఇన్వెస్ట్‌మెంట్ నిధులు', 'నైపుణ్యాభివృద్ధి మరియు శిక్షణ'],
        },
        requiredDocuments: {
          en: ['SHG Resolution copy', 'Group meeting minute books & passbook', 'Member KYC identification'],
          te: ['సంఘం తీర్మానం ప్రతి', 'సమావేశ రిజిస్టర్ మరియు బ్యాంక్ పాస్‌బుక్', 'సభ్యుల కేవైసీ పత్రాలు'],
        },
        howToApply: {
          en: 'Contact your Village Organization (VO) Animator or Block Development Officer (BDO) under the State Rural Livelihoods Mission.',
          te: 'రాష్ట్ర గ్రామీణ జీవనోపాధి మిషన్ పరిధిలోని గ్రామ సమాఖ్య యానిమేటర్ లేదా సంబంధిత మండల అభివృద్ధి అధికారిని సంప్రదించండి.',
        },
        officialSource: 'Ministry of Rural Development, Govt of India (aajeevika.gov.in)',
        stateApplicability: 'All India',
        activeStatus: true,
      },
      {
        title: {
          en: 'PM Mudra Yojana (Shishu & Kishore Loans)',
          te: 'ప్రధాన మంత్రి ముద్రా యోజన',
        },
        slug: 'pm-mudra-yojana',
        category: 'LOANS',
        shortSummary: {
          en: 'Collateral-free micro loans up to ₹50,000 (Shishu) and ₹5,00,000 (Kishore) for micro-enterprises.',
          te: 'చిరు వ్యాపారాలు మరియు కుటీర పరిశ్రమల కోసం పూచీకత్తు లేని ముద్రా రుణాలు.',
        },
        description: {
          en: 'Pradhan Mantri MUDRA Yojana (PMMY) facilitates institutional credit up to ₹10 lakh to micro-enterprises for income-generating activities such as tailoring, dairy farming, grocery shops, and handloom weaving.',
          te: 'టైలరింగ్, పాడి పరిశ్రమ, కిరాణా దుకాణాలు, చేనేత వంటి స్వయం ఉపాధి కల్పించే వ్యాపారాల కోసం గ్యారంటీ లేకుండా బ్యాంకుల ద్వారా రుణాలు అందించే పథకం.',
        },
        eligibility: {
          en: ['Any Indian citizen with a viable micro-business plan', 'No prior bank loan default'],
          te: ['ఆదాయాన్నిచ్చే వ్యాపార ప్రణాళిక కలిగిన భారతీయ పౌరులు / సంఘ సభ్యులు', 'బ్యాంకు డిఫాల్ట్ లేని రికార్డు'],
        },
        benefits: {
          en: ['No collateral or third-party guarantee required', 'Affordable interest rates', 'Flexible repayment tenure up to 5 years'],
          te: ['ఎటువంటి పూచీకత్తు లేదా ఆస్తులు తాకట్టు పెట్టనక్కర్లేదు', 'సరసమైన వడ్డీ రేట్లు', '5 సంవత్సరాల వరకు సులభ వాయిదాలు'],
        },
        requiredDocuments: {
          en: ['Aadhaar Card, Voter ID / PAN Card', 'Business address proof / Udyam registration', 'Bank statement for last 6 months', 'Quotation / project plan for equipment'],
          te: ['ఆధార్ కార్డు / ఓటర్ గుర్తింపు కార్డు', 'వ్యాపార చిరునామా / ఉద్యమ్ రిజిస్ట్రేషన్', 'గత 6 నెలల బ్యాంక్ స్టేట్‌మెంట్', 'వ్యాపార ప్రతిపాదన లేదా కొటేషన్'],
        },
        howToApply: {
          en: 'Apply through any Public Sector Bank, Regional Rural Bank (RRB), or via the JanSamarth digital credit portal (jansamarth.in).',
          te: 'ఏదైనా జాతీయ బ్యాంకు, గ్రామీణ బ్యాంకు లేదా జనసమర్థ్ పోర్టల్ (jansamarth.in) ద్వారా నేరుగా దరఖాస్తు చేసుకోవచ్చు.',
        },
        officialSource: 'Department of Financial Services, Ministry of Finance (mudra.org.in)',
        stateApplicability: 'All India',
        activeStatus: true,
      },
    ]);

    console.log('[Seed] Creating initial audit log records...');
    await AuditLog.create({
      groupId: group._id,
      userId: headUser._id,
      userName: headUser.name,
      userRole: headUser.role,
      action: 'SYSTEM_INITIALIZATION',
      description: 'SmartSHG demo workspace and Self-Help Group records initialized.',
      reference: 'SEED_DATA_V1',
    });

    console.log('====================================================');
    console.log('[Seed] DATABASE SEEDED SUCCESSFULLY!');
    console.log('Demo Credentials:');
    console.log('  HEAD:   radha@smartshg.org    | password: password123 | Phone: 9876543210');
    console.log('  MEMBER: lakshmi@smartshg.org  | password: password123 | Phone: 9876543211');
    console.log('  MEMBER: saraswathi@smartshg.org | password: password123 | Phone: 9876543212');
    console.log('====================================================');

    if (shouldExit) {
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    if (shouldExit) {
      process.exit(1);
    }
    throw err;
  }
}

// If executed directly from CLI: node scripts/seed.js
if (require.main === module) {
  const { connectDB } = require('../config/db');
  connectDB().then(() => {
    seedDatabase(true);
  });
}

module.exports = seedDatabase;
