import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const PROD_DB_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/shivneri_classic_prod_db?authSource=admin`;

async function runCensus() {
  console.log('================================================================');
  console.log('📊 SHIVNERI CLASSIC PRODUCTION DATABASE CENSUS');
  console.log('Target Database: shivneri_classic_prod_db');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  try {
    await mongoose.connect(PROD_DB_URI);
    const db = mongoose.connection.db;

    // 1. List all collections in prod DB
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in shivneri_classic_prod_db:\n`);

    const censusSummary = {};

    for (const coll of collections) {
      const name = coll.name;
      const count = await db.collection(name).countDocuments();
      censusSummary[name] = count;
      console.log(`📁 Collection: "${name}" -> ${count} documents`);
    }

    console.log('\n----------------------------------------------------------------');
    console.log('🔍 IN-DEPTH COLLECTION ANALYSIS');
    console.log('----------------------------------------------------------------\n');

    // 2. Residents Analysis
    if (db.collection('residents')) {
      const residents = await db.collection('residents').find({}).toArray();
      const residentialFlats = residents.filter(r => r.propertyType === 'RESIDENTIAL_FLAT' || (!r.propertyType && !r.flatNumber?.toLowerCase().includes('shop')));
      const shops = residents.filter(r => r.propertyType === 'SHOP' || r.flatNumber?.toLowerCase().includes('shop'));

      const categoryBreakdown = {
        RESIDENTIAL: residents.filter(r => r.maintenanceCategory === 'RESIDENTIAL').length,
        SHOP: residents.filter(r => r.maintenanceCategory === 'SHOP').length,
        CHAIRMAN: residents.filter(r => r.maintenanceCategory === 'CHAIRMAN').length,
        UNASSIGNED: residents.filter(r => !r.maintenanceCategory || r.maintenanceCategory === 'UNASSIGNED').length
      };

      console.log(`👥 RESIDENTS MASTER DATA (To be PRESERVED strictly):`);
      console.log(`   Total Residents: ${residents.length}`);
      console.log(`   - Residential Flats: ${residentialFlats.length}`);
      console.log(`   - Commercial Shops: ${shops.length}`);
      console.log(`   - Maintenance Categories:`, categoryBreakdown);
      console.log(`   - Active Status: ${residents.filter(r => r.status === 'ACTIVE').length} active, ${residents.filter(r => r.status === 'INACTIVE').length} inactive\n`);
      console.log(`   List of Flat Numbers:`, residentialFlats.map(r => r.flatNumber).sort().join(', '));
      console.log(`   List of Shop Numbers:`, shops.map(r => r.flatNumber).sort().join(', '));
    }

    // 3. Admin Account Analysis
    if (db.collection('admins')) {
      const admins = await db.collection('admins').find({}, { projection: { password: 0 } }).toArray();
      console.log(`\n👑 ADMIN ACCOUNTS (To be PRESERVED strictly):`);
      console.log(`   Total Admin Accounts: ${admins.length}`);
      admins.forEach(a => {
        console.log(`   - Username: "${a.username}", Role: "${a.role}", Designation: "${a.designation}", Email: "${a.recoveryEmail || 'None'}"`);
      });
    }

    // 4. Maintenance Config Analysis
    if (db.collection('maintenanceconfigs')) {
      const configs = await db.collection('maintenanceconfigs').find({}).toArray();
      console.log(`\n⚙️ MAINTENANCE CONFIGURATION (To be PRESERVED strictly):`);
      console.log(`   Total Configs: ${configs.length}`);
      if (configs.length > 0) {
        console.log(`   - Category Rates:`, configs[0].categoryRates);
        console.log(`   - Default Monthly Amount: ₹${configs[0].defaultMonthlyAmount}`);
        console.log(`   - Due Day: ${configs[0].dueDay}`);
      }
    }

    // 5. Expense Categories Analysis
    if (db.collection('expensecategories')) {
      const expCats = await db.collection('expensecategories').find({}).toArray();
      console.log(`\n🏷️ EXPENSE CATEGORIES (To be PRESERVED strictly):`);
      console.log(`   Total Standard Expense Categories: ${expCats.length}`);
      console.log(`   Categories:`, expCats.map(c => c.code).join(', '));
    }

    // 6. Financial Operational Records (Proposed for Deletion)
    console.log('\n----------------------------------------------------------------');
    console.log('🗑️ FINANCIAL & OPERATIONAL RECORDS (PROPOSED FOR FRESH RESET)');
    console.log('----------------------------------------------------------------\n');

    let totalFinancialRecords = 0;

    // Maintenance Dues
    if (db.collection('maintenancedues')) {
      const duesCount = await db.collection('maintenancedues').countDocuments();
      totalFinancialRecords += duesCount;
      const dues = await db.collection('maintenancedues').find({}).toArray();
      const duesTotalAmount = dues.reduce((sum, d) => sum + (d.totalAmountDue || 0), 0);
      const duesPaidAmount = dues.reduce((sum, d) => sum + (d.amountPaid || 0), 0);
      const duesBalance = dues.reduce((sum, d) => sum + (d.outstandingBalance || 0), 0);

      console.log(`📜 Maintenance Dues (Bills):`);
      console.log(`   Count: ${duesCount} documents`);
      console.log(`   Total Billed: ₹${duesTotalAmount.toLocaleString('en-IN')}`);
      console.log(`   Total Paid: ₹${duesPaidAmount.toLocaleString('en-IN')}`);
      console.log(`   Outstanding Balance: ₹${duesBalance.toLocaleString('en-IN')}`);
      const statusCounts = dues.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`   Status Breakdown:`, statusCounts);
    }

    // Payments / Receipts
    if (db.collection('payments')) {
      const paymentsCount = await db.collection('payments').countDocuments();
      totalFinancialRecords += paymentsCount;
      const payments = await db.collection('payments').find({}).toArray();
      const paymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      console.log(`\n💳 Payments & Receipts:`);
      console.log(`   Count: ${paymentsCount} documents`);
      console.log(`   Total Collected: ₹${paymentsTotal.toLocaleString('en-IN')}`);
      const receiptNumbers = payments.map(p => p.receiptNumber);
      console.log(`   Receipt Numbers Issued:`, receiptNumbers.length > 0 ? receiptNumbers.join(', ') : 'None');
    }

    // Expenses & Vouchers
    if (db.collection('expenses')) {
      const expensesCount = await db.collection('expenses').countDocuments();
      totalFinancialRecords += expensesCount;
      const expenses = await db.collection('expenses').find({}).toArray();
      const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      console.log(`\n💸 Expenses & Vouchers:`);
      console.log(`   Count: ${expensesCount} documents`);
      console.log(`   Total Expenditure: ₹${expensesTotal.toLocaleString('en-IN')}`);
    }

    // Cashbook Opening Balance
    if (db.collection('cashbookopeningbalances')) {
      const openingCount = await db.collection('cashbookopeningbalances').countDocuments();
      totalFinancialRecords += openingCount;
      const openings = await db.collection('cashbookopeningbalances').find({}).toArray();
      console.log(`\n🏦 Cashbook Opening Balance:`);
      console.log(`   Count: ${openingCount} documents`);
      if (openings.length > 0) {
        console.log(`   Current Opening Balances:`, {
          cash: openings[0].cashAmount,
          bank: openings[0].bankAmount,
          upi: openings[0].upiAmount,
          cheque: openings[0].chequeAmount,
          isConfigured: openings[0].isConfigured
        });
      }
    }

    // Counters / Sequences
    if (db.collection('counters')) {
      const counters = await db.collection('counters').find({}).toArray();
      console.log(`\n🔢 Sequence Counters:`);
      console.log(`   Count: ${counters.length} documents`);
      counters.forEach(c => {
        console.log(`   - Counter ID: "${c._id}", Current Sequence: ${c.seq}`);
      });
    }

    // Audit Logs & Security History
    if (db.collection('auditlogs')) {
      const auditCount = await db.collection('auditlogs').countDocuments();
      const logs = await db.collection('auditlogs').find({}).toArray();
      const actions = logs.reduce((acc, l) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {});
      console.log(`\n🛡️ Audit Logs (Security History):`);
      console.log(`   Total Audit Logs: ${auditCount} documents`);
      console.log(`   Action Breakdown:`, actions);
      console.log(`   Individual Logs:`);
      logs.forEach((l, idx) => {
        console.log(`     ${idx + 1}. Action: ${l.action}, Entity: ${l.entityType}, Time: ${l.createdAt}`);
      });
    }

    // Chairman Transfer Logs
    if (db.collection('chairmantransferlogs')) {
      const transferCount = await db.collection('chairmantransferlogs').countDocuments();
      console.log(`\n🏛️ Chairman Transfer Logs: ${transferCount} documents`);
    }

    // Password Resets
    if (db.collection('passwordresets')) {
      const resetCount = await db.collection('passwordresets').countDocuments();
      console.log(`\n🔑 Password Reset Tokens/OTP: ${resetCount} documents`);
    }

    console.log('\n================================================================');
    console.log(`🎯 TOTAL FINANCIAL OPERATIONAL RECORDS PROPOSED FOR RESET: ${totalFinancialRecords}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error during census:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runCensus();
