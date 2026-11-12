import puppeteer from 'puppeteer-core';
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
  console.log('🔍 SHIVNERI CLASSIC – EXPENSES & CASHBOOK E2E VERIFICATION SUITE');
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
        '--window-size=1280,900'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const browserErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        if (!msg.text().includes('401')) {
          browserErrors.push(msg.text());
        }
        console.log('[BROWSER ERROR]:', msg.text());
      }
    });
    page.on('pageerror', err => {
      browserErrors.push(err.message);
      console.log('[BROWSER UNCAUGHT]:', err.message);
    });

    // Step 1: Open Login Page
    console.log('2. Navigating to Login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 15000 });
    record('Login Page Navigation', page.url().includes('/login'), `Loaded URL: ${page.url()}`);

    // Step 2: Perform Login
    console.log('3. Logging in as Laxman Koli...');
    await page.type('input[type="text"], input[name="username"]', ADMIN_USER);
    await page.type('input[type="password"], input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Wait for Dashboard navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    const postLoginUrl = page.url();
    record('Admin Authentication', !postLoginUrl.includes('/login'), `Redirected to: ${postLoginUrl}`);

    // Step 3: Navigate to Expenses Page
    console.log('4. Navigating to Expenses & Cashbook page...');
    await page.goto(`${BASE_URL}/expenses`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    record('Expenses Page Navigation', page.url().includes('/expenses'), `Current URL: ${page.url()}`);

    // Step 4: Verify Cashbook Tab (Issue 2)
    console.log('5. Inspecting Chronological Cashbook Ledger & NaN calculation...');
    
    // Check summary card values
    const summaryCardsText = await page.evaluate(() => {
      const el = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
      return el ? el.innerText : '';
    });
    console.log('Summary Cards Text:\n', summaryCardsText);

    const hasNaNInSummary = summaryCardsText.includes('NaN');
    record('Cashbook Summary Cards NaN Check', !hasNaNInSummary, `NaN found in summary: ${hasNaNInSummary}`);

    // Check table ledger entries
    const tableData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(r => {
        const cells = Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim());
        return {
          date: cells[0] || '',
          type: cells[1] || '',
          title: cells[2] || '',
          mode: cells[3] || '',
          ref: cells[4] || '',
          amountIn: cells[5] || '',
          amountOut: cells[6] || '',
          balance: cells[7] || ''
        };
      });
    });

    console.log(`Cashbook ledger contains ${tableData.length} entries.`);
    record('Cashbook Ledger Row Count', tableData.length === 17, `Found ${tableData.length} rows (expected 17: 15 COMPLETED income + 2 expense, 1 payment cancelled)`);

    let nanCount = 0;
    let incomeValidCount = 0;
    let expenseValidCount = 0;
    let runningBalanceValidCount = 0;

    tableData.forEach((row, idx) => {
      if (
        row.amountIn.includes('NaN') ||
        row.amountOut.includes('NaN') ||
        row.balance.includes('NaN') ||
        row.title.includes('NaN')
      ) {
        nanCount++;
        console.error(`Row ${idx + 1} has NaN:`, row);
      }

      if (row.type.includes('INCOME') || row.type.includes('जमा')) {
        if (row.amountIn.startsWith('+₹') && !row.amountIn.includes('NaN')) {
          incomeValidCount++;
        }
      } else if (row.type.includes('EXPENSE') || row.type.includes('खर्च')) {
        if (row.amountOut.startsWith('-₹') && !row.amountOut.includes('NaN')) {
          expenseValidCount++;
        }
      }

      if (row.balance.startsWith('₹') && !row.balance.includes('NaN')) {
        runningBalanceValidCount++;
      }
    });

    record('Zero NaN in Cashbook Rows', nanCount === 0, `NaN occurrences: ${nanCount}`);
    record('Valid Positive Currency Income Inflows', incomeValidCount === 15, `Valid income rows: ${incomeValidCount} / 15`);
    record('Valid Outflow Expense Rows', expenseValidCount === 2, `Valid expense rows: ${expenseValidCount} / 2`);
    record('Valid Running Balances', runningBalanceValidCount === 17, `Valid running balances: ${runningBalanceValidCount} / 17`);

    // Take screenshot of Cashbook Ledger
    const ss1Path = path.join(ARTIFACT_DIR, 'expenses_01_cashbook_ledger_fixed.png');
    await page.screenshot({ path: ss1Path, fullPage: true });
    record('Cashbook Ledger Screenshot', fs.existsSync(ss1Path), `Saved to ${ss1Path}`);

    // Step 5: Verify Add Expense Form Category Dropdown (Issue 1)
    console.log('6. Inspecting Add Expense Category Dropdown (Issue 1)...');
    
    // Switch to 'record' tab
    const tabButtons = await page.$$('div.flex.flex-wrap.items-center.bg-slate-100 button');
    if (tabButtons.length >= 3) {
      await tabButtons[2].click(); // Tab 3 is Add Expense
      await new Promise(r => setTimeout(r, 1000));
    }

    // Inspect select[name="category"]
    const categoryOptions = await page.evaluate(() => {
      const select = document.querySelector('select[name="category"]');
      if (!select) return null;
      return {
        disabled: select.disabled,
        value: select.value,
        options: Array.from(select.options).map(o => ({
          value: o.value,
          text: o.text
        }))
      };
    });

    console.log('Record Expense Category Dropdown:', categoryOptions);
    record('Record Form Category Select Exists', !!categoryOptions, 'select[name="category"] found');
    record('Record Form Category Not Disabled', categoryOptions && !categoryOptions.disabled, 'Dropdown is enabled');
    record(
      'Record Form 9 Categories Loaded',
      categoryOptions && categoryOptions.options.length === 9,
      `Options count: ${categoryOptions?.options?.length} (expected 9)`
    );

    const hasObjectInOptions = categoryOptions?.options?.some(o => o.value.includes('[object') || o.text.includes('[object'));
    record('No [object Object] in Category Options', !hasObjectInOptions, `Has [object Object]: ${hasObjectInOptions}`);

    const hasElectricity = categoryOptions?.options?.some(o => o.value === 'ELECTRICITY');
    record('ELECTRICITY Category Present', hasElectricity, 'ELECTRICITY found with correct value');

    // Take screenshot of Add Expense Form
    const ss2Path = path.join(ARTIFACT_DIR, 'expenses_02_record_expense_form.png');
    await page.screenshot({ path: ss2Path, fullPage: true });
    record('Add Expense Form Screenshot', fs.existsSync(ss2Path), `Saved to ${ss2Path}`);

    // Step 6: Verify Expense Register Tab & Filter Category Dropdown
    console.log('7. Inspecting Expense Register Tab & Filter Category Dropdown...');
    if (tabButtons.length >= 2) {
      await tabButtons[1].click(); // Tab 2 is Register
      await new Promise(r => setTimeout(r, 1000));
    }

    const filterCatOptions = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      // Find category filter (the one with All Categories as first option)
      for (const sel of selects) {
        if (sel.options.length >= 10 && (sel.options[0].text.includes('वर्गवारी') || sel.options[0].text.includes('Categories'))) {
          return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
        }
      }
      return null;
    });

    console.log(`Filter Category Options count: ${filterCatOptions?.length}`);
    record(
      'Filter Category Dropdown 10 Options (All + 9 Categories)',
      filterCatOptions && filterCatOptions.length === 10,
      `Found ${filterCatOptions?.length} options`
    );

    // Check expense vouchers rendered in table
    const registerTableRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(r => Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim()));
    });

    console.log('Expense Register Rows count:', registerTableRows.length);
    record('Expense Register 2 Vouchers Present', registerTableRows.length === 2, `Found ${registerTableRows.length} vouchers`);

    // Take screenshot of Expense Register
    const ss3Path = path.join(ARTIFACT_DIR, 'expenses_03_expense_register.png');
    await page.screenshot({ path: ss3Path, fullPage: true });
    record('Expense Register Screenshot', fs.existsSync(ss3Path), `Saved to ${ss3Path}`);

    // Step 7.1: Verify English Language Switch
    console.log('7.1 Switching language to English to verify bilingual category labels...');
    await page.evaluate(() => {
      localStorage.setItem('shivneri_lang', 'en');
      window.location.reload();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Switch to record tab in English
    const enTabButtons = await page.$$('div.flex.flex-wrap.items-center.bg-slate-100 button');
    if (enTabButtons.length >= 3) {
      await enTabButtons[2].click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const enCategoryOptions = await page.evaluate(() => {
      const select = document.querySelector('select[name="category"]');
      if (!select) return null;
      return Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
    });

    console.log('English Category Options:', enCategoryOptions);
    const hasEnglishElectricity = enCategoryOptions?.some(o => o.value === 'ELECTRICITY' && o.text === 'Electricity');
    const hasEnglishWater = enCategoryOptions?.some(o => o.value === 'WATER' && o.text === 'Water Supply');
    record('English Language Category Labels', hasEnglishElectricity && hasEnglishWater, `Electricity: ${hasEnglishElectricity}, Water: ${hasEnglishWater}`);

    // Take screenshot of English Form
    const ss4Path = path.join(ARTIFACT_DIR, 'expenses_04_english_labels.png');
    await page.screenshot({ path: ss4Path, fullPage: true });
    record('English Category Screenshot', fs.existsSync(ss4Path), `Saved to ${ss4Path}`);

    // Switch back to Marathi
    await page.evaluate(() => {
      localStorage.setItem('shivneri_lang', 'mr');
    });

    // Check browser console errors
    record('Zero Critical Browser Errors', browserErrors.length === 0, `Errors logged: ${browserErrors.length}`);

  } catch (err) {
    console.error('Fatal E2E error:', err);
    record('E2E Execution', false, err.message);
  } finally {
    if (browser) await browser.close();
  }

  // Step 7: Database Census Verification
  console.log('\n8. Performing Production Database Census Verification...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const residentCount = await db.collection('residents').countDocuments();
  const dueCount = await db.collection('maintenancedues').countDocuments();
  const paymentCount = await db.collection('payments').countDocuments();
  const expenseCount = await db.collection('expenses').countDocuments();
  const catCount = await db.collection('expensecategories').countDocuments();
  const adminCount = await db.collection('admins').countDocuments();

  await mongoose.disconnect();

  record('Census: 20 Residents Intact', residentCount === 20, `Residents count: ${residentCount}`);
  record('Census: 32 Maintenance Dues Intact', dueCount === 32, `Dues count: ${dueCount}`);
  record('Census: 16 Payments Intact', paymentCount === 16, `Payments count: ${paymentCount}`);
  record('Census: 2 Expenses Intact', expenseCount === 2, `Expenses count: ${expenseCount}`);
  record('Census: 9 Expense Categories Intact', catCount === 9, `Expense categories count: ${catCount}`);
  record('Census: 1 Admin Account Intact', adminCount === 1, `Admins count: ${adminCount}`);

  console.log('\n==============================================================================');
  console.log('📊 FINAL SUMMARY RESULTS');
  console.log('==============================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.passed).length}`);
  console.log(`FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('==============================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

run();
