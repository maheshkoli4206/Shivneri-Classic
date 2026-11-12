import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import AuditLog from './src/models/AuditLog.js';
import Admin from './src/models/Admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const PROD_DB_NAME = 'shivneri_classic_prod_db';
const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${PROD_DB_NAME}?authSource=admin`;

export async function executeFinancialReset() {
  console.log('================================================================');
  console.log('⚠️ EXECUTING FRESH PRODUCTION FINANCIAL RESET (REVISED PLAN)');
  console.log('Database:', PROD_DB_NAME);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // Verify fresh backup exists and matches checksum
  const backupDir = path.resolve(__dirname, '..', 'backups', 'fresh_reset_20261104_203250');
  const archivePath = path.join(backupDir, 'shivneri_classic_prod_db_backup.gz');
  const checksumPath = path.join(backupDir, 'checksum.sha256');

  if (!fs.existsSync(archivePath) || !fs.existsSync(checksumPath)) {
    throw new Error('BACKUP_VERIFICATION_FAILED: Required fresh backup files are missing!');
  }

  const checksumContent = fs.readFileSync(checksumPath, 'utf8').trim();
  const expectedHash = checksumContent.split(/\s+/)[0];
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');

  if (actualHash !== expectedHash) {
    throw new Error(`BACKUP_CHECKSUM_MISMATCH: Archive hash ${actualHash} does not match reference ${expectedHash}!`);
  }
  console.log('✅ Pre-Execution Safety Check Passed: Verified fresh backup SHA-256:', actualHash);

  await mongoose.connect(PROD_URI);
  const db = mongoose.connection.db;

  try {
    const admin = await Admin.findOne({ username: 'laxman_koli' });
    if (!admin) {
      throw new Error('SUPER_ADMIN_NOT_FOUND: Admin account "laxman_koli" is missing!');
    }

    // Safety Gate: Re-confirm exact pre-execution census counts match approved report
    console.log('\n--- PRE-EXECUTION CENSUS VERIFICATION ---');
    const preCounts = {
      maintenancedues: await db.collection('maintenancedues').countDocuments(),
      payments: await db.collection('payments').countDocuments(),
      residents: await db.collection('residents').countDocuments(),
      admins: await db.collection('admins').countDocuments(),
      maintenanceconfigs: await db.collection('maintenanceconfigs').countDocuments(),
      expensecategories: await db.collection('expensecategories').countDocuments(),
      counters: await db.collection('counters').countDocuments(),
      auditlogs: await db.collection('auditlogs').countDocuments(),
      expenses: await db.collection('expenses').countDocuments(),
      cashbookopeningbalances: await db.collection('cashbookopeningbalances').countDocuments()
    };
    console.table(preCounts);

    if (
      preCounts.maintenancedues !== 56 ||
      preCounts.payments !== 3 ||
      preCounts.residents !== 20 ||
      preCounts.admins !== 1 ||
      preCounts.counters !== 1 ||
      preCounts.auditlogs !== 8 ||
      preCounts.expenses !== 0 ||
      preCounts.cashbookopeningbalances !== 0
    ) {
      throw new Error('SAFETY_ABORT: Pre-execution counts do not strictly match approved report! Aborting without deleting anything.');
    }
    console.log('✅ Pre-Execution Counts 100% Validated against Approved Dry-Run Report.');

    console.log('\n--- 1. DELETING TARGET FINANCIAL RECORDS ONLY (59 RECORDS) ---');
    
    // 1. Maintenance Dues (56 records)
    const duesRes = await db.collection('maintenancedues').deleteMany({});
    console.log(`  ✓ Maintenance Dues: Deleted ${duesRes.deletedCount} documents (Expected: 56)`);

    // 2. Payments (3 records)
    const payRes = await db.collection('payments').deleteMany({});
    console.log(`  ✓ Payments: Deleted ${payRes.deletedCount} documents (Expected: 3)`);

    // 3. Expenses (0 records)
    const expRes = await db.collection('expenses').deleteMany({});
    console.log(`  ✓ Expenses: Deleted ${expRes.deletedCount} documents (Expected: 0)`);

    // 4. Cashbook Opening Balance (0 records)
    const obRes = await db.collection('cashbookopeningbalances').deleteMany({});
    console.log(`  ✓ Cashbook Opening Balances: Deleted ${obRes.deletedCount} documents (Expected: 0)`);

    // 5. Counters: PRESERVED (NOT DELETED)
    const counterCount = await db.collection('counters').countDocuments();
    console.log(`  ✓ Sequential Counters: PRESERVED intact (${counterCount} counter, preserving sequence continuity)`);

    // 6. Audit Logs: PRESERVED 100% IN FULL (NOT DELETED)
    const preLogCount = await db.collection('auditlogs').countDocuments();
    console.log(`  ✓ Existing Audit Trail: PRESERVED 100% in full (${preLogCount} existing logs preserved)`);

    // 7. Append Exactly One New Immutable Reset Event to Audit Trail
    const resetLog = await AuditLog.create({
      action: 'FINANCIAL_OPERATIONAL_RESET',
      performedByAdminId: admin._id,
      entityType: 'ADMIN',
      entityId: admin._id,
      details: {
        reason: 'Fresh production financial reset for client demonstration and operational start',
        deletedCounts: {
          maintenancedues: duesRes.deletedCount,
          payments: payRes.deletedCount,
          expenses: expRes.deletedCount,
          cashbookopeningbalances: obRes.deletedCount,
          totalDeleted: duesRes.deletedCount + payRes.deletedCount + expRes.deletedCount + obRes.deletedCount
        },
        preservedCounts: {
          residents: await db.collection('residents').countDocuments(),
          admins: await db.collection('admins').countDocuments(),
          maintenanceconfigs: await db.collection('maintenanceconfigs').countDocuments(),
          expensecategories: await db.collection('expensecategories').countDocuments(),
          counters: counterCount,
          auditLogsPreserved: preLogCount
        },
        verifiedBackupArchive: 'fresh_reset_20261104_203250',
        verifiedBackupSha256: actualHash
      }
    });
    console.log(`  ✓ Appended Immutable Reset Event: FINANCIAL_OPERATIONAL_RESET (Log ID: ${resetLog._id})`);

    // --- VERIFICATION OF POST-RESET STATE ---
    console.log('\n--- 2. POST-RESET VERIFICATION ---');
    const postCounts = {
      residents: await db.collection('residents').countDocuments(),
      admins: await db.collection('admins').countDocuments(),
      maintenanceconfigs: await db.collection('maintenanceconfigs').countDocuments(),
      expensecategories: await db.collection('expensecategories').countDocuments(),
      counters: await db.collection('counters').countDocuments(),
      auditlogs: await db.collection('auditlogs').countDocuments(),
      maintenancedues: await db.collection('maintenancedues').countDocuments(),
      payments: await db.collection('payments').countDocuments(),
      expenses: await db.collection('expenses').countDocuments(),
      cashbookopeningbalances: await db.collection('cashbookopeningbalances').countDocuments()
    };
    console.table(postCounts);

    if (postCounts.residents !== 20) throw new Error(`RESIDENT_COUNT_ERROR: Expected 20, got ${postCounts.residents}`);
    if (postCounts.admins !== 1) throw new Error(`ADMIN_COUNT_ERROR: Expected 1, got ${postCounts.admins}`);
    if (postCounts.counters !== 1) throw new Error(`COUNTER_COUNT_ERROR: Expected 1, got ${postCounts.counters}`);
    if (postCounts.auditlogs !== preLogCount + 1) throw new Error(`AUDIT_COUNT_ERROR: Expected ${preLogCount + 1}, got ${postCounts.auditlogs}`);
    if (postCounts.maintenancedues !== 0) throw new Error(`DUES_NOT_ZERO: Expected 0, got ${postCounts.maintenancedues}`);
    if (postCounts.payments !== 0) throw new Error(`PAYMENTS_NOT_ZERO: Expected 0, got ${postCounts.payments}`);

    console.log('\n🎉 ALL POST-RESET INVARIANTS VERIFIED SUCCESSFULLY!');
    return postCounts;

  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[2] === '--execute-confirmed') {
  executeFinancialReset().catch(err => {
    console.error('Execution error:', err);
    process.exit(1);
  });
}
