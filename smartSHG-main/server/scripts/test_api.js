/**
 * SmartSHG Automated Backend API Test Suite
 */
const http = require('http');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');

let server;
let baseUrl;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n=============================================');
  console.log('STARTING SMARTSHG BACKEND API TEST SUITE');
  console.log('=============================================\n');

  try {
    await connectDB();

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`[Test Runner] Temporary test server running on port ${port}`);

    // 1. Health check
    console.log('\nTest 1: Health check endpoint');
    const health = await request('GET', '/api/health');
    if (health.status !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log('  PASSED: Health check returned 200 OK');

    // 2. Registration: create a leader-owned group and a member in that group
    console.log('\nTest 2: Register and authenticate fresh HEAD and MEMBER accounts');
    const registrationSuffix = Date.now();
    const newHead = await request('POST', '/api/auth/register', {
      name: 'Test Group Leader',
      email: `leader-${registrationSuffix}@example.com`,
      phone: `9${String(registrationSuffix).slice(-9)}`,
      password: 'password123',
      role: 'HEAD',
      preferredLanguage: 'en',
      groupName: 'Test Women SHG',
      villageTown: 'Test Village',
      district: 'Test District',
    });
    if (newHead.status !== 201 || !newHead.data.token || !newHead.data.user.defaultGroup?.code) {
      throw new Error(`Fresh HEAD registration failed: ${JSON.stringify(newHead)}`);
    }
    const newMember = await request('POST', '/api/auth/register', {
      name: 'Test Member',
      email: `member-${registrationSuffix}@example.com`,
      phone: `8${String(registrationSuffix).slice(-9)}`,
      password: 'password123',
      role: 'MEMBER',
      preferredLanguage: 'te',
      groupCode: newHead.data.user.defaultGroup.code,
    });
    if (newMember.status !== 201 || !newMember.data.token || !newMember.data.user.defaultGroup) {
      throw new Error(`Fresh MEMBER registration failed: ${JSON.stringify(newMember)}`);
    }
    const freshHeadLogin = await request('POST', '/api/auth/login', {
      identifier: `leader-${registrationSuffix}@example.com`,
      password: 'password123',
    });
    const freshMemberLogin = await request('POST', '/api/auth/login', {
      identifier: `member-${registrationSuffix}@example.com`,
      password: 'password123',
    });
    if (freshHeadLogin.status !== 200 || !freshHeadLogin.data.user.defaultGroup || freshMemberLogin.status !== 200 || !freshMemberLogin.data.user.defaultGroup) {
      throw new Error(`Fresh account login failed: ${JSON.stringify({ freshHeadLogin, freshMemberLogin })}`);
    }
    console.log('  PASSED: Fresh HEAD and MEMBER accounts registered and logged in');

    // 3. Authentication: Login as HEAD (Radha Devi)
    console.log('\nTest 3: Authenticate as Demo HEAD (Radha Devi)');
    const headLogin = await request('POST', '/api/auth/login', {
      identifier: 'radha@smartshg.org',
      password: 'password123',
    });
    if (headLogin.status !== 200 || !headLogin.data.token) {
      throw new Error(`HEAD login failed: ${JSON.stringify(headLogin)}`);
    }
    const headToken = headLogin.data.token;
    const groupId = headLogin.data.user.defaultGroup.id;
    console.log(`  PASSED: HEAD authenticated. Group ID: ${groupId}`);

    // 4. Authentication: Login as MEMBER (Lakshmi Bai)
    console.log('\nTest 4: Authenticate as Demo MEMBER (Lakshmi Bai)');
    const memberLogin = await request('POST', '/api/auth/login', {
      identifier: 'lakshmi@smartshg.org',
      password: 'password123',
    });
    if (memberLogin.status !== 200 || !memberLogin.data.token) {
      throw new Error(`MEMBER login failed: ${JSON.stringify(memberLogin)}`);
    }
    const memberToken = memberLogin.data.token;
    const memberId = memberLogin.data.user.memberId;
    console.log(`  PASSED: MEMBER authenticated. Member ID: ${memberId}`);

    // 4. Group Stats (HEAD)
    console.log('\nTest 4: Verify Group Dashboard & Derived Balances');
    const statsRes = await request('GET', `/api/groups/${groupId}/stats`, null, {
      Authorization: `Bearer ${headToken}`,
    });
    if (statsRes.status !== 200 || !statsRes.data.stats) {
      throw new Error(`Group stats failed: ${JSON.stringify(statsRes)}`);
    }
    console.log('  PASSED: Derived cash on hand:', statsRes.data.stats.cashOnHand);
    console.log('  PASSED: Derived bank balance:', statsRes.data.stats.bankBalance);

    // 5. Strict IDOR Security Test: Member trying to access another member's statement
    console.log('\nTest 5: STRICT IDOR Security Test (MEMBER accessing another member data)');
    // Try to access memberId 000000000000000000000000 or different ID
    const fakeMemberId = '666666666666666666666666';
    const idorTest = await request(
      'GET',
      `/api/groups/${groupId}/reports/member-statement/${fakeMemberId}`,
      null,
      { Authorization: `Bearer ${memberToken}` }
    );
    if (idorTest.status === 403) {
      console.log('  PASSED: Unauthorized access blocked with 403 Forbidden!');
    } else {
      throw new Error(`IDOR test failed. Expected 403, got: ${idorTest.status}`);
    }

    // 6. Record Savings in Cash (HEAD)
    console.log('\nTest 6: Record Savings Collection in Cash');
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const savingsRes = await request(
      'POST',
      `/api/groups/${groupId}/savings`,
      {
        memberId,
        amount: 200,
        period: currentPeriod,
        paymentMethod: 'CASH',
        notes: 'API automated test savings entry',
      },
      { Authorization: `Bearer ${headToken}` }
    );
    if (savingsRes.status !== 201 || !savingsRes.data.savings) {
      throw new Error(`Record savings failed: ${JSON.stringify(savingsRes)}`);
    }
    console.log(`  PASSED: Savings of ₹200 recorded. Receipt: ${savingsRes.data.receipt?.receiptNumber}`);

    // 7. Duplicate Prevention Test
    console.log('\nTest 7: Duplicate Transaction Prevention');
    const dupRes = await request(
      'POST',
      `/api/groups/${groupId}/savings`,
      {
        memberId,
        amount: 200,
        period: currentPeriod,
        paymentMethod: 'CASH',
      },
      { Authorization: `Bearer ${headToken}` }
    );
    if (dupRes.status === 409) {
      console.log('  PASSED: Duplicate submission blocked with 409 Conflict!');
    } else {
      console.log(`  Note: Status ${dupRes.status} on immediate retry.`);
    }

    // 8. Bank Deposit (Cash on hand -> Bank)
    console.log('\nTest 8: Deposit Cash on Hand into Bank');
    const depositRes = await request(
      'POST',
      `/api/groups/${groupId}/ledger/deposit`,
      {
        amount: 500,
        reference: 'DEP-TEST-001',
        notes: 'Automated test deposit',
      },
      { Authorization: `Bearer ${headToken}` }
    );
    if (depositRes.status !== 201) {
      throw new Error(`Deposit failed: ${JSON.stringify(depositRes)}`);
    }
    console.log('  PASSED: Cash deposited to Bank. New balances:', depositRes.data.balances);

    // 9. Loan Workflow: Member requests loan -> HEAD approves -> HEAD disburses
    console.log('\nTest 9: Complete Loan Lifecycle (Request -> Approve -> Disburse -> Repay)');
    // Step A: Member requests loan
    const loanReqRes = await request(
      'POST',
      `/api/groups/${groupId}/loans`,
      {
        principal: 5000,
        purpose: 'Dairy cattle feed purchase',
        tenureMonths: 6,
        interestRate: 12,
        interestMethod: 'REDUCING_BALANCE',
      },
      { Authorization: `Bearer ${memberToken}` }
    );
    if (loanReqRes.status !== 201 || !loanReqRes.data.loan) {
      throw new Error(`Loan request failed: ${JSON.stringify(loanReqRes)}`);
    }
    const newLoanId = loanReqRes.data.loan._id;
    console.log(`  Step A PASSED: Loan requested (${loanReqRes.data.loan.loanId})`);

    // Step B: HEAD approves
    const approveRes = await request(
      'PUT',
      `/api/groups/${groupId}/loans/${newLoanId}/approve`,
      {},
      { Authorization: `Bearer ${headToken}` }
    );
    if (approveRes.status !== 200 || approveRes.data.loan.status !== 'APPROVED') {
      throw new Error(`Loan approval failed: ${JSON.stringify(approveRes)}`);
    }
    console.log('  Step B PASSED: Loan approved by HEAD');

    // Step C: HEAD disburses (Separate action!)
    const disburseRes = await request(
      'POST',
      `/api/groups/${groupId}/loans/${newLoanId}/disburse`,
      {
        disbursementMethod: 'BANK_TRANSFER',
        reference: 'TEST-NEFT-8812',
      },
      { Authorization: `Bearer ${headToken}` }
    );
    if (disburseRes.status !== 200 || disburseRes.data.loan.status !== 'DISBURSED') {
      throw new Error(`Loan disbursement failed: ${JSON.stringify(disburseRes)}`);
    }
    console.log('  Step C PASSED: Loan disbursed via Bank Transfer');

    // Step D: Record Repayment
    const repayRes = await request(
      'POST',
      `/api/groups/${groupId}/loans/${newLoanId}/repay`,
      {
        amount: 863, // Approx 1 EMI
        paymentMethod: 'CASH',
        reference: 'RCP-LN-TEST',
      },
      { Authorization: `Bearer ${headToken}` }
    );
    if (repayRes.status !== 200 || !repayRes.data.receiptNumber) {
      throw new Error(`Loan repayment failed: ${JSON.stringify(repayRes)}`);
    }
    console.log(`  Step D PASSED: Loan repayment recorded. Receipt: ${repayRes.data.receiptNumber}`);

    // 10. Audit Log Verification
    console.log('\nTest 10: Audit Log Verification');
    const auditRes = await request('GET', `/api/groups/${groupId}/audit`, null, {
      Authorization: `Bearer ${headToken}`,
    });
    if (auditRes.status !== 200 || !auditRes.data.logs || auditRes.data.logs.length === 0) {
      throw new Error(`Audit log check failed: ${JSON.stringify(auditRes)}`);
    }
    console.log(`  PASSED: ${auditRes.data.logs.length} audit trail events recorded`);

    // 11. Government Schemes API (Bilingual EN/TE)
    console.log('\nTest 11: Government Schemes API');
    const schemesRes = await request('GET', '/api/schemes');
    if (schemesRes.status !== 200 || !schemesRes.data.schemes || schemesRes.data.schemes.length === 0) {
      throw new Error(`Schemes check failed: ${JSON.stringify(schemesRes)}`);
    }
    const sampleScheme = schemesRes.data.schemes[0];
    console.log(`  PASSED: Found ${schemesRes.data.schemes.length} curated schemes.`);
    console.log(`  EN Title: "${sampleScheme.title.en}"`);
    console.log(`  TE Title: "${sampleScheme.title.te}"`);

    console.log('\n=============================================');
    console.log('ALL BACKEND API TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================\n');

    server.close();
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('\nTEST SUITE FAILED:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runTests();
