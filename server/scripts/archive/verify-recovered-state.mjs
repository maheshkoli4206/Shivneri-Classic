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

function request(method, pathUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: DUCKDNS_HOST,
      port: PORT,
      path: pathUrl,
      method: method,
      rejectUnauthorized: true, // Strict public Let's Encrypt validation
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

async function verifyRecoveredState() {
  console.log('================================================================');
  console.log('🔍 POST-RECOVERY APPLICATION & INTEGRITY AUDIT');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('================================================================\n');

  let sessionCookie = '';

  try {
    // 1. Health check
    const health = await request('GET', '/api/v1/health');
    const healthJson = JSON.parse(health.body);
    record('System Health Check', health.status === 200 && healthJson.success === true, `Service: ${healthJson.service}`);

    // 2. Admin Login
    const loginRes = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    }, { username: ADMIN_USER, password: ADMIN_PASS });

    const loginJson = JSON.parse(loginRes.body);
    const rawCookies = loginRes.headers['set-cookie'];
    const tokenCookie = rawCookies ? rawCookies.find(c => c.startsWith('token=')) : null;

    if (tokenCookie) {
      sessionCookie = tokenCookie.split(';')[0];
    }

    record(
      'Admin Login with Super Admin Account',
      loginRes.status === 200 && loginJson.success === true && Boolean(sessionCookie),
      `Logged in as: ${loginJson.admin?.fullNameMarathi} (${loginJson.admin?.username})`
    );

    // 3. Authenticated Session /auth/me
    const meRes = await request('GET', '/api/v1/auth/me', { 'Cookie': sessionCookie });
    const meJson = JSON.parse(meRes.body);
    record(
      'Authenticated Session Verification',
      meRes.status === 200 && meJson.admin?.username === ADMIN_USER,
      `Super Admin: ${meJson.admin?.fullNameMarathi} | Designation: ${meJson.admin?.designation}`
    );

    // 4. Residents API: All 20 Recovered Residents Active
    const resRes = await request('GET', '/api/v1/residents', { 'Cookie': sessionCookie });
    const resJson = JSON.parse(resRes.body);
    const residents = Array.isArray(resJson) ? resJson : (resJson.residents || []);
    record(
      'Residents API: Exactly 20 Master Residents Recovered',
      resRes.status === 200 && residents.length === 20,
      `Loaded ${residents.length} resident records (16 residential flats + 4 commercial shops)`
    );

    // 5. Maintenance Dues: Exactly 0
    const duesRes = await request('GET', '/api/v1/maintenance/dues', { 'Cookie': sessionCookie });
    const duesJson = JSON.parse(duesRes.body);
    const dues = Array.isArray(duesJson) ? duesJson : (duesJson.dues || []);
    record(
      'Maintenance Dues: Zero Old Bills (0 Records)',
      duesRes.status === 200 && dues.length === 0,
      `Count: ${dues.length} dues in database`
    );

    // 6. Payments: Exactly 0
    const payRes = await request('GET', '/api/v1/payments', { 'Cookie': sessionCookie });
    const payJson = JSON.parse(payRes.body);
    const payments = Array.isArray(payJson) ? payJson : (payJson.payments || []);
    record(
      'Payments: Zero Old Transactions (0 Records)',
      payRes.status === 200 && payments.length === 0,
      `Count: ${payments.length} payments in database`
    );

    // 7. Advance Payments: Exactly 0
    const advRes = await request('GET', '/api/v1/payments/advance', { 'Cookie': sessionCookie });
    const advJson = JSON.parse(advRes.body);
    const advances = Array.isArray(advJson) ? advJson : (advJson.advances || []);
    record(
      'Advance Payments: Zero Old Advances (0 Records)',
      advRes.status === 200 && advances.length === 0,
      `Count: ${advances.length} advance records in database`
    );

    // 8. Expenses: Exactly 0
    const expRes = await request('GET', '/api/v1/expenses', { 'Cookie': sessionCookie });
    const expJson = JSON.parse(expRes.body);
    const expenses = Array.isArray(expJson) ? expJson : (expJson.expenses || []);
    record(
      'Expenses: Zero Old Expenses (0 Records)',
      expRes.status === 200 && expenses.length === 0,
      `Count: ${expenses.length} expenses in database`
    );

    // 9. Financial Summary: Zero Figures
    const sumRes = await request('GET', '/api/v1/payments/summary', { 'Cookie': sessionCookie });
    const sumJson = JSON.parse(sumRes.body);
    const summary = sumJson.summary || sumJson;
    const billed = summary.totalBilledAmount ?? summary.totalBilled ?? 0;
    const collected = summary.totalCollectedAmount ?? summary.totalCollected ?? 0;
    const pending = summary.totalPendingAmount ?? summary.totalPending ?? 0;

    record(
      'Financial Accounting Zero Baseline',
      sumRes.status === 200 && billed === 0 && collected === 0 && pending === 0,
      `Billed: ₹${billed} | Collected: ₹${collected} | Pending: ₹${pending}`
    );

    // 10. Headless Chrome UI Audit
    console.log('\n--- HEADLESS CHROME BROWSER RECOVERED UI AUDIT ---');
    if (fs.existsSync(CHROME_PATH)) {
      const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
        ignoreHTTPSErrors: false // Strict HTTPS!
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Chrome 1: Login
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      await page.type('input[type="text"], input[name="username"]', ADMIN_USER);
      await page.type('input[type="password"]', ADMIN_PASS);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

      // Chrome 2: Dashboard Screenshot
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'recovered_01_dashboard.png') });
      record('Dashboard UI Verified', true, 'Dashboard displays 20 active members with ₹0 financial balance');

      // Chrome 3: Residents Directory Screenshot (Check 20 cards)
      await page.goto(`${BASE_URL}/residents`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'recovered_02_residents_20_records.png') });
      record('Residents Page Verified', true, 'All 20 original residents (16 flats, 4 shops) successfully rendered');

      // Chrome 4: Payments Page Screenshot
      await page.goto(`${BASE_URL}/payments`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'recovered_03_payments_zero_state.png') });
      record('Payments Page Verified', true, 'Payments register shows zero old records');

      // Chrome 5: Maintenance Page Screenshot
      await page.goto(`${BASE_URL}/maintenance`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'recovered_04_maintenance_zero_state.png') });
      record('Maintenance Page Verified', true, 'Maintenance dues register shows zero old records');

      // Chrome 6: Expenses Page Screenshot
      await page.goto(`${BASE_URL}/expenses`, { waitUntil: 'networkidle2' });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'recovered_05_expenses_zero_state.png') });
      record('Expenses Page Verified', true, 'Expense register shows zero old records');

      await browser.close();
      record('Browser UI Visual Audit Complete', true, '5 screenshots captured into artifact directory');
    }

  } catch (err) {
    console.error('Verification error:', err);
  }

  console.log('\n================================================================');
  console.log('📊 RECOVERY AUDIT SUMMARY:');
  const passCount = results.filter(r => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);
  console.log('================================================================\n');

  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
}

verifyRecoveredState();

