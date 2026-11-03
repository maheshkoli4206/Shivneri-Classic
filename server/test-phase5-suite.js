import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import MaintenanceConfig from './src/models/MaintenanceConfig.js';
import MaintenanceDue from './src/models/MaintenanceDue.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_PORT = 5006;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runPhase5TestSuite() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5: MONTHLY MAINTENANCE MANAGEMENT ENGINE TEST SUITE');
  console.log('======================================================================\n');

  const testResults = [];
  let server;

  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    // Verify Super Admin
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

    // Clean previous maintenance data for a fresh, verifiable test run
    await MaintenanceConfig.deleteMany({});
    await MaintenanceDue.deleteMany({});

    // -------------------------------------------------------------
    // TEST 1: Missing Configuration Blocks Generation
    // -------------------------------------------------------------
    console.log('[TEST 1] Verifying Missing Configuration Blocks Bill Generation...');
    const noConfigRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const noConfigData = await noConfigRes.json();
    const test1Pass =
      noConfigRes.status === 400 &&
      noConfigData.message.includes('मासिक देखभाल दर अद्याप सेट केलेला नाही');
    testResults.push({
      id: 1,
      name: 'Missing maintenance configuration strictly blocks bill generation with 400',
      status: test1Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${noConfigRes.status}, Message: ${noConfigData.message}`
    });
    console.log(`  -> Status: ${test1Pass ? 'PASS' : 'FAIL'} (${noConfigRes.status})`);

    // -------------------------------------------------------------
    // TEST 2: Maintenance Configuration Creation & Update
    // -------------------------------------------------------------
    console.log('[TEST 2] Verifying Maintenance Configuration Creation & Update...');
    const configRes = await fetch(`${BASE_URL}/api/v1/maintenance/config`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        defaultMonthlyAmount: 1500,
        dueDay: 10,
        lateFeeEnabled: false,
        lateFeeAmount: 0
      })
    });
    const configData = await configRes.json();
    const test2Pass =
      configRes.status === 200 &&
      configData.success &&
      configData.config?.defaultMonthlyAmount === 1500 &&
      configData.config?.isConfigured === true;
    testResults.push({
      id: 2,
      name: 'Maintenance configuration created & updated successfully',
      status: test2Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${configRes.status}, Monthly Fee: ₹${configData.config?.defaultMonthlyAmount}, isConfigured: ${configData.config?.isConfigured}`
    });
    console.log(`  -> Status: ${test2Pass ? 'PASS' : 'FAIL'} (Monthly Fee: ₹${configData.config?.defaultMonthlyAmount})`);

    // -------------------------------------------------------------
    // TEST 3: Active Residents Receive Monthly Bills
    // -------------------------------------------------------------
    console.log('[TEST 3] Generating Monthly Bills for Month 11/2026...');
    const genRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const genData = await genRes.json();
    const test3Pass =
      genRes.status === 200 &&
      genData.success &&
      genData.summary?.createdCount === 16;
    testResults.push({
      id: 3,
      name: 'Active residents receive newly generated monthly bills',
      status: test3Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${genRes.status}, Created count: ${genData.summary?.createdCount}`
    });
    console.log(`  -> Status: ${test3Pass ? 'PASS' : 'FAIL'} (Created: ${genData.summary?.createdCount})`);

    // -------------------------------------------------------------
    // TEST 4: Inactive Residents Do Not Receive New Bills
    // -------------------------------------------------------------
    console.log('[TEST 4] Verifying Inactive Residents are Skipped in Billing...');
    // Create temporary inactive resident
    const inactiveResident = await Resident.create({
      fullNameMarathi: 'श्री चाचणी निष्क्रिय सभासद',
      flatNumber: '888',
      status: 'INACTIVE'
    });
    // Generate for Month 12/2026
    const genMonth12Res = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 12, year: 2026 })
    });
    const inactiveBill = await MaintenanceDue.findOne({
      residentId: inactiveResident._id,
      month: 12,
      year: 2026
    });
    const test4Pass = inactiveBill === null;
    testResults.push({
      id: 4,
      name: 'Inactive residents do NOT receive new monthly bills',
      status: test4Pass ? 'PASS' : 'FAIL',
      evidence: `Bill for inactive resident: ${inactiveBill ? 'FOUND (FAIL)' : 'NULL (PASS)'}`
    });
    console.log(`  -> Status: ${test4Pass ? 'PASS' : 'FAIL'} (Inactive bill: ${inactiveBill ? 'FOUND' : 'NULL'})`);
    // Clean up temporary inactive resident and month 12 bills
    await Resident.findByIdAndDelete(inactiveResident._id);
    await MaintenanceDue.deleteMany({ month: 12, year: 2026 });

    // -------------------------------------------------------------
    // TEST 5: Exactly One Bill Per Resident/Month/Year
    // -------------------------------------------------------------
    console.log('[TEST 5] Verifying Exactly One Bill Per Resident for 11/2026...');
    const month11Bills = await MaintenanceDue.find({ month: 11, year: 2026 });
    const residentIds = month11Bills.map(b => b.residentId.toString());
    const uniqueResidentIds = new Set(residentIds);
    const test5Pass = month11Bills.length === 16 && uniqueResidentIds.size === 16;
    testResults.push({
      id: 5,
      name: 'Exactly one bill per resident per month/year (Compound uniqueness)',
      status: test5Pass ? 'PASS' : 'FAIL',
      evidence: `Total bills: ${month11Bills.length}, Unique resident IDs: ${uniqueResidentIds.size}`
    });
    console.log(`  -> Status: ${test5Pass ? 'PASS' : 'FAIL'} (Bills: ${month11Bills.length}, Unique IDs: ${uniqueResidentIds.size})`);

    // -------------------------------------------------------------
    // TEST 6: Repeated Generation Creates Zero Duplicates (Idempotency)
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Re-generation Idempotency for 11/2026...');
    const repeatRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const repeatData = await repeatRes.json();
    const countAfterRepeat = await MaintenanceDue.countDocuments({ month: 11, year: 2026 });
    const test6Pass =
      repeatRes.status === 200 &&
      repeatData.summary?.createdCount === 0 &&
      repeatData.summary?.alreadyExistingCount === 16 &&
      countAfterRepeat === 16;
    testResults.push({
      id: 6,
      name: 'Repeated generation creates zero duplicates (100% Idempotent)',
      status: test6Pass ? 'PASS' : 'FAIL',
      evidence: `Created: ${repeatData.summary?.createdCount}, Matched: ${repeatData.summary?.alreadyExistingCount}, Total DB count: ${countAfterRepeat}`
    });
    console.log(`  -> Status: ${test6Pass ? 'PASS' : 'FAIL'} (Created: ${repeatData.summary?.createdCount}, Total in DB: ${countAfterRepeat})`);

    // -------------------------------------------------------------
    // TEST 7: Concurrent Generation Cannot Create Duplicates (Race-Safe)
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing 10 Parallel Concurrent Generation Requests...');
    const concurrentPromises = [];
    for (let i = 0; i < 10; i++) {
      concurrentPromises.push(
        fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ month: 11, year: 2026 })
        })
      );
    }
    await Promise.all(concurrentPromises);
    const countAfterConcurrency = await MaintenanceDue.countDocuments({ month: 11, year: 2026 });
    const test7Pass = countAfterConcurrency === 16;
    testResults.push({
      id: 7,
      name: 'Concurrent generation requests cannot create duplicates',
      status: test7Pass ? 'PASS' : 'FAIL',
      evidence: `Bills count after 10 parallel generation calls: ${countAfterConcurrency}`
    });
    console.log(`  -> Status: ${test7Pass ? 'PASS' : 'FAIL'} (Count: ${countAfterConcurrency})`);

    // -------------------------------------------------------------
    // TEST 8: Existing Paid Amount is NEVER Overwritten
    // -------------------------------------------------------------
    console.log('[TEST 8] Verifying Existing Paid Amounts are Never Overwritten...');
    // Simulate a resident having paid partial amount
    const sampleBill = await MaintenanceDue.findOne({ month: 11, year: 2026 });
    sampleBill.amountPaid = 500;
    sampleBill.outstandingBalance = 1000;
    sampleBill.status = 'PARTIAL';
    await sampleBill.save();

    // Re-run generation for month 11
    await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 11, year: 2026 })
    });

    // Check sample bill again
    const sampleBillAfter = await MaintenanceDue.findById(sampleBill._id);
    const test8Pass =
      sampleBillAfter.amountPaid === 500 &&
      sampleBillAfter.outstandingBalance === 1000 &&
      sampleBillAfter.status === 'PARTIAL';
    testResults.push({
      id: 8,
      name: 'Existing paid amounts and partial status are NEVER overwritten',
      status: test8Pass ? 'PASS' : 'FAIL',
      evidence: `Paid: ₹${sampleBillAfter.amountPaid}, Outstanding: ₹${sampleBillAfter.outstandingBalance}, Status: ${sampleBillAfter.status}`
    });
    console.log(`  -> Status: ${test8Pass ? 'PASS' : 'FAIL'} (Paid: ₹${sampleBillAfter.amountPaid}, Status: ${sampleBillAfter.status})`);

    // Reset sample bill back to 0 paid
    sampleBill.amountPaid = 0;
    sampleBill.outstandingBalance = 1500;
    sampleBill.status = 'UNPAID';
    await sampleBill.save();

    // -------------------------------------------------------------
    // TEST 9: Initial Paid Amount is Strictly Zero
    // -------------------------------------------------------------
    console.log('[TEST 9] Verifying Initial Paid Amount is Zero for All Bills...');
    const nonZeroPaidCount = await MaintenanceDue.countDocuments({
      month: 11,
      year: 2026,
      amountPaid: { $gt: 0 }
    });
    const test9Pass = nonZeroPaidCount === 0;
    testResults.push({
      id: 9,
      name: 'Initial paid amount is strictly zero for all generated bills',
      status: test9Pass ? 'PASS' : 'FAIL',
      evidence: `Bills with amountPaid > 0: ${nonZeroPaidCount}`
    });
    console.log(`  -> Status: ${test9Pass ? 'PASS' : 'FAIL'} (Non-zero count: ${nonZeroPaidCount})`);

    // -------------------------------------------------------------
    // TEST 10: Outstanding Balance Calculation
    // -------------------------------------------------------------
    console.log('[TEST 10] Verifying Outstanding Balance Calculation (totalDue - amountPaid)...');
    const allBills = await MaintenanceDue.find({ month: 11, year: 2026 });
    const mismatchBalance = allBills.find(
      b => b.outstandingBalance !== b.totalAmountDue - b.amountPaid
    );
    const test10Pass = !mismatchBalance;
    testResults.push({
      id: 10,
      name: 'Outstanding balance strictly equals totalAmountDue - amountPaid',
      status: test10Pass ? 'PASS' : 'FAIL',
      evidence: `Mismatched calculations: ${mismatchBalance ? 'FOUND (FAIL)' : 'NONE (PASS)'}`
    });
    console.log(`  -> Status: ${test10Pass ? 'PASS' : 'FAIL'} (Mismatched: ${mismatchBalance ? 'YES' : 'NONE'})`);

    // -------------------------------------------------------------
    // TEST 11: Month/Year & Status Filters
    // -------------------------------------------------------------
    console.log('[TEST 11] Testing Month, Year and Status Filters on GET /dues...');
    const filterRes = await fetch(
      `${BASE_URL}/api/v1/maintenance/dues?month=11&year=2026&status=UNPAID`,
      { headers: authHeaders }
    );
    const filterData = await filterRes.json();
    const test11Pass =
      filterRes.status === 200 &&
      filterData.success &&
      filterData.count === 16;
    testResults.push({
      id: 11,
      name: 'Maintenance dues API correctly filters by month, year, and status',
      status: test11Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${filterRes.status}, Filter count: ${filterData.count}`
    });
    console.log(`  -> Status: ${test11Pass ? 'PASS' : 'FAIL'} (Filtered count: ${filterData.count})`);

    // -------------------------------------------------------------
    // TEST 12: Unauthenticated Requests Rejection
    // -------------------------------------------------------------
    console.log('[TEST 12] Testing Unauthenticated Rejection...');
    const unauthRes = await fetch(`${BASE_URL}/api/v1/maintenance/dues`);
    const unauthPostRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const test12Pass = unauthRes.status === 401 && unauthPostRes.status === 401;
    testResults.push({
      id: 12,
      name: 'Maintenance APIs reject unauthenticated requests with 401 Unauthorized',
      status: test12Pass ? 'PASS' : 'FAIL',
      evidence: `Unauth GET: ${unauthRes.status}, Unauth POST: ${unauthPostRes.status}`
    });
    console.log(`  -> Status: ${test12Pass ? 'PASS' : 'FAIL'} (GET: ${unauthRes.status}, POST: ${unauthPostRes.status})`);

    // -------------------------------------------------------------
    // TEST 13: CSRF Protection on Mutating Maintenance Requests
    // -------------------------------------------------------------
    console.log('[TEST 13] Testing CSRF Header & Origin Rejection...');
    const csrfMissingRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${adminToken}`,
        'Content-Type': 'application/json'
        // Missing X-Requested-With
      },
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const csrfBadOriginRes = await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${adminToken}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://untrusted-hacker.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ month: 11, year: 2026 })
    });
    const test13Pass = csrfMissingRes.status === 403 && csrfBadOriginRes.status === 403;
    testResults.push({
      id: 13,
      name: 'CSRF protection rejects requests with missing header or invalid Origin',
      status: test13Pass ? 'PASS' : 'FAIL',
      evidence: `Missing Header Status: ${csrfMissingRes.status}, Bad Origin Status: ${csrfBadOriginRes.status}`
    });
    console.log(`  -> Status: ${test13Pass ? 'PASS' : 'FAIL'} (Header: ${csrfMissingRes.status}, Origin: ${csrfBadOriginRes.status})`);

    // -------------------------------------------------------------
    // TEST 14: Existing Super Admin Authentication Remains Functional
    // -------------------------------------------------------------
    console.log('[TEST 14] Verifying Super Admin Session & Identity...');
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: authHeaders
    });
    const meData = await meRes.json();
    const test14Pass =
      meRes.status === 200 &&
      meData.admin?.role === 'SUPER_ADMIN' &&
      meData.admin?.fullNameMarathi === 'श्री ल.रा. कोळी';
    testResults.push({
      id: 14,
      name: 'Super Admin authentication & identity remain functional',
      status: test14Pass ? 'PASS' : 'FAIL',
      evidence: `Admin Name: ${meData.admin?.fullNameMarathi}, Role: ${meData.admin?.role}`
    });
    console.log(`  -> Status: ${test14Pass ? 'PASS' : 'FAIL'} (Admin: ${meData.admin?.fullNameMarathi})`);

    // -------------------------------------------------------------
    // TEST 15: All 16 Original Resident Records Remain Clean & Intact
    // -------------------------------------------------------------
    console.log('[TEST 15] Verifying Original 16 Resident Records Intactness...');
    const residentCount = await Resident.countDocuments();
    const dbResidents = await Resident.find().select('fullNameMarathi');
    const dbNames = new Set(dbResidents.map(r => r.fullNameMarathi));
    const allOriginalsPresent = ORIGINAL_16_RESIDENTS.every(name => dbNames.has(name));
    const test15Pass = residentCount === 16 && allOriginalsPresent;
    testResults.push({
      id: 15,
      name: 'All 16 original resident records remain intact with exact Marathi names',
      status: test15Pass ? 'PASS' : 'FAIL',
      evidence: `Resident count: ${residentCount}, All 16 originals verified: ${allOriginalsPresent}`
    });
    console.log(`  -> Status: ${test15Pass ? 'PASS' : 'FAIL'} (Count: ${residentCount})`);

    // -------------------------------------------------------------
    // TEST 16: Maintenance Summary Aggregate API
    // -------------------------------------------------------------
    console.log('[TEST 16] Testing Maintenance Financial Summary API...');
    const summaryRes = await fetch(`${BASE_URL}/api/v1/maintenance/summary`, {
      headers: authHeaders
    });
    const summaryData = await summaryRes.json();
    const test16Pass =
      summaryRes.status === 200 &&
      summaryData.success &&
      summaryData.summary?.totalBilledAmount === 16 * 1500 &&
      summaryData.summary?.totalBillsCount === 16;
    testResults.push({
      id: 16,
      name: 'Maintenance summary aggregate API calculates correct totals',
      status: test16Pass ? 'PASS' : 'FAIL',
      evidence: `Total billed: ₹${summaryData.summary?.totalBilledAmount}, Bills: ${summaryData.summary?.totalBillsCount}`
    });
    console.log(`  -> Status: ${test16Pass ? 'PASS' : 'FAIL'} (Total Billed: ₹${summaryData.summary?.totalBilledAmount})`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('📊 TEST SUITE SUMMARY RESULTS');
    console.log('======================================================================');
    let passCount = 0;
    testResults.forEach(r => {
      if (r.status === 'PASS') passCount++;
      const num = String(r.id).padStart(2, '0');
      console.log(`[${num}] ${r.name.padEnd(65)} : ${r.status}`);
    });
    console.log('======================================================================');
    console.log(`TOTAL: ${passCount} / ${testResults.length} TESTS PASSED (${Math.round((passCount / testResults.length) * 100)}%)\n`);

    return testResults;
  } catch (error) {
    console.error('Test suite failed unexpectedly:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runPhase5TestSuite();
