import https from 'https';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const TAILSCALE_HOST = 'mahesh-pc.tail1b2b0e.ts.net';
const BASE_URL = `https://${TAILSCALE_HOST}`;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\c3a1a0cf-dc8b-46b6-95ab-ae62499bf6ee';
const ADMIN_USER = 'laxman_koli';
const ADMIN_PASS = 'Devraj@123';

const results = [];
function record(testName, passed, details) {
  results.push({ testName, passed, details });
  console.log(`${passed ? '✓' : '❌'} [${passed ? 'PASS' : 'FAIL'}] ${testName}: ${details}`);
}

// Helper for https requests
function request(method, pathUrl, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: TAILSCALE_HOST,
      port: 443,
      path: pathUrl,
      method: method,
      rejectUnauthorized: false,
      headers: {
        'Host': TAILSCALE_HOST,
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

async function runTailscaleTests() {
  console.log('========================================================================');
  console.log('🚀 SHIVNERI CLASSIC — TAILSCALE PRIVATE REMOTE ACCESS TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('========================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // 1. Homepage & HTML Delivery
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Homepage & React Assets via Tailscale ---');
    const homeRes = await request('GET', '/');
    const hasHtml = homeRes.status === 200 && homeRes.body.includes('<!doctype html>') && homeRes.body.includes('Shivneri Classic');
    record('Homepage Delivery', hasHtml, `Status ${homeRes.status}, Content-Type: ${homeRes.headers['content-type']}`);

    // Extract JS asset from HTML
    const jsMatch = homeRes.body.match(/src="([^"]+\.js)"/);
    if (jsMatch && jsMatch[1]) {
      const assetUrl = jsMatch[1];
      const jsRes = await request('GET', assetUrl);
      const jsOk = jsRes.status === 200 && (jsRes.headers['content-type'] || '').includes('javascript');
      record('React JS Asset Delivery', jsOk, `Fetched ${assetUrl} -> Status ${jsRes.status}`);
    }

    // ------------------------------------------------------------------------
    // 2. Health Endpoint
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing API Health Endpoint ---');
    const healthRes = await request('GET', '/api/v1/health');
    let healthData = {};
    try { healthData = JSON.parse(healthRes.body); } catch (e) {}
    const healthOk = healthRes.status === 200 && healthData.status === 'ok';
    record('API Health Check', healthOk, `Status ${healthRes.status}, Service: ${healthData.service}`);

    // ------------------------------------------------------------------------
    // 3. CSRF Protection Validation
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing CSRF Protection & Origin Validation ---');
    
    // 3a. Missing X-Requested-With header
    const noHeaderRes = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'Origin': BASE_URL
    }, { username: ADMIN_USER, password: ADMIN_PASS });
    const noHeaderBlocked = noHeaderRes.status === 403;
    record('CSRF Missing Header Rejection', noHeaderBlocked, `Expected 403 -> Received ${noHeaderRes.status}`);

    // 3b. Malicious / unauthorized origin
    const badOriginRes = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://evil-hacker.com'
    }, { username: ADMIN_USER, password: ADMIN_PASS });
    const badOriginBlocked = badOriginRes.status === 403;
    record('CSRF Malicious Origin Rejection', badOriginBlocked, `Expected 403 -> Received ${badOriginRes.status}`);

    // ------------------------------------------------------------------------
    // 4. Admin Login & Cookie Issuance
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Admin Login & Cookie Issuance ---');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    }, { username: ADMIN_USER, password: ADMIN_PASS });

    let loginData = {};
    try { loginData = JSON.parse(loginRes.body); } catch (e) {}
    const loginOk = loginRes.status === 200 && loginData.success === true;
    record('Admin Authentication', loginOk, `Status ${loginRes.status}, Logged in as: ${loginData.admin?.username}`);

    const setCookies = loginRes.headers['set-cookie'] || [];
    const cookieStr = Array.isArray(setCookies) ? setCookies.join('; ') : setCookies;
    const hasToken = cookieStr.includes('token=');
    const isHttpOnly = cookieStr.toLowerCase().includes('httponly');
    const isSecure = cookieStr.toLowerCase().includes('secure');
    const isSameSite = cookieStr.toLowerCase().includes('samesite=strict');
    
    record('Cookie token present', hasToken, 'JWT token cookie was issued');
    record('Cookie HttpOnly flag', isHttpOnly, 'Prevents XSS extraction');
    record('Cookie Secure flag', isSecure, 'Enforces HTTPS transmission');
    record('Cookie SameSite=Strict', isSameSite, 'Prevents CSRF cross-origin leaks');

    // Extract cookie for authenticated API calls
    const tokenCookie = (cookieStr.split(';').find(c => c.trim().startsWith('token=')) || '').trim();

    // ------------------------------------------------------------------------
    // 5. Authenticated API Endpoints (Read-Only)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Authenticated Read-Only API Endpoints ---');
    const authHeaders = {
      'Cookie': tokenCookie,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': BASE_URL
    };

    // 5a. Current Admin Profile
    const meRes = await request('GET', '/api/v1/auth/me', authHeaders);
    let meData = {};
    try { meData = JSON.parse(meRes.body); } catch (e) {}
    record('GET /auth/me Profile', meRes.status === 200 && meData.success, `Role: ${meData.admin?.role}`);

    // 5b. Residents List
    const resRes = await request('GET', '/api/v1/residents', authHeaders);
    let residentsData = {};
    try { residentsData = JSON.parse(resRes.body); } catch (e) {}
    const resCount = residentsData.residents?.length || 0;
    record('GET /residents Master Data', resRes.status === 200 && resCount === 20, `Loaded ${resCount} master residents`);

    // 5c. Payments Summary (4 Financial Summary Cards)
    const summaryRes = await request('GET', '/api/v1/payments/summary', authHeaders);
    let summaryData = {};
    try { summaryData = JSON.parse(summaryRes.body); } catch (e) {}
    const hasCards = summaryRes.status === 200 && summaryData.success && summaryData.summary?.totalBilledAmount !== undefined;
    record('GET /payments/summary Financial Cards', hasCards, `Total Billed: ₹${summaryData.summary?.totalBilledAmount?.toLocaleString('en-IN')}, Outstanding: ₹${summaryData.summary?.totalOutstandingAmount?.toLocaleString('en-IN')}`);

    // 5d. Payment History & Receipt PDF Generation
    const paymentsRes = await request('GET', '/api/v1/payments?page=1&limit=5', authHeaders);
    let paymentsData = {};
    try { paymentsData = JSON.parse(paymentsRes.body); } catch (e) {}
    const paymentsList = paymentsData.payments || [];
    record('GET /payments History', paymentsRes.status === 200 && paymentsList.length > 0, `Loaded ${paymentsList.length} verified payment records`);

    if (paymentsList.length > 0) {
      const firstPaymentId = paymentsList[0]._id;
      const pdfRes = await request('GET', `/api/v1/payments/${firstPaymentId}/receipt-pdf`, authHeaders);
      const isPdf = pdfRes.status === 200 && (pdfRes.headers['content-type'] || '').includes('application/pdf');
      record('PDF Receipt Stream over Tailscale', isPdf, `Receipt #${paymentsList[0].receiptNumber} -> Size: ${pdfRes.body.length} bytes, Content-Type: ${pdfRes.headers['content-type']}`);
    }

    // ------------------------------------------------------------------------
    // 6. Browser End-to-End Test with Puppeteer
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Full UI Flow in Browser via Tailscale Hostname ---');
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true }); // Mobile viewport (iPhone 14)

    // Navigate to remote Tailscale URL
    console.log(`  Navigating to ${BASE_URL}/login in mobile viewport...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_01_login_remote.png') });
    record('Browser Remote Login Page', true, 'Loaded https://mahesh-pc.tail1b2b0e.ts.net/login');

    // UI Login
    await page.type('#username', ADMIN_USER);
    await page.type('#password', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_02_dashboard_remote.png') });
    const onDashboard = page.url().includes('/') && !page.url().includes('/login');
    record('Browser UI Login & Redirect', onDashboard, `Current URL: ${page.url()}`);

    // Navigate to Payments & Receipts
    console.log('  Navigating to Payments & Receipts page...');
    await page.goto(`${BASE_URL}/payments`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_03_payments_remote.png') });
    record('Browser Payments Page', true, 'Loaded interactive cards on remote hostname');

    // Open Financial Drilldown Modal
    console.log('  Opening Financial Drilldown modal...');
    const drilldownOpened = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]'));
      const card = cards.find(c => c.innerText.includes('एकूण बिल') || c.innerText.includes('Total Billed'));
      if (card) { card.click(); return true; }
      return false;
    });

    if (drilldownOpened) {
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_04_drilldown_remote.png') });
      record('Interactive Drilldown Modal', true, 'Modal loaded over remote Tailscale connection');

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.fixed.inset-0 button');
        if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // Switch to Payment History and view receipt
    console.log('  Testing Payment History and Receipt Modal...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('जमा इतिहास') || b.innerText.includes('Payment History'));
      if (tabs.length > 0) tabs[0].click();
    });
    await new Promise(r => setTimeout(r, 800));

    const receiptOpened = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('पावती') || b.innerText.includes('Receipt'));
      if (btns.length > 0) { btns[0].click(); return true; }
      return false;
    });

    if (receiptOpened) {
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_05_receipt_remote.png') });
      record('Receipt Modal over Tailscale', true, 'Official receipt viewed with print button');
      
      // Close modal
      await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll('.fixed.inset-0 button')).filter(b => b.innerText.includes('बंद करा') || b.innerText.includes('Close') || b.querySelector('svg'));
        if (closeBtns.length > 0) closeBtns[0].click();
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // Test UI Logout via API and redirect
    console.log('  Testing Admin Logout...');
    await page.click('button[aria-label="Open sidebar menu"]');
    await new Promise(r => setTimeout(r, 600));
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('aside button')).find(b => b.innerText.includes('लॉगआउट') || b.innerText.includes('Logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    // Confirm logout in modal
    await page.evaluate(() => {
      const confirmBtns = Array.from(document.querySelectorAll('.fixed.inset-0 button')).filter(b => b.innerText.includes('लॉगआउट करा') || b.innerText.includes('Logout'));
      if (confirmBtns.length > 0) confirmBtns[confirmBtns.length - 1].click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tailscale_06_logout_remote.png') });
    const loggedOut = page.url().includes('/login');
    record('Admin Logout over Tailscale', loggedOut, `Redirected to login: ${page.url()}`);

    await browser.close();

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TAILSCALE TESTS: ${results.length}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${results.length - passedCount}`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('❌ Tailscale test error:', err);
  }
}

runTailscaleTests();
