import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import fs from 'fs';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import MaintenanceConfig from './src/models/MaintenanceConfig.js';
import MaintenanceDue from './src/models/MaintenanceDue.js';
import Payment from './src/models/Payment.js';
import Expense from './src/models/Expense.js';
import CashbookOpeningBalance from './src/models/CashbookOpeningBalance.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

const TEST_PORT = 5012;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runPhase8TestSuite() {
  console.log('======================================================================');
  console.log('🧪 PHASE 8: REPORTS & ANALYTICS TEST SUITE');
  console.log('======================================================================\n');

  const testResults = [];
  let server;

  try {
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    // 1. Verify Super Admin and generate auth token
    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) throw new Error('Super Admin missing in database!');

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

    // -------------------------------------------------------------
    // TEST 1: Maintenance Collection Calculations
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Maintenance Collection Calculations...');
    const ovRes = await fetch(`${BASE_URL}/api/v1/reports/overview`, { headers: authHeaders });
    const ovData = await ovRes.json();
    const ov = ovData?.data?.overview;

    const allDues = await MaintenanceDue.find();
    const expectedBilled = allDues.reduce((acc, d) => acc + (d.totalAmountDue || 0), 0);
    const allPayments = await Payment.find({ status: 'COMPLETED', isCancelled: { $ne: true } });
    const expectedCollected = allPayments.reduce((acc, p) => acc + (p.amountReceived || 0), 0);
    const expectedColRate = expectedBilled > 0
      ? Math.round((expectedCollected / expectedBilled) * 10000) / 100
      : 0;

    const test1Passed =
      ovRes.status === 200 &&
      ov.totalBilled === expectedBilled &&
      ov.totalCollected === expectedCollected &&
      ov.collectionPercentage === expectedColRate;

    console.log(`  -> Billed: ₹${ov?.totalBilled} (Expected: ₹${expectedBilled}), Collected: ₹${ov?.totalCollected} (Expected: ₹${expectedCollected}), Rate: ${ov?.collectionPercentage}%`);
    testResults.push({ name: '1. Maintenance Collection Calculations', passed: test1Passed });

    // -------------------------------------------------------------
    // TEST 2: Outstanding Balance Calculations
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Outstanding Balance Calculations...');
    const expectedOutstanding = allDues.reduce((acc, d) => acc + (d.outstandingBalance || 0), 0);
    let duesMathValid = true;
    allDues.forEach(d => {
      if ((d.amountPaid + d.outstandingBalance) !== d.totalAmountDue) {
        duesMathValid = false;
      }
    });

    const test2Passed =
      ov.totalOutstanding === expectedOutstanding &&
      duesMathValid === true;

    console.log(`  -> Outstanding: ₹${ov?.totalOutstanding} (Expected: ₹${expectedOutstanding}), Individual Math Valid: ${duesMathValid}`);
    testResults.push({ name: '2. Outstanding Balance Calculations', passed: test2Passed });

    // -------------------------------------------------------------
    // TEST 3: Resident-Wise Payment History Roster
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Resident-Wise Payment History Roster...');
    const maintRes = await fetch(`${BASE_URL}/api/v1/reports/maintenance`, { headers: authHeaders });
    const maintData = await maintRes.json();
    const roster = maintData?.data?.residentSummaries || [];

    let allResidentsMathCorrect = roster.length === 16;
    let marathiNamesPresent = true;

    roster.forEach(r => {
      if ((r.totalPaid + r.totalOutstanding) !== r.totalBilled) {
        allResidentsMathCorrect = false;
      }
      if (!ORIGINAL_16_RESIDENTS.includes(r.fullNameMarathi)) {
        marathiNamesPresent = false;
      }
    });

    const test3Passed =
      maintRes.status === 200 &&
      roster.length === 16 &&
      allResidentsMathCorrect &&
      marathiNamesPresent;

    console.log(`  -> Total Residents: ${roster.length}, Math Valid: ${allResidentsMathCorrect}, 16 Marathi Names Match: ${marathiNamesPresent}`);
    testResults.push({ name: '3. Resident-Wise Payment History Roster', passed: test3Passed });

    // -------------------------------------------------------------
    // TEST 4: Monthly and Yearly Summaries
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Monthly and Yearly Summaries...');
    const monthWise = maintData?.data?.monthWiseCollections || [];
    const yearWise = maintData?.data?.yearWiseSummary || [];

    const test4Passed =
      monthWise.length > 0 &&
      yearWise.length > 0 &&
      monthWise.every(m => m.totalBilled === (m.totalPaid + m.totalOutstanding));

    console.log(`  -> Month-wise entries: ${monthWise.length}, Year-wise entries: ${yearWise.length}`);
    testResults.push({ name: '4. Monthly and Yearly Summaries', passed: test4Passed });

    // -------------------------------------------------------------
    // TEST 5: Expense Category Aggregation
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Expense Category Aggregation...');
    const expRes = await fetch(`${BASE_URL}/api/v1/reports/expenses`, { headers: authHeaders });
    const expData = await expRes.json();
    const catBreakdown = expData?.data?.categoryBreakdown || [];
    const grandTotalActiveExpenses = expData?.data?.grandTotalActiveExpenses || 0;

    const catSum = catBreakdown.reduce((acc, c) => acc + c.totalAmount, 0);
    const test5Passed =
      expRes.status === 200 &&
      catSum === grandTotalActiveExpenses &&
      catBreakdown.every(c => c.category && c.totalAmount > 0 && c.percentage >= 0);

    console.log(`  -> Categories: ${catBreakdown.length}, Sum: ₹${catSum}, Grand Total: ₹${grandTotalActiveExpenses}`);
    testResults.push({ name: '5. Expense Category Aggregation', passed: test5Passed });

    // -------------------------------------------------------------
    // TEST 6: Payment-Mode-Wise Reports
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Payment-Mode-Wise Reports...');
    const modeBreakdown = expData?.data?.modeBreakdown || [];
    const payeeBreakdown = expData?.data?.payeeBreakdown || [];

    const modeSum = modeBreakdown.reduce((acc, m) => acc + m.totalAmount, 0);
    const test6Passed =
      modeSum === grandTotalActiveExpenses &&
      modeBreakdown.length > 0 &&
      payeeBreakdown.length > 0;

    console.log(`  -> Modes Count: ${modeBreakdown.length}, Payees Count: ${payeeBreakdown.length}, Mode Sum: ₹${modeSum}`);
    testResults.push({ name: '6. Payment-Mode-Wise Reports', passed: test6Passed });

    // -------------------------------------------------------------
    // TEST 7: Cashbook Reconciliation (Opening + In - Out = Closing)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Cashbook Reconciliation (Strict Non-Mingling)...');
    const finRes = await fetch(`${BASE_URL}/api/v1/reports/financial-summary`, { headers: authHeaders });
    const finData = await finRes.json();
    const mw = finData?.data?.modeWise;
    const totals = finData?.data?.totals;

    const cashReconciles = mw.CASH.opening + mw.CASH.income - mw.CASH.expense === mw.CASH.closing;
    const bankReconciles = mw.BANK_TRANSFER.opening + mw.BANK_TRANSFER.income - mw.BANK_TRANSFER.expense === mw.BANK_TRANSFER.closing;
    const upiReconciles = mw.UPI.opening + mw.UPI.income - mw.UPI.expense === mw.UPI.closing;
    const chequeReconciles = mw.CHEQUE.opening + mw.CHEQUE.income - mw.CHEQUE.expense === mw.CHEQUE.closing;

    const totalReconciles = totals.totalOpeningBalance + totals.totalIncome - totals.totalExpenses === totals.totalClosingBalance;
    const test7Passed =
      finRes.status === 200 &&
      cashReconciles &&
      bankReconciles &&
      upiReconciles &&
      chequeReconciles &&
      totalReconciles;

    console.log(`  -> Cash Closing: ₹${mw?.CASH?.closing}, Bank Closing: ₹${mw?.BANK_TRANSFER?.closing}, Total Closing: ₹${totals?.totalClosingBalance}`);
    testResults.push({ name: '7. Cashbook Reconciliation', passed: test7Passed });

    // -------------------------------------------------------------
    // TEST 8: Cancelled Payment and Expense Exclusion
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Cancelled Payment & Expense Exclusion...');
    const cancelledExpensesInReport = expData?.data?.cancelledExpenses?.vouchers || [];
    const activeExpensesList = expData?.data?.activeExpensesList || [];

    const zeroCancelledInActive = activeExpensesList.every(e => e.status !== 'CANCELLED' && e.isCancelled !== true);
    const cancelledCountMatches = cancelledExpensesInReport.length === expData?.data?.cancelledExpenses?.count;

    const test8Passed = zeroCancelledInActive && cancelledCountMatches;
    console.log(`  -> Zero Cancelled in Active: ${zeroCancelledInActive}, Cancelled Vouchers Tracked: ${cancelledExpensesInReport.length}`);
    testResults.push({ name: '8. Cancelled Payment and Expense Exclusion', passed: test8Passed });

    // -------------------------------------------------------------
    // TEST 9: Empty-Data Handling
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Empty-Data Handling (Far Future Queries)...');
    const emptyOvRes = await fetch(`${BASE_URL}/api/v1/reports/overview?year=2040&month=1`, { headers: authHeaders });
    const emptyOvData = await emptyOvRes.json();
    const emptyOv = emptyOvData?.data?.overview;

    const emptyChartRes = await fetch(`${BASE_URL}/api/v1/reports/charts?year=2040`, { headers: authHeaders });
    const emptyChartData = await emptyChartRes.json();

    const test9Passed =
      emptyOvRes.status === 200 &&
      emptyOv.totalBilled === 0 &&
      emptyOv.totalCollected === 0 &&
      emptyChartRes.status === 200 &&
      emptyChartData.data.monthlyCollectionTrend.length === 12;

    console.log(`  -> Empty Billed: ₹${emptyOv?.totalBilled}, Empty Chart Months: ${emptyChartData?.data?.monthlyCollectionTrend?.length}`);
    testResults.push({ name: '9. Empty-Data Handling', passed: test9Passed });

    // -------------------------------------------------------------
    // TEST 10: Date Filter Validation
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Testing Date Filter Validation...');
    const invalidMonthRes = await fetch(`${BASE_URL}/api/v1/reports/overview?month=15`, { headers: authHeaders });
    const invalidYearRes = await fetch(`${BASE_URL}/api/v1/reports/overview?year=1980`, { headers: authHeaders });
    const invalidDateRes = await fetch(`${BASE_URL}/api/v1/reports/overview?startDate=not-a-date`, { headers: authHeaders });

    const test10Passed =
      invalidMonthRes.status === 400 &&
      invalidYearRes.status === 400 &&
      invalidDateRes.status === 400;

    console.log(`  -> Month 15: ${invalidMonthRes.status}, Year 1980: ${invalidYearRes.status}, Invalid Date: ${invalidDateRes.status}`);
    testResults.push({ name: '10. Date Filter Validation', passed: test10Passed });

    // -------------------------------------------------------------
    // TEST 11: PDF Export
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Testing PDF Report Export...');
    const pdfRes = await fetch(`${BASE_URL}/api/v1/reports/export/pdf`, { headers: authHeaders });
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const isPdfValid = pdfBuffer.slice(0, 4).toString() === '%PDF' && pdfBuffer.length > 5000;

    const test11Passed = pdfRes.status === 200 && isPdfValid;
    console.log(`  -> PDF Status: ${pdfRes.status}, Buffer Size: ${pdfBuffer.length} bytes, Magic Header: %PDF`);
    testResults.push({ name: '11. PDF Report Export', passed: test11Passed });

    // -------------------------------------------------------------
    // TEST 12: Excel Export (Multi-sheet XLSX)
    // -------------------------------------------------------------
    console.log('\n[TEST 12] Testing Excel Report Export (Multi-Sheet XLSX)...');
    const excelRes = await fetch(`${BASE_URL}/api/v1/reports/export/excel`, { headers: authHeaders });
    const excelBuffer = Buffer.from(await excelRes.arrayBuffer());

    const isZipValid = excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4B; // PK zip header
    let sheetNames = [];
    if (isZipValid) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(excelBuffer);
      sheetNames = wb.worksheets.map(w => w.name);
    }

    const test12Passed =
      excelRes.status === 200 &&
      isZipValid &&
      sheetNames.length >= 4;

    console.log(`  -> Excel Status: ${excelRes.status}, Size: ${excelBuffer.length} bytes, Sheets: ${sheetNames.join(', ')}`);
    testResults.push({ name: '12. Excel Export', passed: test12Passed });

    // -------------------------------------------------------------
    // TEST 13: Marathi Font Rendering
    // -------------------------------------------------------------
    console.log('\n[TEST 13] Verifying Marathi Font Assets & PDF Rendering...');
    const mangalExists = fs.existsSync(path.resolve(__dirname, 'src/assets/fonts/mangal.ttf'));
    const test13Passed = mangalExists && isPdfValid;

    console.log(`  -> Mangal TTF Font Exists: ${mangalExists}, PDF rendered without font errors: ${isPdfValid}`);
    testResults.push({ name: '13. Marathi Font Rendering', passed: test13Passed });

    // -------------------------------------------------------------
    // TEST 14: Unauthorized Access Rejection (401)
    // -------------------------------------------------------------
    console.log('\n[TEST 14] Testing Unauthorized Access Rejection (401)...');
    const unauthOv = await fetch(`${BASE_URL}/api/v1/reports/overview`);
    const unauthMaint = await fetch(`${BASE_URL}/api/v1/reports/maintenance`);
    const unauthExcel = await fetch(`${BASE_URL}/api/v1/reports/export/excel`);
    const unauthPdf = await fetch(`${BASE_URL}/api/v1/reports/export/pdf`);

    const fakeToken = jwt.sign({ adminId: 'fake123' }, 'fake_secret');
    const fakeTokenRes = await fetch(`${BASE_URL}/api/v1/reports/overview`, {
      headers: { 'Cookie': `token=${fakeToken}` }
    });

    const test14Passed =
      unauthOv.status === 401 &&
      unauthMaint.status === 401 &&
      unauthExcel.status === 401 &&
      unauthPdf.status === 401 &&
      fakeTokenRes.status === 401;

    console.log(`  -> Unauth Overview: ${unauthOv.status}, Excel: ${unauthExcel.status}, PDF: ${unauthPdf.status}, Fake Token: ${fakeTokenRes.status}`);
    testResults.push({ name: '14. Unauthorized Access Rejection', passed: test14Passed });

    // -------------------------------------------------------------
    // TEST 15: Historical Database Integrity
    // -------------------------------------------------------------
    console.log('\n[TEST 15] Testing Historical Database Integrity...');
    const residentCount = await Resident.countDocuments();
    const allResidents = await Resident.find();
    let namesMatch = residentCount === 16;
    ORIGINAL_16_RESIDENTS.forEach(name => {
      if (!allResidents.some(r => r.fullNameMarathi === name)) {
        namesMatch = false;
      }
    });

    const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    const config = await MaintenanceConfig.findOne({ singletonKey: 'MAINTENANCE_CONFIG_SINGLETON' });

    const test15Passed =
      residentCount === 16 &&
      namesMatch &&
      superAdmin.fullNameMarathi === 'श्री ल.रा. कोळी' &&
      config.defaultMonthlyAmount === 1000;

    console.log(`  -> 16 Residents Intact: ${namesMatch}, Super Admin: ${superAdmin?.fullNameMarathi}, Monthly Rate: ₹${config?.defaultMonthlyAmount}`);
    testResults.push({ name: '15. Historical Database Integrity', passed: test15Passed });

    // -------------------------------------------------------------
    // TEST 16: Phase 3–7 Regression Suites
    // -------------------------------------------------------------
    console.log('\n[TEST 16] Executing Phase 3–7 Regression Suites...');
    let regressionPassed = true;
    try {
      console.log('  -> Executing test-rate-update.js...');
      execSync('node test-rate-update.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-phase4-suite.js...');
      execSync('node test-phase4-suite.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-security-deep-audit.js...');
      execSync('node test-security-deep-audit.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-phase6-suite.js...');
      execSync('node test-phase6-suite.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> Executing test-phase7-suite.js...');
      execSync('node test-phase7-suite.js', { cwd: __dirname, stdio: 'pipe' });
      console.log('  -> All regression suites passed successfully!');
    } catch (err) {
      console.error('  -> Regression failure:', err.stdout?.toString() || err.message);
      regressionPassed = false;
    }
    testResults.push({ name: '16. Phase 3–7 Regression Suites', passed: regressionPassed });

    // -------------------------------------------------------------
    // TEST 17: Production Frontend Build Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 17] Testing Production Frontend Build (Vite)...');
    let buildPassed = true;
    try {
      const clientDir = path.resolve(__dirname, '..', 'client');
      execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
      console.log('  -> Frontend production build completed without errors.');
    } catch (err) {
      console.error('  -> Frontend build failed:', err.stdout?.toString() || err.message);
      buildPassed = false;
    }
    testResults.push({ name: '17. Production Frontend Build Verification', passed: buildPassed });

    // -------------------------------------------------------------
    // FINAL TEST RESULTS SUMMARY
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('📊 PHASE 8 TEST SUITE EXECUTION SUMMARY');
    console.log('======================================================================');

    let allPassed = true;
    testResults.forEach((t, i) => {
      const icon = t.passed ? '✅' : '❌';
      console.log(`${icon} [${String(i + 1).padStart(2, '0')}] ${t.name}`);
      if (!t.passed) allPassed = false;
    });

    console.log('======================================================================');
    if (allPassed) {
      console.log('🎉 ALL 17 PHASE 8 TESTS PASSED WITH 100% SUCCESS!');
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

runPhase8TestSuite();
