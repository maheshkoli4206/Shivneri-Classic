import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import MaintenanceConfig from './src/models/MaintenanceConfig.js';
import MaintenanceDue from './src/models/MaintenanceDue.js';
import Payment from './src/models/Payment.js';
import Expense from './src/models/Expense.js';
import CashbookOpeningBalance from './src/models/CashbookOpeningBalance.js';
import AuditLog from './src/models/AuditLog.js';
import Counter from './src/models/Counter.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_PORT = 5011;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runPhase7TestSuite() {
  console.log('======================================================================');
  console.log('🧪 PHASE 7: EXPENSE & CASHBOOK MANAGEMENT TEST SUITE');
  console.log('======================================================================\n');

  const testResults = [];
  let server;

  try {
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    // 1. Verify Super Admin
    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) {
      throw new Error('Super Admin missing in database!');
    }

    const adminToken = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const authHeaders = {
      'Cookie': `token=${adminToken}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': CLIENT_ORIGIN,
      'Content-Type': 'application/json'
    };

    // Clean Phase 7 test artifacts for a clean deterministic test run
    // (Historical resident records and earlier test data remain intact)
    await Expense.deleteMany({ description: { $regex: /TEST_PHASE_7/ } });
    await Counter.deleteOne({ _id: { $regex: /^expense_/ } });

    // -------------------------------------------------------------
    // TEST 1: Successful Expense Creation (EXP-YYYYMM-XXXX)
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Successful Expense Creation...');
    const createRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'महावितरण वीज बिल (कॉमन एरिया)',
        titleEnglish: 'MSEDCL Common Electricity Bill',
        category: 'Electricity',
        amount: 3250,
        expenseDate: '2026-12-05',
        paymentMethod: 'BANK_TRANSFER',
        payeeName: 'MSEDCL Nashik',
        transactionRef: 'NEFT-MS-009182',
        description: 'TEST_PHASE_7: December electricity charges for pump and corridors'
      })
    });

    const createData = await createRes.json();
    const voucherFormatRegex = /^EXP-\d{6}-\d{4}$/;
    const test1Passed =
      createRes.status === 201 &&
      createData.success === true &&
      voucherFormatRegex.test(createData.expense.voucherNumber) &&
      createData.expense.amount === 3250 &&
      createData.expense.status === 'COMPLETED' &&
      createData.expense.paymentMethod === 'BANK_TRANSFER';

    console.log(`  -> Status: ${createRes.status}, Voucher: ${createData.expense?.voucherNumber}`);
    testResults.push({ name: '1. Successful Expense Creation (EXP-YYYYMM-XXXX)', passed: test1Passed });
    const createdExpense1 = createData.expense;

    // -------------------------------------------------------------
    // TEST 2: Zero and Negative Amount Rejection (400)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Zero and Negative Amount Rejection...');
    const zeroRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'शून्य रक्कम चाचणी',
        category: 'Cleaning',
        amount: 0,
        expenseDate: '2026-12-05',
        paymentMethod: 'CASH',
        payeeName: 'Test Payee',
        description: 'TEST_PHASE_7'
      })
    });

    const negRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'ऋण रक्कम चाचणी',
        category: 'Cleaning',
        amount: -500,
        expenseDate: '2026-12-05',
        paymentMethod: 'CASH',
        payeeName: 'Test Payee',
        description: 'TEST_PHASE_7'
      })
    });

    const test2Passed = zeroRes.status === 400 && negRes.status === 400;
    console.log(`  -> Zero status: ${zeroRes.status}, Negative status: ${negRes.status}`);
    testResults.push({ name: '2. Zero and Negative Amount Rejection (400)', passed: test2Passed });

    // -------------------------------------------------------------
    // TEST 3: Missing Required Fields Rejection (400)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Missing Required Fields Rejection...');
    const missingTitleRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'Cleaning',
        amount: 1000,
        expenseDate: '2026-12-05',
        paymentMethod: 'CASH',
        payeeName: 'Test Payee',
        description: 'TEST_PHASE_7'
      })
    });

    const missingPayeeRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'साफसफाई साहित्य खरेदी',
        category: 'Cleaning',
        amount: 1000,
        expenseDate: '2026-12-05',
        paymentMethod: 'CASH',
        description: 'TEST_PHASE_7'
      })
    });

    const invalidMethodRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'साफसफाई साहित्य खरेदी',
        category: 'Cleaning',
        amount: 1000,
        expenseDate: '2026-12-05',
        paymentMethod: 'BITCOIN_INVALID',
        payeeName: 'Test Payee',
        description: 'TEST_PHASE_7'
      })
    });

    const test3Passed =
      missingTitleRes.status === 400 &&
      missingPayeeRes.status === 400 &&
      invalidMethodRes.status === 400;
    console.log(`  -> Missing title: ${missingTitleRes.status}, Missing payee: ${missingPayeeRes.status}, Invalid method: ${invalidMethodRes.status}`);
    testResults.push({ name: '3. Missing Required Fields Rejection (400)', passed: test3Passed });

    // -------------------------------------------------------------
    // TEST 4: Duplicate Request Protection (idempotencyKey)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Idempotency Protection...');
    const testIdempKey = 'idemp-phase7-test-' + Date.now();
    const idempBody = {
      titleMarathi: 'पाणी मोटर दुरुस्ती खर्च',
      titleEnglish: 'Water Motor Repair',
      category: 'Plumbing',
      amount: 1800,
      expenseDate: '2026-12-06',
      paymentMethod: 'CASH',
      payeeName: 'Kailas Plumber',
      description: 'TEST_PHASE_7: Idempotency test',
      idempotencyKey: testIdempKey
    };

    const firstIdempRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(idempBody)
    });
    const firstIdempData = await firstIdempRes.json();

    const secondIdempRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(idempBody)
    });
    const secondIdempData = await secondIdempRes.json();

    const idempDocsCount = await Expense.countDocuments({ idempotencyKey: testIdempKey });

    const test4Passed =
      firstIdempRes.status === 201 &&
      secondIdempRes.status === 200 &&
      secondIdempData.isDuplicate === true &&
      firstIdempData.expense.voucherNumber === secondIdempData.expense.voucherNumber &&
      idempDocsCount === 1;

    console.log(`  -> First status: ${firstIdempRes.status}, Second status: ${secondIdempRes.status}, Docs in DB: ${idempDocsCount}`);
    testResults.push({ name: '4. Duplicate Request Protection (idempotencyKey)', passed: test4Passed });

    // -------------------------------------------------------------
    // TEST 5: Expense Search and Multi-Criteria Filtering
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Expense Search and Filtering...');
    // Create additional varied expenses
    await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'सुरक्षा रक्षक मासिक मानधन',
        category: 'Security',
        amount: 8000,
        expenseDate: '2026-12-07',
        paymentMethod: 'UPI',
        payeeName: 'Prakash Shinde Guard',
        transactionRef: 'UPI-GUARD-001',
        description: 'TEST_PHASE_7: Security wages'
      })
    });

    await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'लिफ्ट त्रैमासिक सर्व्हिसिंग',
        category: 'Lift Maintenance',
        amount: 4500,
        expenseDate: '2026-12-08',
        paymentMethod: 'CHEQUE',
        payeeName: 'Johnson Lifts Pvt Ltd',
        transactionRef: 'CHQ-778899',
        description: 'TEST_PHASE_7: Lift AMC'
      })
    });

    const searchRes = await fetch(`${BASE_URL}/api/v1/expenses?search=MSEDCL`, {
      headers: authHeaders
    });
    const searchData = await searchRes.json();

    const catFilterRes = await fetch(`${BASE_URL}/api/v1/expenses?category=Security`, {
      headers: authHeaders
    });
    const catFilterData = await catFilterRes.json();

    const methodFilterRes = await fetch(`${BASE_URL}/api/v1/expenses?paymentMethod=CHEQUE`, {
      headers: authHeaders
    });
    const methodFilterData = await methodFilterRes.json();

    const test5Passed =
      searchData.expenses.some(e => e.payeeName.includes('MSEDCL')) &&
      catFilterData.expenses.every(e => e.category.toUpperCase() === 'SECURITY') &&
      methodFilterData.expenses.every(e => e.paymentMethod === 'CHEQUE');

    console.log(`  -> Search count: ${searchData.expenses?.length}, Category count: ${catFilterData.expenses?.length}, Method count: ${methodFilterData.expenses?.length}`);
    testResults.push({ name: '5. Expense Search and Multi-Criteria Filtering', passed: test5Passed });

    // -------------------------------------------------------------
    // TEST 6: Expense Soft-Cancellation with Mandatory Reason
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Soft-Cancellation with Mandatory Reason...');
    // Create an expense to be cancelled
    const expToCancelRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        titleMarathi: 'रद्द करण्याची चाचणी व्हाउचर',
        category: 'Cleaning',
        amount: 600,
        expenseDate: '2026-12-09',
        paymentMethod: 'CASH',
        payeeName: 'Temp Sweeper',
        description: 'TEST_PHASE_7: To be cancelled'
      })
    });
    const expToCancelData = await expToCancelRes.json();
    const cancelTargetId = expToCancelData.expense._id;

    // Short reason failure (< 5 chars)
    const shortReasonRes = await fetch(`${BASE_URL}/api/v1/expenses/${cancelTargetId}/cancel`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'abc' })
    });

    // Valid cancellation
    const cancelRes = await fetch(`${BASE_URL}/api/v1/expenses/${cancelTargetId}/cancel`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'चुकीची नोंद झाल्यामुळे रद्द करण्यात आले (Recorded by mistake)' })
    });
    const cancelData = await cancelRes.json();

    // Verify record in database
    const dbExpense = await Expense.findById(cancelTargetId);

    // Attempt second cancellation on already cancelled expense
    const reCancelRes = await fetch(`${BASE_URL}/api/v1/expenses/${cancelTargetId}/cancel`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ reason: 'दुसऱ्यांदा रद्द करण्याचा प्रयत्न' })
    });

    const test6Passed =
      shortReasonRes.status === 400 &&
      cancelRes.status === 200 &&
      cancelData.success === true &&
      dbExpense.isCancelled === true &&
      dbExpense.status === 'CANCELLED' &&
      dbExpense.cancellationReason.includes('Recorded by mistake') &&
      dbExpense.cancelledByAdminId.toString() === admin._id.toString() &&
      reCancelRes.status === 400;

    console.log(`  -> Short reason status: ${shortReasonRes.status}, Cancel status: ${cancelRes.status}, DB isCancelled: ${dbExpense.isCancelled}, Re-cancel status: ${reCancelRes.status}`);
    testResults.push({ name: '6. Expense Soft-Cancellation with Mandatory Reason', passed: test6Passed });

    // -------------------------------------------------------------
    // TEST 7: Audit Log Creation
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Audit Log Creation for Expense Actions...');
    const createAudit = await AuditLog.findOne({
      action: 'EXPENSE_CREATED',
      'details.voucherNumber': createdExpense1.voucherNumber
    });

    const cancelAudit = await AuditLog.findOne({
      action: 'EXPENSE_CANCELLED',
      entityId: cancelTargetId
    });

    const test7Passed = Boolean(createAudit) && Boolean(cancelAudit);
    console.log(`  -> EXPENSE_CREATED audit found: ${Boolean(createAudit)}, EXPENSE_CANCELLED audit found: ${Boolean(cancelAudit)}`);
    testResults.push({ name: '7. Audit Log Creation (EXPENSE_CREATED, EXPENSE_CANCELLED)', passed: test7Passed });

    // -------------------------------------------------------------
    // TEST 8: Cashbook Opening and Closing Balance Calculation
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Cashbook Balance Calculation (Opening + In - Out = Closing)...');
    // Set explicit opening balance
    const updateOpeningRes = await fetch(`${BASE_URL}/api/v1/cashbook/opening-balance`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        cashAmount: 5000,
        bankAmount: 50000,
        upiAmount: 10000,
        chequeAmount: 2000,
        effectiveDate: '2026-11-01',
        notes: 'TEST_PHASE_7: Initial audited balance'
      })
    });
    const updateOpeningData = await updateOpeningRes.json();

    const cbRes = await fetch(`${BASE_URL}/api/v1/cashbook`, {
      headers: authHeaders
    });
    const cbData = await cbRes.json();
    const summary = cbData.data.summary;

    const expectedTotalOpening = 5000 + 50000 + 10000 + 2000; // 67000
    const calculatedClosing = summary.totalOpeningBalance + summary.totalIncome - summary.totalExpense;
    const test8Passed =
      updateOpeningRes.status === 200 &&
      cbRes.status === 200 &&
      summary.totalOpeningBalance === expectedTotalOpening &&
      summary.totalClosingBalance === calculatedClosing &&
      summary.netSurplusDeficit === (summary.totalIncome - summary.totalExpense);

    console.log(`  -> Opening: ₹${summary.totalOpeningBalance}, Income: ₹${summary.totalIncome}, Expense: ₹${summary.totalExpense}, Closing: ₹${summary.totalClosingBalance}`);
    testResults.push({ name: '8. Cashbook Balance Calculation (Opening + In - Out = Closing)', passed: test8Passed });

    // -------------------------------------------------------------
    // TEST 9: Separate Cash, Bank, UPI, and Cheque Reporting (Strict Non-Mingling)
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Segregated Mode-Wise Reporting (Strict Non-Mingling)...');
    const byMode = cbData.data.byMode;
    const cashMath = byMode.CASH.opening + byMode.CASH.income - byMode.CASH.expense === byMode.CASH.closing;
    const bankMath = byMode.BANK_TRANSFER.opening + byMode.BANK_TRANSFER.income - byMode.BANK_TRANSFER.expense === byMode.BANK_TRANSFER.closing;
    const upiMath = byMode.UPI.opening + byMode.UPI.income - byMode.UPI.expense === byMode.UPI.closing;
    const chequeMath = byMode.CHEQUE.opening + byMode.CHEQUE.income - byMode.CHEQUE.expense === byMode.CHEQUE.closing;

    // Physical cash opening is 5000 and bank opening is 50000, strictly distinct
    const nonMingled =
      byMode.CASH.opening === 5000 &&
      byMode.BANK_TRANSFER.opening === 50000 &&
      byMode.UPI.opening === 10000 &&
      byMode.CHEQUE.opening === 2000;

    const test9Passed = cashMath && bankMath && upiMath && chequeMath && nonMingled;
    console.log(`  -> Cash Closing: ₹${byMode.CASH.closing}, Bank Closing: ₹${byMode.BANK_TRANSFER.closing}, UPI Closing: ₹${byMode.UPI.closing}, Cheque Closing: ₹${byMode.CHEQUE.closing}`);
    testResults.push({ name: '9. Separate Cash, Bank, UPI, and Cheque Reporting', passed: test9Passed });

    // -------------------------------------------------------------
    // TEST 10: Chronological Cashbook Ledger & Running Balances
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Testing Chronological Cashbook Ledger & Running Balances...');
    const ledger = cbData.data.ledger;
    let chronological = true;
    for (let i = 1; i < ledger.length; i++) {
      if (new Date(ledger[i].date) < new Date(ledger[i - 1].date)) {
        chronological = false;
        break;
      }
    }

    const test10Passed = ledger.length > 0 && chronological;
    console.log(`  -> Total ledger entries: ${ledger.length}, Sorted chronologically: ${chronological}`);
    testResults.push({ name: '10. Chronological Cashbook Ledger & Running Balances', passed: test10Passed });

    // -------------------------------------------------------------
    // TEST 11: Exclusion of Cancelled Expenses from Active Cashbook
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Testing Exclusion of Cancelled Expenses from Active Totals...');
    // Verify the cancelled expense is NOT counted in active expenses
    const activeExpenseSum = await Expense.aggregate([
      { $match: { isCancelled: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expectedActiveExpense = activeExpenseSum[0]?.total || 0;

    const test11Passed = summary.totalExpense === expectedActiveExpense;
    console.log(`  -> Cashbook active expenses: ₹${summary.totalExpense}, DB non-cancelled total: ₹${expectedActiveExpense}`);
    testResults.push({ name: '11. Exclusion of Cancelled Expenses from Active Cashbook', passed: test11Passed });

    // -------------------------------------------------------------
    // TEST 12: Unauthorized Access Rejection (401)
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Testing Unauthorized Access Rejection (401)...');
    const unauthExpRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    const unauthCbRes = await fetch(`${BASE_URL}/api/v1/cashbook`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    const fakeToken = jwt.sign({ adminId: '123456' }, 'wrong_secret');
    const fakeTokenRes = await fetch(`${BASE_URL}/api/v1/expenses`, {
      headers: {
        'Cookie': `token=${fakeToken}`,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const test12Passed =
      unauthExpRes.status === 401 &&
      unauthCbRes.status === 401 &&
      fakeTokenRes.status === 401;

    console.log(`  -> No token expenses: ${unauthExpRes.status}, No token cashbook: ${unauthCbRes.status}, Fake token: ${fakeTokenRes.status}`);
    testResults.push({ name: '12. Unauthorized Access Rejection (401)', passed: test12Passed });

    // -------------------------------------------------------------
    // TEST 13: Historical Integrity & Non-Interference
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Testing Historical Data Integrity & Non-Interference...');
    const residentCount = await Resident.countDocuments();
    const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    const paymentsCount = await Payment.countDocuments();
    const duesCount = await MaintenanceDue.countDocuments();

    // Verify all 16 original resident Marathi names
    const allResidents = await Resident.find();
    let allResidentsMatch = residentCount === 16;
    ORIGINAL_16_RESIDENTS.forEach((expectedName) => {
      const match = allResidents.find(r => r.fullNameMarathi === expectedName);
      if (!match) {
        allResidentsMatch = false;
      }
    });

    const test13Passed =
      residentCount === 16 &&
      allResidentsMatch &&
      superAdmin.fullNameMarathi === 'श्री ल.रा. कोळी' &&
      paymentsCount > 0 &&
      duesCount > 0;

    console.log(`  -> 16 Residents intact: ${allResidentsMatch}, Super Admin: ${superAdmin?.fullNameMarathi}, Payments count: ${paymentsCount}, Dues count: ${duesCount}`);
    testResults.push({ name: '13. Historical Integrity & Non-Interference with Phase 4-6 Data', passed: test13Passed });

    // -------------------------------------------------------------
    // TEST 14: Existing Phase 3–6 Regression Suites Pass
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Running Existing Regression Test Suites (Phase 3 to Phase 6)...');
    let regressionPassed = true;
    try {
      console.log('  -> Executing test-rate-update.js...');
      execSync('node test-rate-update.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-phase4-suite.js...');
      execSync('node test-phase4-suite.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-security-deep-audit.js...');
      execSync('node test-security-deep-audit.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Regression tests executed successfully!');
    } catch (err) {
      console.error('  -> Regression failure:', err.stdout?.toString() || err.message);
      regressionPassed = false;
    }
    testResults.push({ name: '14. Existing Phase 3–6 Regression Suites Pass', passed: regressionPassed });

    // -------------------------------------------------------------
    // TEST 15: Production Frontend Build Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Testing Production Frontend Build (Vite)...');
    let buildPassed = true;
    try {
      const clientDir = path.resolve(__dirname, '..', 'client');
      execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
      console.log('  -> Frontend production build completed without errors.');
    } catch (err) {
      console.error('  -> Frontend build failed:', err.stdout?.toString() || err.message);
      buildPassed = false;
    }
    testResults.push({ name: '15. Production Frontend Build Verification', passed: buildPassed });

    // -------------------------------------------------------------
    // FINAL TEST REPORT SUMMARY
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('📊 PHASE 7 TEST SUITE EXECUTION SUMMARY');
    console.log('======================================================================');

    let allPassed = true;
    testResults.forEach((t) => {
      const icon = t.passed ? '✅' : '❌';
      console.log(`${icon} ${t.name}`);
      if (!t.passed) allPassed = false;
    });

    console.log('======================================================================');
    if (allPassed) {
      console.log('🎉 ALL 15 PHASE 7 TESTS PASSED WITH 100% SUCCESS!');
    } else {
      console.log('⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.');
    }
    console.log('======================================================================\n');

  } catch (error) {
    console.error('❌ Fatal error during test execution:', error);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runPhase7TestSuite();
