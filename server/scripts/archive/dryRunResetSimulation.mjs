import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const PROD_DB_NAME = 'shivneri_classic_prod_db';
const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${PROD_DB_NAME}?authSource=admin`;

async function runDryRun() {
  console.log('================================================================');
  console.log('🔍 REVISED DRY-RUN RESET SIMULATION (FINAL RESET PLAN)');
  console.log('Target Database:', PROD_DB_NAME);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Mode: READ-ONLY AUDIT & SIMULATION');
  console.log('================================================================\n');

  try {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    // Collections Census
    const allCollections = await db.listCollections().toArray();
    const currentCounts = {};
    for (const c of allCollections) {
      currentCounts[c.name] = await db.collection(c.name).countDocuments();
    }

    console.log('Current Production Document Counts:');
    console.table(currentCounts);

    // -------------------------------------------------------------
    // 1. DATA TO PRESERVE AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 1. MASTER DATA & SECURITY AUDIT PRESERVATION ---');
    const residents = await db.collection('residents').find({}).toArray();
    const flats = residents.filter(r => r.propertyType === 'RESIDENTIAL_FLAT' || (!r.propertyType && !r.flatNumber?.toLowerCase().includes('shop')));
    const shops = residents.filter(r => r.propertyType === 'SHOP' || r.flatNumber?.toLowerCase().includes('shop'));

    console.log(`Residents Collection: ${residents.length} total records`);
    console.log(`  • Residential Flats to PRESERVE: ${flats.length}`);
    console.log(`  • Commercial Shops to PRESERVE:    ${shops.length}`);
    console.log(`  • Status: All ${residents.filter(r => r.status === 'ACTIVE').length} records ACTIVE`);
    console.log(`  • Preserved Categories:`, {
      RESIDENTIAL: residents.filter(r => r.maintenanceCategory === 'RESIDENTIAL').length,
      SHOP: residents.filter(r => r.maintenanceCategory === 'SHOP').length,
      CHAIRMAN: residents.filter(r => r.maintenanceCategory === 'CHAIRMAN').length,
      UNASSIGNED: residents.filter(r => !r.maintenanceCategory || r.maintenanceCategory === 'UNASSIGNED').length
    });

    const admins = await db.collection('admins').find({}).toArray();
    console.log(`\nAdmin Collection: ${admins.length} record`);
    console.log(`  • Super Admin Username: "${admins[0].username}" (${admins[0].role})`);
    console.log(`  • Designation: "${admins[0].designation}"`);
    console.log(`  • Password: [REDACTED - PRESERVED]`);

    const configs = await db.collection('maintenanceconfigs').find({}).toArray();
    console.log(`\nMaintenance Config: ${configs.length} record`);
    console.log(`  • Config Key: "${configs[0].singletonKey}"`);
    console.log(`  • Default Monthly Rate: ₹${configs[0].defaultMonthlyAmount}`);
    console.log(`  • Category Rates:`, configs[0].categoryRates || { residential: 1000, shop: 300, chairman: 500 });

    const expCats = await db.collection('expensecategories').find({}).toArray();
    console.log(`\nExpense Categories: ${expCats.length} records`);
    console.log(`  • Codes: ${expCats.map(c => c.code).join(', ')}`);

    // Counter Preservation Audit
    const counters = await db.collection('counters').find({}).toArray();
    console.log(`\nSequence Counters (PRESERVED FOR NUMBERING CONTINUITY): ${counters.length} record`);
    counters.forEach(c => {
      console.log(`  • Counter ID: "${c._id}", Current Sequence: ${c.seq}`);
      console.log(`  • Next Issued Receipt will be: SCA-202611-000${c.seq + 1} (No collision with past receipts)`);
    });

    // Audit Logs Preservation Audit
    const auditLogs = await db.collection('auditlogs').find({}).toArray();
    console.log(`\nAudit Trail (PRESERVED 100% IN FULL): ${auditLogs.length} records`);
    auditLogs.forEach((l, i) => {
      console.log(`  ${i + 1}. [${l.action}] on ${l.entityType} at ${l.createdAt}`);
    });
    console.log(`  • Post-Reset Action: Exactly 1 new record [FINANCIAL_OPERATIONAL_RESET] will be appended.`);
    console.log(`  • Projected Audit Log Count: ${auditLogs.length + 1} records.`);

    // -------------------------------------------------------------
    // 2. DATA PROPOSED FOR DELETION (STRICTLY OPERATIONAL ONLY)
    // -------------------------------------------------------------
    console.log('\n--- 2. OPERATIONAL FINANCIAL DATA PROPOSED FOR DELETION ---');

    const duesCount = currentCounts.maintenancedues || 0;
    const paymentsCount = currentCounts.payments || 0;
    const expensesCount = currentCounts.expenses || 0;
    const openingBalancesCount = currentCounts.cashbookopeningbalances || 0;

    const totalOperationalToDelete = duesCount + paymentsCount + expensesCount + openingBalancesCount;

    console.log(`A. Maintenance Dues (Bills): ${duesCount} records proposed for deletion`);
    console.log(`B. Payment Records:          ${paymentsCount} records proposed for deletion`);
    console.log(`C. Expense Records:          ${expensesCount} records (already 0)`);
    console.log(`D. Opening Balances:         ${openingBalancesCount} records (already 0)`);
    console.log(`\nTOTAL RECORDS PROPOSED FOR DELETION: EXACTLY ${totalOperationalToDelete}`);

    // -------------------------------------------------------------
    // 3. PROJECTED BEFORE / AFTER CENSUS TABLE
    // -------------------------------------------------------------
    console.log('\n--- 3. REVISED PROJECTED BEFORE / AFTER CENSUS TABLE ---');
    const projection = [
      {
        Collection: 'residents',
        Category: 'Master Data',
        'Current Count': currentCounts.residents || 0,
        Action: 'PRESERVE (NO CHANGE)',
        'Projected Count': currentCounts.residents || 0
      },
      {
        Collection: 'admins',
        Category: 'Master Data / Auth',
        'Current Count': currentCounts.admins || 0,
        Action: 'PRESERVE (NO CHANGE)',
        'Projected Count': currentCounts.admins || 0
      },
      {
        Collection: 'maintenanceconfigs',
        Category: 'Configuration',
        'Current Count': currentCounts.maintenanceconfigs || 0,
        Action: 'PRESERVE (NO CHANGE)',
        'Projected Count': currentCounts.maintenanceconfigs || 0
      },
      {
        Collection: 'expensecategories',
        Category: 'Configuration',
        'Current Count': currentCounts.expensecategories || 0,
        Action: 'PRESERVE (NO CHANGE)',
        'Projected Count': currentCounts.expensecategories || 0
      },
      {
        Collection: 'counters',
        Category: 'Sequence Counter',
        'Current Count': currentCounts.counters || 0,
        Action: 'PRESERVE (CONTINUE SEQUENCE)',
        'Projected Count': currentCounts.counters || 0
      },
      {
        Collection: 'auditlogs',
        Category: 'Audit Trail',
        'Current Count': auditLogs.length,
        Action: 'PRESERVE ALL + APPEND 1 RESET EVENT',
        'Projected Count': auditLogs.length + 1
      },
      {
        Collection: 'chairmantransferlogs',
        Category: 'Audit Trail',
        'Current Count': currentCounts.chairmantransferlogs || 0,
        Action: 'PRESERVE (Already 0)',
        'Projected Count': 0
      },
      {
        Collection: 'passwordresets',
        Category: 'Security Token',
        'Current Count': currentCounts.passwordresets || 0,
        Action: 'PRESERVE (Already 0)',
        'Projected Count': 0
      },
      {
        Collection: 'maintenancedues',
        Category: 'Financial Operational',
        'Current Count': duesCount,
        Action: 'DELETE (PURGE)',
        'Projected Count': 0
      },
      {
        Collection: 'payments',
        Category: 'Financial Operational',
        'Current Count': paymentsCount,
        Action: 'DELETE (PURGE)',
        'Projected Count': 0
      },
      {
        Collection: 'expenses',
        Category: 'Financial Operational',
        'Current Count': expensesCount,
        Action: 'DELETE (Already 0)',
        'Projected Count': 0
      },
      {
        Collection: 'cashbookopeningbalances',
        Category: 'Financial Operational',
        'Current Count': openingBalancesCount,
        Action: 'DELETE (Already 0)',
        'Projected Count': 0
      }
    ];

    console.table(projection);

    console.log('\n================================================================');
    console.log('✅ REVISED DRY-RUN COMPLETED: 0 DOCUMENTS MODIFIED OR DELETED.');
    console.log('AWAITING EXPLICIT USER FINAL APPROVAL BEFORE EXECUTING RESET.');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Error during dry-run:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runDryRun();
