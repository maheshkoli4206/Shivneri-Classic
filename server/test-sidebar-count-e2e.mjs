import puppeteer from 'puppeteer-core';
import https from 'https';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\c3a1a0cf-dc8b-46b6-95ab-ae62499bf6ee';
const BASE_URL = 'https://localhost:5443';
const ADMIN_USER = 'laxman_koli';
const ADMIN_PASS = 'Devraj@123';

const results = [];
function record(testName, passed, details) {
  results.push({ testName, passed, details });
  console.log(`${passed ? '✓' : '❌'} [${passed ? 'PASS' : 'FAIL'}] ${testName}: ${details}`);
}

async function run() {
  console.log('==============================================================================');
  console.log('🔍 SHIVNERI CLASSIC – SIDEBAR & REGISTRY RESIDENT COUNT E2E VERIFICATION');
  console.log('==============================================================================\n');

  let browser;
  try {
    console.log('1. Launching Chrome headless browser...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('fail')) {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
      }
    });
    page.on('pageerror', err => console.log('[BROWSER UNCAUGHT]:', err.message));

    // Step 1: Open Login Page
    console.log('2. Navigating to Login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 15000 });
    const currentUrl = page.url();
    record('Login Page Navigation', currentUrl.includes('/login'), `Loaded URL: ${currentUrl}`);

    // Step 2: Perform Login
    console.log('3. Logging in as Laxman Koli...');
    await page.type('input[type="text"], input[name="username"]', ADMIN_USER);
    await page.type('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Wait for client-side navigation away from /login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForSelector('aside a[href="/residents"]', { timeout: 10000 });

    const postLoginUrl = page.url();
    record('Admin Authentication', !postLoginUrl.includes('/login'), `Redirected to: ${postLoginUrl}`);

    // Allow contexts and initial fetch to settle
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Check Sidebar Resident Count on Dashboard
    console.log('4. Verifying Sidebar Resident Badge on Dashboard...');
    // Find sidebar link to /residents
    const sidebarBadgeSelector = 'aside a[href="/residents"] span.rounded, aside a[href="/residents"] span';
    
    // Evaluate sidebar resident link details
    const sidebarDetails = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside a[href="/residents"]'));
      if (links.length === 0) return null;
      const link = links[0];
      // Find the badge span
      const spans = Array.from(link.querySelectorAll('span'));
      // The badge span has text and is typically styled as badge
      const badgeSpan = spans.find(s => /^\d+$/.test(s.textContent.trim()));
      return {
        linkText: link.textContent.trim(),
        badgeText: badgeSpan ? badgeSpan.textContent.trim() : null
      };
    });

    record(
      'Sidebar Residents Badge on Dashboard',
      sidebarDetails && sidebarDetails.badgeText === '20',
      `Sidebar badge found: "${sidebarDetails?.badgeText}" (Expected: "20")`
    );

    // Step 4: Check Dashboard KPI Card
    console.log('5. Verifying Dashboard Total Residents KPI Card...');
    const dashboardKpi = await page.evaluate(() => {
      // Find card linking to /residents
      const card = document.querySelector('main a[href="/residents"]');
      if (!card) return null;
      const cardText = card.textContent;
      // Find number
      const numMatch = cardText.match(/\b(20|16)\b/);
      return {
        cardText: card.innerText.trim(),
        detectedNumber: numMatch ? numMatch[1] : null
      };
    });

    record(
      'Dashboard KPI Residents Count',
      dashboardKpi && dashboardKpi.detectedNumber === '20',
      `KPI displayed: "${dashboardKpi?.detectedNumber}" (Full text: ${dashboardKpi?.cardText.replace(/\n+/g, ' | ')})`
    );

    const dashShotPath = path.join(ARTIFACT_DIR, 'sidebar_count_01_dashboard.png');
    await page.screenshot({ path: dashShotPath, fullPage: true });
    console.log(`Saved screenshot: ${dashShotPath}`);

    // Step 5: Navigate to /residents (Resident Registry)
    console.log('6. Navigating to Resident Registry (/residents)...');
    await page.click('aside a[href="/residents"]');
    await page.waitForFunction(() => window.location.pathname === '/residents', { timeout: 10000 });
    await page.waitForSelector('span.rounded-full', { timeout: 10000 });

    await new Promise(r => setTimeout(r, 1200));

    // Verify Registry Header and Sidebar Badge
    const registryInfo = await page.evaluate(() => {
      // Registry header badge (e.g. "20 सभासद" or "20 Members")
      const header = document.querySelector('h2');
      const headerBadge = header?.parentElement?.querySelector('span.rounded-full');
      
      // Sidebar link badge
      const sidebarLink = document.querySelector('aside a[href="/residents"]');
      const sidebarSpans = sidebarLink ? Array.from(sidebarLink.querySelectorAll('span')) : [];
      const sidebarBadge = sidebarSpans.find(s => /^\d+$/.test(s.textContent.trim()));

      // Count roster items in the page
      // Look for table rows or resident cards
      const residentCards = document.querySelectorAll('.resident-card, [data-resident-id], div.rounded-2xl.border');
      
      return {
        headerBadgeText: headerBadge ? headerBadge.textContent.trim() : null,
        sidebarBadgeText: sidebarBadge ? sidebarBadge.textContent.trim() : null,
        headerText: header ? header.textContent.trim() : null
      };
    });

    record(
      'Resident Registry Header Badge',
      registryInfo && registryInfo.headerBadgeText && registryInfo.headerBadgeText.includes('20'),
      `Registry header badge: "${registryInfo?.headerBadgeText}" (Contains 20)`
    );

    record(
      'Sidebar Residents Badge on Registry Page',
      registryInfo && registryInfo.sidebarBadgeText === '20',
      `Sidebar badge: "${registryInfo?.sidebarBadgeText}" (Expected: "20")`
    );

    const regShotPath = path.join(ARTIFACT_DIR, 'sidebar_count_02_residents.png');
    await page.screenshot({ path: regShotPath, fullPage: true });
    console.log(`Saved screenshot: ${regShotPath}`);

    // Step 6: Test Search Filter Isolation (Filtering roster must NOT alter total sidebar badge)
    console.log('7. Testing Search Filter Isolation...');
    const searchInput = await page.$('input[placeholder*="शोधा"], input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('Shop');
      await new Promise(r => setTimeout(r, 800));

      const filteredState = await page.evaluate(() => {
        const header = document.querySelector('h2');
        const headerBadge = header?.parentElement?.querySelector('span.rounded-full');
        const sidebarLink = document.querySelector('aside a[href="/residents"]');
        const sidebarSpans = sidebarLink ? Array.from(sidebarLink.querySelectorAll('span')) : [];
        const sidebarBadge = sidebarSpans.find(s => /^\d+$/.test(s.textContent.trim()));

        return {
          headerBadgeText: headerBadge ? headerBadge.textContent.trim() : null,
          sidebarBadgeText: sidebarBadge ? sidebarBadge.textContent.trim() : null
        };
      });

      record(
        'Search Filter Active: Header reflects filtered count',
        filteredState && filteredState.headerBadgeText && filteredState.headerBadgeText.includes('4'),
        `Header badge filtered to: "${filteredState?.headerBadgeText}"`
      );

      record(
        'Search Filter Active: Sidebar badge remains total (20)',
        filteredState && filteredState.sidebarBadgeText === '20',
        `Sidebar badge preserved: "${filteredState?.sidebarBadgeText}"`
      );

      const filterShotPath = path.join(ARTIFACT_DIR, 'sidebar_count_03_search_filter.png');
      await page.screenshot({ path: filterShotPath, fullPage: true });
      console.log(`Saved screenshot: ${filterShotPath}`);

      // Clear search
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="शोधा"], input[placeholder*="Search"]');
        if (input) {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await new Promise(r => setTimeout(r, 800));
    }

    // Step 7: Check Other Pages (Maintenance, Payments, Expenses)
    const routesToTest = [
      { path: '/maintenance', name: 'Maintenance' },
      { path: '/payments', name: 'Payments' },
      { path: '/expenses', name: 'Expenses' },
      { path: '/reports', name: 'Reports' },
      { path: '/settings', name: 'Settings' }
    ];

    for (const route of routesToTest) {
      console.log(`8. Verifying Sidebar badge on ${route.name} (${route.path})...`);
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const badge = await page.evaluate(() => {
        const sidebarLink = document.querySelector('aside a[href="/residents"]');
        const sidebarSpans = sidebarLink ? Array.from(sidebarLink.querySelectorAll('span')) : [];
        const sidebarBadge = sidebarSpans.find(s => /^\d+$/.test(s.textContent.trim()));
        return sidebarBadge ? sidebarBadge.textContent.trim() : null;
      });

      record(
        `Sidebar Residents Badge on ${route.name}`,
        badge === '20',
        `Badge text on ${route.path}: "${badge}" (Expected: "20")`
      );
    }

    // Step 8: Verify Database Invariance (Strict zero mutations)
    console.log('9. Verifying Database Invariance in MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shivneri_classic_prod_db';
    await mongoose.connect(mongoUri);

    const collections = await mongoose.connection.db.listCollections().toArray();
    const counts = {};
    for (const col of collections) {
      const c = await mongoose.connection.db.collection(col.name).countDocuments();
      counts[col.name] = c;
    }

    record('DB Residents Count', counts.residents === 20, `Residents count: ${counts.residents} (Expected: 20)`);
    record('DB Financial Dues Count', counts.maintenancedues === 0, `Maintenance dues: ${counts.maintenancedues} (Expected: 0)`);
    record('DB Payments Count', counts.payments === 0, `Payments: ${counts.payments} (Expected: 0)`);
    record('DB Expenses Count', counts.expenses === 0, `Expenses: ${counts.expenses} (Expected: 0)`);
    record('DB Advance Payments Count', counts.advancepayments === 0, `Advance payments: ${counts.advancepayments} (Expected: 0)`);

    await mongoose.disconnect();

  } catch (err) {
    console.error('Fatal test error:', err);
    record('E2E Execution', false, `Unhandled error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n==============================================================================');
  console.log('📊 TEST SUMMARY RESULTS:');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED (SUCCESS)' : 'FAILURES DETECTED'}`);
  console.log('==============================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

run();
