import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import app from './src/app.js';
import Admin from './src/models/Admin.js';

const TEST_PORT = 5002;
const TEST_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';

// Ensure test JWT secret is available
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_long_for_security';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 SHIVNERI CLASSIC APARTMENT - PHASE 3 TEST SUITE');
  console.log('===============================================================');

  const results = [];
  let server;

  try {
    // 1. Fresh Database Connection Test
    console.log('\n[TEST 1] Fresh MongoDB Connection Test');
    await mongoose.connect(TEST_URI);
    const dbName = mongoose.connection.name;
    const test1Pass = dbName === 'shivneri_classic_admin_db';
    results.push({
      id: 1,
      name: 'Fresh MongoDB Connection to shivneri_classic_admin_db',
      status: test1Pass ? 'PASS' : 'FAIL',
      details: `Connected to database: ${dbName}`
    });
    console.log(`  -> Status: ${test1Pass ? 'PASS' : 'FAIL'} (Database: ${dbName})`);

    // Clean existing test admin to ensure clean slate
    await Admin.deleteMany({});

    // 2. First Super Admin Creation Test
    console.log('\n[TEST 2] First Super Admin Creation Test');
    const hashedPassword = await bcrypt.hash('AdminSecurePass@2026', 12);
    const firstAdmin = await Admin.create({
      singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
      fullNameMarathi: 'श्री ल.रा. कोळी',
      fullNameEnglish: 'Shri Laxman Koli',
      designation: 'Chairman / Building Secretary',
      username: 'laxman_koli',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN'
    });
    const test2Pass = !!firstAdmin._id && firstAdmin.role === 'SUPER_ADMIN';
    results.push({
      id: 2,
      name: 'First Super Admin Creation',
      status: test2Pass ? 'PASS' : 'FAIL',
      details: `Created admin: ${firstAdmin.fullNameMarathi} (ID: ${firstAdmin._id})`
    });
    console.log(`  -> Status: ${test2Pass ? 'PASS' : 'FAIL'} (Created ID: ${firstAdmin._id})`);

    // 3. Second Super Admin Rejection (Database-level Singleton Constraint)
    console.log('\n[TEST 3] Second Super Admin Rejection (Singleton Constraint)');
    let secondAdminRejected = false;
    let rejectionReason = '';
    try {
      await Admin.create({
        singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
        fullNameMarathi: 'दुय्यम प्रशासक',
        fullNameEnglish: 'Secondary Admin',
        designation: 'Staff',
        username: 'secondary_admin',
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN'
      });
    } catch (err) {
      secondAdminRejected = true;
      rejectionReason = err.code === 11000 ? 'MongoDB E11000 Duplicate Key Error' : err.message;
    }
    const adminCount = await Admin.countDocuments();
    const test3Pass = secondAdminRejected && adminCount === 1;
    results.push({
      id: 3,
      name: 'Second Super Admin Rejection (Database-level Singleton Constraint)',
      status: test3Pass ? 'PASS' : 'FAIL',
      details: `Rejected with: ${rejectionReason}. Current Admin count: ${adminCount}`
    });
    console.log(`  -> Status: ${test3Pass ? 'PASS' : 'FAIL'} (Count: ${adminCount}, Reason: ${rejectionReason})`);

    // Start Express server for HTTP tests
    server = app.listen(TEST_PORT);
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    // 4. Correct Login Test
    console.log('\n[TEST 4] Correct Admin Login (HttpOnly Cookie verification)');
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        username: 'laxman_koli',
        password: 'AdminSecurePass@2026'
      })
    });
    const loginData = await loginRes.json();
    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    const hasTokenCookie = setCookieHeader.includes('token=') && setCookieHeader.includes('HttpOnly');
    const tokenInBody = !!loginData.token || !!loginData.passwordHash;
    const test4Pass = loginRes.status === 200 && hasTokenCookie && !tokenInBody && loginData.success;
    results.push({
      id: 4,
      name: 'Correct Login & HttpOnly Cookie Set',
      status: test4Pass ? 'PASS' : 'FAIL',
      details: `Status: ${loginRes.status}, Cookie: ${hasTokenCookie ? 'HttpOnly token cookie present' : 'Missing'}, Token in JSON body: ${tokenInBody ? 'EXPOSED (FAIL)' : 'ZERO TOKEN (PASS)'}`
    });
    console.log(`  -> Status: ${test4Pass ? 'PASS' : 'FAIL'} (HttpOnly Cookie: ${hasTokenCookie}, Zero token in body: ${!tokenInBody})`);

    // Extract cookie value for subsequent tests
    const cookieValue = setCookieHeader.split(';')[0]; // "token=..."

    // 5. Incorrect Login Test (Generic Error Message)
    console.log('\n[TEST 5] Incorrect Login Rejection (Generic Error)');
    const failRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        username: 'laxman_koli',
        password: 'WrongPassword123'
      })
    });
    const failData = await failRes.json();
    const test5Pass = failRes.status === 401 && failData.message.includes('अवैध वापरकर्तानाव किंवा पासवर्ड');
    results.push({
      id: 5,
      name: 'Incorrect Login Fails with Generic Error',
      status: test5Pass ? 'PASS' : 'FAIL',
      details: `Status: ${failRes.status}, Message: ${failData.message}`
    });
    console.log(`  -> Status: ${test5Pass ? 'PASS' : 'FAIL'} (Status: ${failRes.status})`);

    // 6. Logout Clears Cookie Test
    console.log('\n[TEST 6] Logout Clears Session Cookie');
    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookieValue
      }
    });
    const logoutCookie = logoutRes.headers.get('set-cookie') || '';
    const cookieCleared = logoutCookie.includes('token=;') || logoutCookie.includes('Expires=Thu, 01 Jan 1970');
    const test6Pass = logoutRes.status === 200 && cookieCleared;
    results.push({
      id: 6,
      name: 'Logout Clears HttpOnly Session Cookie',
      status: test6Pass ? 'PASS' : 'FAIL',
      details: `Status: ${logoutRes.status}, Set-Cookie: ${logoutCookie}`
    });
    console.log(`  -> Status: ${test6Pass ? 'PASS' : 'FAIL'} (Cookie cleared: ${cookieCleared})`);

    // 7. Protected API Rejects Unauthenticated Request
    console.log('\n[TEST 7] Protected API Rejects Unauthenticated Request');
    const unauthRes = await fetch(`${BASE_URL}/api/v1/auth/me`);
    const test7Pass = unauthRes.status === 401;
    results.push({
      id: 7,
      name: 'Protected API (/auth/me) Rejects Request Without Cookie',
      status: test7Pass ? 'PASS' : 'FAIL',
      details: `Status: ${unauthRes.status}`
    });
    console.log(`  -> Status: ${test7Pass ? 'PASS' : 'FAIL'} (Status: ${unauthRes.status})`);

    // 8. Authenticated API Accepts Valid Session Cookie
    console.log('\n[TEST 8] Authenticated API Accepts Valid Session Cookie');
    const authRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Cookie': cookieValue
      }
    });
    const authData = await authRes.json();
    const test8Pass = authRes.status === 200 && authData.success && authData.admin?.role === 'SUPER_ADMIN';
    results.push({
      id: 8,
      name: 'Authenticated API (/auth/me) Accepts Valid Cookie',
      status: test8Pass ? 'PASS' : 'FAIL',
      details: `Status: ${authRes.status}, Authenticated as: ${authData.admin?.fullNameMarathi} (${authData.admin?.role})`
    });
    console.log(`  -> Status: ${test8Pass ? 'PASS' : 'FAIL'} (Admin: ${authData.admin?.fullNameMarathi})`);

    // 9. CSRF Protection Test (Missing X-Requested-With Header)
    console.log('\n[TEST 9] CSRF Protection on Mutating Requests');
    const csrfRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Intentionally omitting X-Requested-With header to simulate cross-origin POST
      },
      body: JSON.stringify({
        username: 'laxman_koli',
        password: 'AdminSecurePass@2026'
      })
    });
    const csrfData = await csrfRes.json();
    const test9Pass = csrfRes.status === 403 && csrfData.message.includes('CSRF');
    results.push({
      id: 9,
      name: 'CSRF Protection (Rejects POST without X-Requested-With header)',
      status: test9Pass ? 'PASS' : 'FAIL',
      details: `Status: ${csrfRes.status}, Message: ${csrfData.message}`
    });
    console.log(`  -> Status: ${test9Pass ? 'PASS' : 'FAIL'} (Status: ${csrfRes.status}, Message: ${csrfData.message})`);

    // 10. Rate Limiting Test (Brute Force Defense)
    console.log('\n[TEST 10] Rate Limiting on Login Endpoint');
    let rateLimited = false;
    for (let i = 0; i < 6; i++) {
      const rlRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: 'laxman_koli',
          password: 'BadPassword'
        })
      });
      if (rlRes.status === 429) {
        rateLimited = true;
        break;
      }
    }
    const test10Pass = rateLimited;
    results.push({
      id: 10,
      name: 'Login Rate Limiter (Trigger 429 Too Many Requests after 5 attempts)',
      status: test10Pass ? 'PASS' : 'FAIL',
      details: `Rate limit triggered: ${rateLimited}`
    });
    console.log(`  -> Status: ${test10Pass ? 'PASS' : 'FAIL'} (Rate limit triggered: ${rateLimited})`);

    // Summary
    console.log('\n===============================================================');
    console.log('📊 TEST SUITE SUMMARY RESULTS');
    console.log('===============================================================');
    let passedCount = 0;
    results.forEach(r => {
      if (r.status === 'PASS') passedCount++;
      console.log(`[TEST ${r.id}] ${r.name.padEnd(65)} : ${r.status}`);
    });
    console.log(`\nTOTAL: ${passedCount} / ${results.length} TESTS PASSED (${Math.round((passedCount / results.length) * 100)}%)\n`);

    return results;
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

runTestSuite();

