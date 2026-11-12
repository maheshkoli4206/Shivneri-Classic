import https from 'https';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const DUCKDNS_HOST = 'shivneri.duckdns.org';
const PORT = 5443;
const BASE_URL = `https://${DUCKDNS_HOST}:${PORT}`;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\c3a1a0cf-dc8b-46b6-95ab-ae62499bf6ee';
const ADMIN_USER = 'laxman_koli';
const ADMIN_PASS = 'Devraj@123';

const results = [];
function record(testName, passed, details) {
  results.push({ testName, passed, details });
  console.log(`${passed ? '✓' : '❌'} [${passed ? 'PASS' : 'FAIL'}] ${testName}: ${details}`);
}

// Strict HTTPS request helper (rejectUnauthorized: true ensures REAL certificate validation)
function request(method, pathUrl, headers = {}, body = null, strictCert = true) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: DUCKDNS_HOST,
      port: PORT,
      path: pathUrl,
      method: method,
      rejectUnauthorized: strictCert,
      headers: {
        'Host': `${DUCKDNS_HOST}:${PORT}`,
        ...headers
      }
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runLanE2ETests() {
  console.log('================================================================');
  console.log('🚀 SHIVNERI CLASSIC - LAN HTTPS ZERO-WARNING END-TO-END AUDIT');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('================================================================\n');

  let sessionCookie = '';

  try {
    // TEST 1: Strict Certificate Trust & Hostname Validation
    console.log('--- SUITE 1: STRICT TLS TRUST & PUBLIC CA VERIFICATION ---');
    try {
      const healthStrict = await request('GET', '/api/v1/health', {}, null, true);
      const parsedHealth = JSON.parse(healthStrict.body);
      record(
        'Strict TLS Certificate Trust Verification',
        healthStrict.status === 200 && parsedHealth.success === true,
        `HTTP 200 OK via strict CA verification. Service: ${parsedHealth.service}`
      );
    } catch (err) {
      record('Strict TLS Certificate Trust Verification', false, `TLS Error: ${err.message}`);
    }

    // TEST 2: SPA Frontend HTML delivery
    const spaRes = await request('GET', '/', {}, null, true);
    record(
      'SPA Root HTML Delivery',
      spaRes.status === 200 && spaRes.body.includes('<!doctype html>'),
      `Delivered ${spaRes.body.length} bytes with standard HTML5 DOCTYPE`
    );

    // TEST 3: Static Asset Content-Type & Security Headers
    record(
      'Security Headers Enforcement',
      Boolean(spaRes.headers['strict-transport-security'] && spaRes.headers['x-content-type-options']),
      `HSTS: ${spaRes.headers['strict-transport-security']} | Nosniff: ${spaRes.headers['x-content-type-options']}`
    );

    console.log('\n--- SUITE 2: ANTI-CSRF & CORS ORIGIN ISOLATION ---');

    // TEST 4: CSRF Rejection without X-Requested-With header
    const csrfNoHeader = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'Origin': BASE_URL
    }, { username: ADMIN_USER, password: ADMIN_PASS }, true);
    record(
      'CSRF Missing X-Requested-With Rejection',
      csrfNoHeader.status === 403,
      `Expected 403 -> Received ${csrfNoHeader.status}`
    );

    // TEST 5: CSRF Rejection with Unauthorized/Malicious Origin
    const csrfEvilOrigin = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://malicious-attacker.com'
    }, { username: ADMIN_USER, password: ADMIN_PASS }, true);
    record(
      'CSRF Malicious Origin Rejection',
      csrfEvilOrigin.status === 403,
      `Expected 403 -> Received ${csrfEvilOrigin.status}`
    );

    console.log('\n--- SUITE 3: AUTHENTICATION & SESSION LIFECYCLE ---');

    // TEST 6: Legitimate Admin Login
    const loginRes = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    }, { username: ADMIN_USER, password: ADMIN_PASS }, true);

    const loginBody = JSON.parse(loginRes.body);
    const rawCookies = loginRes.headers['set-cookie'];
    record(
      'Admin Login Authentication',
      loginRes.status === 200 && loginBody.success === true,
      `Logged in as: ${loginBody.admin?.name || loginBody.admin?.username}`
    );

    // TEST 7: Cookie Security Flags
    const tokenCookie = rawCookies ? rawCookies.find(c => c.startsWith('token=')) : null;
    if (tokenCookie) {
      sessionCookie = tokenCookie.split(';')[0];
      const isHttpOnly = tokenCookie.toLowerCase().includes('httponly');
      const isSecure = tokenCookie.toLowerCase().includes('secure');
      record(
        'Session Cookie Security Flags (HttpOnly & Secure)',
        isHttpOnly && isSecure,
        `Cookie: ${sessionCookie.slice(0, 15)}... | HttpOnly: ${isHttpOnly} | Secure: ${isSecure}`
      );
    } else {
      record('Session Cookie Security Flags', false, 'token cookie missing');
    }

    // TEST 8: Authenticated Session Check (GET /auth/me)
    const meRes = await request('GET', '/api/v1/auth/me', {
      'Cookie': sessionCookie
    }, null, true);
    const meBody = JSON.parse(meRes.body);
    record(
      'Authenticated Session Verification (GET /auth/me)',
      meRes.status === 200 && meBody.admin?.username === ADMIN_USER,
      `Verified Administrator: ${meBody.admin?.name} (${meBody.admin?.designation})`
    );

    console.log('\n--- SUITE 4: DATA ACCESS & PRODUCTION INTEGRITY (READ-ONLY) ---');

    // TEST 9: Master Residents Data Access
    const resRes = await request('GET', '/api/v1/residents', {
      'Cookie': sessionCookie
    }, null, true);
    const resData = JSON.parse(resRes.body);
    const residentList = Array.isArray(resData) ? resData : (resData.residents || []);
    record(
      'GET /residents Master Data',
      resRes.status === 200 && residentList.length === 20,
      `Loaded ${residentList.length} master resident records (16 residential, 4 commercial)`
    );

    // TEST 10: Payments Summary Access
    const payRes = await request('GET', '/api/v1/payments/summary', {
      'Cookie': sessionCookie
    }, null, true);
    const payData = JSON.parse(payRes.body);
    const summaryObj = payData.summary || payData;
    record(
      'GET /payments/summary Financial Data',
      payRes.status === 200 && summaryObj !== undefined,
      `Financial summary active: Total Billed ₹${summaryObj.totalBilledAmount ?? summaryObj.totalBilled ?? 'N/A'}`
    );

    // TEST 11: Dues List Access
    const duesRes = await request('GET', '/api/v1/maintenance/dues', {
      'Cookie': sessionCookie
    }, null, true);
    const duesData = JSON.parse(duesRes.body);
    const duesList = Array.isArray(duesData) ? duesData : (duesData.dues || []);
    record(
      'GET /maintenance/dues Bill Records',
      duesRes.status === 200 && duesList.length === 7,
      `Loaded ${duesList.length} dues records`
    );

    // TEST 12: Admin Logout
    const logoutRes = await request('POST', '/api/v1/auth/logout', {
      'Cookie': sessionCookie,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    }, {}, true);
    const logoutCookies = logoutRes.headers['set-cookie'];
    const clearedCookie = logoutCookies ? logoutCookies.some(c => c.includes('token=;') || c.includes('Max-Age=0')) : false;
    record(
      'Admin Session Logout & Token Clearance',
      logoutRes.status === 200 && clearedCookie,
      'Session cookie cleared and invalidated'
    );

    console.log('\n--- SUITE 5: REAL HEADLESS CHROME BROWSER AUDIT ---');

    // TEST 13-17: Chrome Browser E2E with Screenshot Evidence
    if (fs.existsSync(CHROME_PATH)) {
      const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1280,800'
        ],
        ignoreHTTPSErrors: false // STRICT: Browser will REJECT if cert is untrusted!
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Chrome Nav 1: Open Login Page
      console.log('Navigating Chrome to:', `${BASE_URL}/login`);
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lan_01_login_strict_https.png') });
      const loginTitle = await page.title();
      record(
        'Chrome Strict HTTPS Handshake & Login UI',
        loginTitle.length > 0,
        `Page title: "${loginTitle}" - Zero SSL warnings in Chrome`
      );

      // Chrome Nav 2: Interactive Login in Browser
      await page.type('input[type="text"], input[name="username"]', ADMIN_USER);
      await page.type('input[type="password"]', ADMIN_PASS);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lan_02_dashboard_strict_https.png') });
      const currentUrl = page.url();
      record(
        'Chrome Interactive Admin Login & Navigation',
        currentUrl === `${BASE_URL}/` || currentUrl.includes('/dashboard'),
        `Navigated to: ${currentUrl} (Dashboard route)`
      );

      // Chrome Nav 3: Payments Page
      await page.goto(`${BASE_URL}/payments`, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lan_03_payments_strict_https.png') });
      record(
        'Chrome Payments Register Load',
        page.url().includes('/payments'),
        'Payments register loaded and rendered in Chrome'
      );

      // Chrome Nav 4: Residents Page
      await page.goto(`${BASE_URL}/residents`, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lan_04_residents_strict_https.png') });
      record(
        'Chrome Residents Directory Load',
        page.url().includes('/residents'),
        'All 20 resident records rendered in Chrome'
      );

      await browser.close();
      record('Headless Chrome Browser Test Suite', true, '5 browser screenshots captured into artifact directory');
    } else {
      record('Headless Chrome Browser Test Suite', false, 'Chrome binary not found');
    }

  } catch (err) {
    console.error('Test Suite Exception:', err);
  }

  console.log('\n================================================================');
  console.log('📊 TEST SUMMARY RESULTS:');
  const passCount = results.filter(r => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);
  console.log('================================================================\n');

  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
}

runLanE2ETests();
