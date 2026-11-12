import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGORESTORE_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const TARGET_DB_NAME = 'shivneri_classic_prod_db';
const ADMIN_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/?authSource=admin`;
const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${TARGET_DB_NAME}?authSource=admin`;

async function recoverResidentMasterData() {
  console.log('================================================================');
  console.log('🚨 SHIVNERI CLASSIC - SELECTIVE RESIDENT MASTER DATA RECOVERY');
  console.log('Target Database:', TARGET_DB_NAME);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const backupDir = path.resolve(__dirname, '..', 'backups', 'fresh_reset_20261104_203250');
  const archivePath = path.join(backupDir, 'shivneri_classic_prod_db_backup.gz');

  if (!fs.existsSync(archivePath)) {
    throw new Error('FATAL: Verified backup archive not found at ' + archivePath);
  }

  // 1. Pre-recovery Census in production database
  await mongoose.connect(PROD_URI);
  const db = mongoose.connection.db;

  if (db.databaseName !== TARGET_DB_NAME) {
    throw new Error(`CRITICAL ABORT: Connected to ${db.databaseName} instead of ${TARGET_DB_NAME}`);
  }

  console.log('--- 1. PRE-RECOVERY CENSUS IN PRODUCTION ---');
  const allCols = await db.listCollections().toArray();
  const preCounts = {};
  for (const c of allCols) {
    const cnt = await db.collection(c.name).countDocuments();
    preCounts[c.name] = cnt;
    console.log(`  📁 ${c.name.padEnd(25)} : ${cnt} documents`);
  }

  if (preCounts.residents !== 0) {
    console.warn(`  ⚠️ Warning: residents collection already contains ${preCounts.residents} documents.`);
  }

  await mongoose.disconnect();

  // 2. Execute Selective Restore: ONLY residents collection
  console.log('\n--- 2. EXECUTING SELECTIVE MONGORESTORE (RESIDENTS ONLY) ---');
  console.log(`Extracting ONLY "shivneri_classic_prod_db.residents" from archive...`);
  
  const restoreArgs = [
    `--uri=${ADMIN_URI}`,
    `--nsInclude=${TARGET_DB_NAME}.residents`,
    `--archive=${archivePath}`,
    '--gzip'
    // Note: No --drop on database level. It restores only into residents.
  ];

  const { stdout, stderr } = await execFileAsync(MONGORESTORE_PATH, restoreArgs);
  console.log(stdout || stderr || '✓ mongorestore finished with exit code 0.');

  // 3. Post-recovery Census and Parity Verification
  console.log('\n--- 3. POST-RECOVERY PARITY CENSUS ---');
  await mongoose.connect(PROD_URI);
  const prodDb = mongoose.connection.db;

  const postCounts = {};
  for (const c of allCols) {
    const cnt = await prodDb.collection(c.name).countDocuments();
    postCounts[c.name] = cnt;
    console.log(`  📁 ${c.name.padEnd(25)} : ${cnt} documents`);
  }

  // 4. Verify Resident Details
  console.log('\n--- 4. RECOVERED RESIDENTS INTEGRITY CHECK ---');
  const residents = await prodDb.collection('residents').find({}).sort({ flatNumber: 1 }).toArray();
  console.log(`Total Residents Recovered: ${residents.length}`);

  let duplicates = 0;
  const flatSet = new Set();
  for (const r of residents) {
    const key = `${r.wing}-${r.flatNumber}`;
    if (flatSet.has(key)) {
      duplicates++;
      console.error(`  ❌ Duplicate flat detected: ${key}`);
    }
    flatSet.add(key);
    console.log(`  ✓ [${r.propertyType || r.maintenanceCategory}] ${(r.flatNumber || '').padEnd(12)}: ${r.fullNameMarathi} | Category: ${r.maintenanceCategory} | ID: ${r._id}`);
  }

  // 5. Verify Zero Accounting Data Invariant
  console.log('\n--- 5. ZERO FINANCIAL ACCOUNTING INVARIANT CHECK ---');
  const financialTotals = {
    dues: postCounts.maintenancedues,
    payments: postCounts.payments,
    advances: postCounts.advancepayments,
    expenses: postCounts.expenses,
    cashbook: postCounts.cashbookopeningbalances,
    counters: postCounts.counters,
    auditlogs: postCounts.auditlogs
  };
  console.table(financialTotals);

  const isFinancialZero = Object.values(financialTotals).every(v => v === 0);
  if (!isFinancialZero) {
    throw new Error('CRITICAL INTEGRITY FAILURE: Financial accounting data is NOT zero!');
  }
  console.log('✓ Invariant Verified: ALL 7 accounting & transactional collections remain at EXACTLY 0 documents.');

  // 6. Verify Super Admin Intact
  const admin = await prodDb.collection('admins').findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
  if (!admin || admin.username !== 'laxman_koli') {
    throw new Error('CRITICAL: Super Admin account corrupted!');
  }
  console.log(`✓ Super Admin Intact: ${admin.fullNameMarathi} (${admin.username})`);

  await mongoose.disconnect();

  if (residents.length !== 20 || duplicates > 0) {
    throw new Error(`RECOVERY_ERROR: Expected 20 unique residents, found ${residents.length} with ${duplicates} duplicates.`);
  }

  console.log('\n================================================================');
  console.log('🎉 RESIDENT MASTER DATA RECOVERY 100% SUCCESSFUL & VERIFIED!');
  console.log('================================================================');

  return {
    preCounts,
    postCounts,
    recoveredCount: residents.length,
    residents
  };
}

recoverResidentMasterData().catch(err => {
  console.error('Selective recovery failed:', err);
  process.exit(1);
});

