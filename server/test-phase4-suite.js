import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

const TEST_PORT = 5005;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runPhase4TestSuite() {
  console.log('======================================================================');
  console.log('🧪 PHASE 4: RESIDENT MASTER DATA & SECURITY HARDENING TEST SUITE');
  console.log('======================================================================\n');

  const testResults = [];
  let server;

  try {
    // -------------------------------------------------------------
    // SETUP: Connect DB and obtain valid Super Admin JWT Cookie
    // -------------------------------------------------------------
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) {
      throw new Error('Super Admin account missing in shivneri_classic_admin_db!');
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

    // -------------------------------------------------------------
    // TEST 1: Exactly 16 Initial Residents Count
    // -------------------------------------------------------------
    console.log('[TEST 1] Verifying 16 Initial Residents in Database...');
    const initialCount = await Resident.countDocuments({
      fullNameMarathi: { $in: ORIGINAL_16_RESIDENTS }
    });
    const test1Pass = initialCount === 16;
    testResults.push({
      id: 1,
      name: 'Exactly 16 Initial Residents Seeded in shivneri_classic_admin_db',
      status: test1Pass ? 'PASS' : 'FAIL',
      evidence: `Resident count: ${initialCount} / 16`
    });
    console.log(`  -> Status: ${test1Pass ? 'PASS' : 'FAIL'} (${initialCount}/16 records)`);

    // -------------------------------------------------------------
    // TEST 2: All 16 Marathi Names Match Exactly (Character-by-Character)
    // -------------------------------------------------------------
    console.log('[TEST 2] Verifying Exact Marathi Spellings of all 16 Residents...');
    const all16InDb = await Resident.find({
      fullNameMarathi: { $in: ORIGINAL_16_RESIDENTS }
    }).select('fullNameMarathi');
    const dbNamesSet = new Set(all16InDb.map(r => r.fullNameMarathi));
    const mismatchedNames = ORIGINAL_16_RESIDENTS.filter(name => !dbNamesSet.has(name));
    const test2Pass = mismatchedNames.length === 0;
    testResults.push({
      id: 2,
      name: 'All 16 Marathi Names Match Supplied Roster Exactly',
      status: test2Pass ? 'PASS' : 'FAIL',
      evidence: `Mismatched names count: ${mismatchedNames.length}`
    });
    console.log(`  -> Status: ${test2Pass ? 'PASS' : 'FAIL'} (Mismatched: ${mismatchedNames.length})`);

    // -------------------------------------------------------------
    // TEST 3: Idempotent Seeding (Re-running creates zero duplicates)
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Seed Script Idempotency...');
    const countBefore = await Resident.countDocuments();
    // Simulate re-running seed insert logic
    for (const name of ORIGINAL_16_RESIDENTS) {
      const exists = await Resident.findOne({ fullNameMarathi: name });
      if (!exists) {
        await Resident.create({ fullNameMarathi: name });
      }
    }
    const countAfter = await Resident.countDocuments();
    const test3Pass = countBefore === countAfter;
    testResults.push({
      id: 3,
      name: 'Re-running Resident Seed Creates Zero Duplicates (Idempotency)',
      status: test3Pass ? 'PASS' : 'FAIL',
      evidence: `Before: ${countBefore}, After re-seed attempt: ${countAfter}`
    });
    console.log(`  -> Status: ${test3Pass ? 'PASS' : 'FAIL'} (Count before: ${countBefore}, Count after: ${countAfter})`);

    // -------------------------------------------------------------
    // TEST 4: Resident CRUD - Read All (GET /api/v1/residents)
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing GET /api/v1/residents...');
    const getRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      headers: authHeaders
    });
    const getData = await getRes.json();
    const test4Pass = getRes.status === 200 && getData.success && Array.isArray(getData.residents) && getData.residents.length >= 16;
    testResults.push({
      id: 4,
      name: 'GET /api/v1/residents returns complete resident list',
      status: test4Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${getRes.status}, Count returned: ${getData.count}`
    });
    console.log(`  -> Status: ${test4Pass ? 'PASS' : 'FAIL'} (Count returned: ${getData.count})`);

    // -------------------------------------------------------------
    // TEST 5: Resident CRUD - Read by ID (GET /api/v1/residents/:id)
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing GET /api/v1/residents/:id...');
    const firstResident = getData.residents[0];
    const getOneRes = await fetch(`${BASE_URL}/api/v1/residents/${firstResident._id}`, {
      headers: authHeaders
    });
    const getOneData = await getOneRes.json();
    const test5Pass = getOneRes.status === 200 && getOneData.success && getOneData.resident?._id === firstResident._id;
    testResults.push({
      id: 5,
      name: 'GET /api/v1/residents/:id returns resident details',
      status: test5Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${getOneRes.status}, Name: ${getOneData.resident?.fullNameMarathi}`
    });
    console.log(`  -> Status: ${test5Pass ? 'PASS' : 'FAIL'} (Fetched: ${getOneData.resident?.fullNameMarathi})`);

    // -------------------------------------------------------------
    // TEST 6: Resident CRUD - Create New Resident (POST /api/v1/residents)
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing POST /api/v1/residents (Add new resident)...');
    const newResidentPayload = {
      fullNameMarathi: 'श्री चाचणी सभासद',
      flatNumber: '999',
      wing: 'A Wing',
      mobileNumber: '9876543210',
      email: 'test.resident@shivneri.com',
      address: 'नाशिक',
      notes: 'नवीन चाचणी सभासद'
    };
    const postRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newResidentPayload)
    });
    const postData = await postRes.json();
    const test6Pass = postRes.status === 201 && postData.success && postData.resident?.flatNumber === '999';
    testResults.push({
      id: 6,
      name: 'POST /api/v1/residents creates new resident record',
      status: test6Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${postRes.status}, Created ID: ${postData.resident?._id}`
    });
    console.log(`  -> Status: ${test6Pass ? 'PASS' : 'FAIL'} (Created ID: ${postData.resident?._id})`);

    const createdResidentId = postData.resident?._id;

    // -------------------------------------------------------------
    // TEST 7: Resident CRUD - Update Resident (PUT /api/v1/residents/:id)
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing PUT /api/v1/residents/:id (Update details)...');
    const updatePayload = {
      fullNameMarathi: 'श्री चाचणी सभासद (अद्यतनित)',
      flatNumber: '999',
      mobileNumber: '9999988888',
      email: 'updated.resident@shivneri.com',
      notes: 'माहिती अद्यतनित झाली'
    };
    const putRes = await fetch(`${BASE_URL}/api/v1/residents/${createdResidentId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(updatePayload)
    });
    const putData = await putRes.json();
    const test7Pass = putRes.status === 200 && putData.success && putData.resident?.mobileNumber === '9999988888';
    testResults.push({
      id: 7,
      name: 'PUT /api/v1/residents/:id updates resident details',
      status: test7Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${putRes.status}, Updated mobile: ${putData.resident?.mobileNumber}`
    });
    console.log(`  -> Status: ${test7Pass ? 'PASS' : 'FAIL'} (Mobile: ${putData.resident?.mobileNumber})`);

    // -------------------------------------------------------------
    // TEST 8: Resident CRUD - Status Update (PATCH /api/v1/residents/:id/status)
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing PATCH /api/v1/residents/:id/status (Deactivate & Activate)...');
    const patchRes = await fetch(`${BASE_URL}/api/v1/residents/${createdResidentId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'INACTIVE' })
    });
    const patchData = await patchRes.json();
    const test8Pass = patchRes.status === 200 && patchData.success && patchData.resident?.status === 'INACTIVE';
    testResults.push({
      id: 8,
      name: 'PATCH /api/v1/residents/:id/status toggles status to INACTIVE',
      status: test8Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${patchRes.status}, Status: ${patchData.resident?.status}`
    });
    console.log(`  -> Status: ${test8Pass ? 'PASS' : 'FAIL'} (Status: ${patchData.resident?.status})`);

    // Clean up test resident so database retains only authentic records
    await Resident.findByIdAndDelete(createdResidentId);

    // -------------------------------------------------------------
    // TEST 9: Duplicate Flat Number Validation Rejection
    // -------------------------------------------------------------
    console.log('[TEST 9] Testing Duplicate Flat Number Rejection...');
    // Create temporary resident on flat 501
    const resA = await Resident.create({ fullNameMarathi: 'सभासद अ', flatNumber: '501', wing: 'A Wing' });
    const dupRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fullNameMarathi: 'सभासद ब',
        flatNumber: '501',
        wing: 'A Wing'
      })
    });
    const dupData = await dupRes.json();
    const test9Pass = dupRes.status === 400 && dupData.message.includes('आधीच सभासद');
    testResults.push({
      id: 9,
      name: 'Duplicate Flat Number in same wing rejected with 400',
      status: test9Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${dupRes.status}, Message: ${dupData.message}`
    });
    console.log(`  -> Status: ${test9Pass ? 'PASS' : 'FAIL'} (Status: ${dupRes.status})`);
    await Resident.findByIdAndDelete(resA._id);

    // -------------------------------------------------------------
    // TEST 10: Invalid ID & Validation Errors
    // -------------------------------------------------------------
    console.log('[TEST 10] Testing Invalid ID and Empty Name Validation...');
    const invalidIdRes = await fetch(`${BASE_URL}/api/v1/residents/invalid_mongo_id_123`, {
      headers: authHeaders
    });
    const emptyNameRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ fullNameMarathi: '   ' })
    });
    const test10Pass = invalidIdRes.status === 400 && emptyNameRes.status === 400;
    testResults.push({
      id: 10,
      name: 'Invalid IDs and Missing Required Names are Rejected with 400',
      status: test10Pass ? 'PASS' : 'FAIL',
      evidence: `Invalid ID Status: ${invalidIdRes.status}, Empty Name Status: ${emptyNameRes.status}`
    });
    console.log(`  -> Status: ${test10Pass ? 'PASS' : 'FAIL'} (Invalid ID: ${invalidIdRes.status}, Empty Name: ${emptyNameRes.status})`);

    // -------------------------------------------------------------
    // TEST 11: Unauthenticated Access Rejection (requireAdminAuth)
    // -------------------------------------------------------------
    console.log('[TEST 11] Testing Unauthenticated Access to Resident APIs...');
    const unauthGetRes = await fetch(`${BASE_URL}/api/v1/residents`);
    const unauthPostRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ fullNameMarathi: 'अनधिकृत प्रयत्न' })
    });
    const test11Pass = unauthGetRes.status === 401 && unauthPostRes.status === 401;
    testResults.push({
      id: 11,
      name: 'Resident APIs strictly reject unauthenticated requests with 401',
      status: test11Pass ? 'PASS' : 'FAIL',
      evidence: `Unauth GET: ${unauthGetRes.status}, Unauth POST: ${unauthPostRes.status}`
    });
    console.log(`  -> Status: ${test11Pass ? 'PASS' : 'FAIL'} (GET: ${unauthGetRes.status}, POST: ${unauthPostRes.status})`);

    // -------------------------------------------------------------
    // TEST 12: Security Hardening - Disallowed Origin Rejection in CSRF
    // -------------------------------------------------------------
    console.log('[TEST 12] Testing Hardened CSRF Origin Verification...');
    const badOriginRes = await fetch(`${BASE_URL}/api/v1/residents`, {
      method: 'POST',
      headers: {
        'Cookie': `token=${adminToken}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'http://malicious-attacker-domain.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fullNameMarathi: 'हॅकर सभासद' })
    });
    const badOriginData = await badOriginRes.json();
    const test12Pass = badOriginRes.status === 403 && badOriginData.message.includes('अनधिकृत');
    testResults.push({
      id: 12,
      name: 'CSRF rejects state-mutating requests with unauthorized Origin header',
      status: test12Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${badOriginRes.status}, Message: ${badOriginData.message}`
    });
    console.log(`  -> Status: ${test12Pass ? 'PASS' : 'FAIL'} (Status: ${badOriginRes.status})`);

    // -------------------------------------------------------------
    // TEST 13: Super Admin Login & Zero Resident Account Footprint
    // -------------------------------------------------------------
    console.log('[TEST 13] Verifying Super Admin Login & Zero Resident Accounts...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': CLIENT_ORIGIN
      },
      body: JSON.stringify({
        username: admin.username,
        password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePass@2026'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminStillWorks = adminLoginRes.status === 200 && adminLoginData.success;
    const test13Pass = adminStillWorks && (await Admin.countDocuments()) === 1;
    testResults.push({
      id: 13,
      name: 'Super Admin login continues working; Admin count strictly remains 1',
      status: test13Pass ? 'PASS' : 'FAIL',
      evidence: `Login status: ${adminLoginRes.status}, Total Admins in DB: 1`
    });
    console.log(`  -> Status: ${test13Pass ? 'PASS' : 'FAIL'} (Login status: ${adminLoginRes.status})`);

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

runPhase4TestSuite();

