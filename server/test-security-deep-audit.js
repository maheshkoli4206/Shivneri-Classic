import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import app from './src/app.js';
import Admin from './src/models/Admin.js';
import { getCookieOptions } from './src/controllers/authController.js';

const AUDIT_PORT = 5004;
const BASE_URL = `http://localhost:${AUDIT_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';

async function runSecurityDeepAudit() {
  console.log('======================================================================');
  console.log('🔍 PHASE 3.1: SECURITY DEEP AUDIT SUITE (AUTOMATED VERIFICATION)');
  console.log('======================================================================\n');

  const auditLog = [];
  let server;

  try {
    // -------------------------------------------------------------
    // SECTION 1: DATABASE & ADMIN SINGLETON INDEX AUDIT
    // -------------------------------------------------------------
    console.log('>>> [AUDIT 1] Inspecting Database & MongoDB Physical Indexes...');
    await mongoose.connect(MONGODB_URI);
    const dbName = mongoose.connection.name;
    const isCorrectDb = dbName === 'shivneri_classic_admin_db';

    // Query physical indexes in MongoDB collection
    const indexes = await mongoose.connection.db.collection('admins').listIndexes().toArray();
    const singletonIndex = indexes.find(idx => idx.key?.singletonKey === 1);
    const hasUniqueSingleton = singletonIndex && singletonIndex.unique === true;

    auditLog.push({
      category: 'Admin Singleton',
      check: 'Database Name matches shivneri_classic_admin_db',
      result: isCorrectDb ? 'PASS' : 'FAIL',
      evidence: `Active database: "${dbName}"`
    });

    auditLog.push({
      category: 'Admin Singleton',
      check: 'MongoDB physical unique index on singletonKey exists',
      result: hasUniqueSingleton ? 'PASS' : 'FAIL',
      evidence: `Index: ${JSON.stringify(singletonIndex || 'NOT_FOUND')}`
    });

    // Concurrency test: 20 simultaneous parallel inserts
    console.log('>>> [AUDIT 2] Stress Testing Concurrent Insert Race Condition...');
    const concurrentAttempts = 20;
    const promises = [];
    for (let i = 0; i < concurrentAttempts; i++) {
      promises.push(
        mongoose.connection.db.collection('admins').insertOne({
          singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
          fullNameMarathi: `हल्लाखोर ${i}`,
          fullNameEnglish: `Attacker ${i}`,
          designation: 'Fake',
          username: `attacker_${Date.now()}_${i}`,
          passwordHash: 'dummy_hash',
          role: 'SUPER_ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );
    }
    const settled = await Promise.allSettled(promises);
    const rejectedCount = settled.filter(s => s.status === 'rejected').length;
    const totalAdminsInDb = await mongoose.connection.db.collection('admins').countDocuments();
    const concurrencyPassed = rejectedCount === concurrentAttempts && totalAdminsInDb === 1;

    auditLog.push({
      category: 'Admin Singleton',
      check: 'Concurrent multi-insert race condition rejection',
      result: concurrencyPassed ? 'PASS' : 'FAIL',
      evidence: `Attempts: ${concurrentAttempts}, Rejected: ${rejectedCount}, Surviving Admins: ${totalAdminsInDb}`
    });

    // -------------------------------------------------------------
    // START SERVER FOR HTTP / AUTH / CSRF AUDITS
    // -------------------------------------------------------------
    server = app.listen(AUDIT_PORT);

    // Fetch existing admin for valid tokens
    const adminDoc = await Admin.findOne({ role: 'SUPER_ADMIN' });
    const validToken = jwt.sign(
      { adminId: adminDoc._id, role: adminDoc.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // -------------------------------------------------------------
    // SECTION 2: CSRF & CORS PROTECTION AUDIT
    // -------------------------------------------------------------
    console.log('>>> [AUDIT 3] Auditing CSRF Header Enforcement & CORS Preflight...');

    // 2a: Missing X-Requested-With header on POST
    const csrfMissingRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminDoc.username, password: 'WrongPassword' })
    });
    auditLog.push({
      category: 'CSRF Protection',
      check: 'State-mutating POST without X-Requested-With is rejected',
      result: csrfMissingRes.status === 403 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${csrfMissingRes.status} (Forbidden)`
    });

    // 2b: Malicious / Invalid X-Requested-With value
    const csrfInvalidValRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'EvilScriptExploit'
      },
      body: JSON.stringify({ username: adminDoc.username, password: 'WrongPassword' })
    });
    auditLog.push({
      category: 'CSRF Protection',
      check: 'State-mutating POST with forged/invalid header value is rejected',
      result: csrfInvalidValRes.status === 403 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${csrfInvalidValRes.status}`
    });

    // 2c: CORS unauthorized origin preflight
    const corsPreflightRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-hacker-site.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-Requested-With,Content-Type'
      }
    });
    const allowOriginHeader = corsPreflightRes.headers.get('access-control-allow-origin');
    const corsBlockPassed = allowOriginHeader !== 'https://evil-hacker-site.com';
    auditLog.push({
      category: 'CORS Allowlist',
      check: 'CORS preflight from untrusted origin is denied allow-origin',
      result: corsBlockPassed ? 'PASS' : 'FAIL',
      evidence: `Access-Control-Allow-Origin: ${allowOriginHeader || 'Not Granted'}`
    });

    // -------------------------------------------------------------
    // SECTION 3: JWT SECURITY & COOKIE SPECIFICATIONS AUDIT
    // -------------------------------------------------------------
    console.log('>>> [AUDIT 4] Auditing JWT Integrity & Cookie Configurations...');

    // 3a: Expired JWT test
    const expiredToken = jwt.sign(
      { adminId: adminDoc._id, role: adminDoc.role },
      JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { 'Cookie': `token=${expiredToken}` }
    });
    auditLog.push({
      category: 'JWT Security',
      check: 'Expired JWT rejected with 401 Unauthorized',
      result: expRes.status === 401 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${expRes.status}`
    });

    // 3b: Malformed / Tampered JWT test
    const tamperedToken = validToken.slice(0, -6) + 'abc123';
    const tampRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { 'Cookie': `token=${tamperedToken}` }
    });
    auditLog.push({
      category: 'JWT Security',
      check: 'Tampered signature JWT rejected with 401 Unauthorized',
      result: tampRes.status === 401 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${tampRes.status}`
    });

    // 3c: Secret key mismatch test
    const forgedSecretToken = jwt.sign(
      { adminId: adminDoc._id, role: adminDoc.role },
      'forged_unauthorized_secret_key_12345678',
      { expiresIn: '8h' }
    );
    const forgedRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { 'Cookie': `token=${forgedSecretToken}` }
    });
    auditLog.push({
      category: 'JWT Security',
      check: 'JWT signed with incorrect secret rejected with 401',
      result: forgedRes.status === 401 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${forgedRes.status}`
    });

    // 3d: Cookie options inspection for production
    const prodCookieOpts = (() => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const opts = getCookieOptions();
      process.env.NODE_ENV = prevEnv;
      return opts;
    })();
    const cookieOptsValid =
      prodCookieOpts.httpOnly === true &&
      prodCookieOpts.secure === true &&
      prodCookieOpts.sameSite === 'strict' &&
      prodCookieOpts.path === '/' &&
      prodCookieOpts.maxAge === 28800000;

    auditLog.push({
      category: 'Cookie Security',
      check: 'Production cookie policy enforcement (HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=8h)',
      result: cookieOptsValid ? 'PASS' : 'FAIL',
      evidence: `Production options: ${JSON.stringify(prodCookieOpts)}`
    });

    // 3e: Logout invalidation test
    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `token=${validToken}`
      }
    });
    const setCookieLogout = logoutRes.headers.get('set-cookie') || '';
    const logoutCleared =
      setCookieLogout.includes('token=;') ||
      setCookieLogout.includes('Expires=Thu, 01 Jan 1970');

    auditLog.push({
      category: 'Cookie Security',
      check: 'Logout response invalidates token cookie with epoch expiration',
      result: logoutCleared ? 'PASS' : 'FAIL',
      evidence: `Set-Cookie header on logout: ${setCookieLogout}`
    });

    // -------------------------------------------------------------
    // SECTION 4: AUTHENTICATION ROBUSTNESS & TIMING-SAFE ERRORS
    // -------------------------------------------------------------
    console.log('>>> [AUDIT 5] Auditing Rate Limiting, Generic Errors & Protected APIs...');

    // 4a: Non-existent username
    const nonExistRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        username: 'non_existent_random_user_999',
        password: 'SomePassword@123'
      })
    });
    const nonExistData = await nonExistRes.json();
    const nonExistGeneric = nonExistData.message === 'अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)';

    // 4b: Existing username with incorrect password
    const wrongPassRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        username: adminDoc.username,
        password: 'IncorrectPassword@999'
      })
    });
    const wrongPassData = await wrongPassRes.json();
    const wrongPassGeneric = wrongPassData.message === 'अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)';

    const genericErrorsPassed = nonExistGeneric && wrongPassGeneric;
    auditLog.push({
      category: 'Authentication',
      check: 'Generic error message consistency (Anti-Account Enumeration)',
      result: genericErrorsPassed ? 'PASS' : 'FAIL',
      evidence: `Non-existent message: "${nonExistData.message}", Wrong pass message: "${wrongPassData.message}"`
    });

    // 4c: Protected endpoint rejection without session
    const unauthRes = await fetch(`${BASE_URL}/api/v1/auth/me`);
    auditLog.push({
      category: 'Authentication',
      check: 'Protected endpoint (/auth/me) strictly denies access without token cookie',
      result: unauthRes.status === 401 ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${unauthRes.status}`
    });

    // 4d: Login Rate Limiter (Brute Force Defense)
    let rateLimitTriggered = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
      const rlRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: adminDoc.username,
          password: 'BruteForceAttemptPassword'
        })
      });
      if (rlRes.status === 429) {
        rateLimitTriggered = true;
        break;
      }
    }
    auditLog.push({
      category: 'Authentication',
      check: 'Rate limiting triggers HTTP 429 after 5 failed login attempts',
      result: rateLimitTriggered ? 'PASS' : 'FAIL',
      evidence: `Rate limit 429 triggered: ${rateLimitTriggered}`
    });

    // -------------------------------------------------------------
    // PRINT AUDIT REPORT TABLE
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('📋 AUDIT EXECUTION RESULTS MATRIX');
    console.log('======================================================================');
    let passCount = 0;
    auditLog.forEach((item, index) => {
      if (item.result === 'PASS') passCount++;
      const num = String(index + 1).padStart(2, '0');
      console.log(`[${num}] [${item.category.padEnd(16)}] ${item.check.padEnd(52)} : ${item.result}`);
    });
    console.log('======================================================================');
    console.log(`TOTAL AUDIT CHECKS: ${passCount} / ${auditLog.length} PASSED (${Math.round((passCount / auditLog.length) * 100)}%)\n`);

    return auditLog;
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runSecurityDeepAudit();

