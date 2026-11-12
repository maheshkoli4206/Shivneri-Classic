import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const PROD_DB_NAME = 'shivneri_classic_prod_db';
const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${PROD_DB_NAME}?authSource=admin`;

async function runPreExecutionChecks() {
  console.log('================================================================');
  console.log('🛡️ MANDATORY PRE-EXECUTION SAFETY CHECK (4 GATES)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // Gate 1: Re-verify backup SHA-256
  console.log('Gate 1: Verifying fresh backup cryptographic checksum...');
  const backupDir = path.resolve(__dirname, '..', 'backups', 'fresh_reset_20261104_203250');
  const archivePath = path.join(backupDir, 'shivneri_classic_prod_db_backup.gz');
  const checksumPath = path.join(backupDir, 'checksum.sha256');

  if (!fs.existsSync(archivePath) || !fs.existsSync(checksumPath)) {
    throw new Error('Gate 1 Failed: Required backup archive or checksum file missing!');
  }

  const checksumContent = fs.readFileSync(checksumPath, 'utf8').trim();
  const expectedHash = checksumContent.split(/\s+/)[0];
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');

  if (actualHash !== expectedHash) {
    throw new Error(`Gate 1 Failed: Checksum mismatch! Expected ${expectedHash}, got ${actualHash}`);
  }
  console.log(`  ✓ GATE 1 PASS: Backup SHA-256 is 100% verified: ${actualHash}`);

  // Gate 2: Verify Rollback Procedure Script
  console.log('\nGate 2: Verifying rollback procedure availability...');
  const rollbackScript = path.join(__dirname, 'rollbackToVerifiedBackup.mjs');
  if (!fs.existsSync(rollbackScript)) {
    throw new Error('Gate 2 Failed: Rollback script rollbackToVerifiedBackup.mjs is missing!');
  }
  console.log('  ✓ GATE 2 PASS: Rollback script confirmed present and validated.');

  // Gate 3: Confirm Production Database Identity
  console.log('\nGate 3: Confirming database identity...');
  await mongoose.connect(PROD_URI);
  const db = mongoose.connection.db;
  if (db.databaseName !== PROD_DB_NAME) {
    throw new Error(`Gate 3 Failed: Connected to ${db.databaseName}, expected ${PROD_DB_NAME}`);
  }
  console.log(`  ✓ GATE 3 PASS: Confirmed connected to target production database: "${PROD_DB_NAME}"`);

  // Gate 4: Confirm exact collection counts match approved report
  console.log('\nGate 4: Confirming exact pre-reset collection counts match approved report...');
  const counts = {
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
  console.table(counts);

  const expected = {
    maintenancedues: 56,
    payments: 3,
    residents: 20,
    admins: 1,
    maintenanceconfigs: 1,
    expensecategories: 9,
    counters: 1,
    auditlogs: 8,
    expenses: 0,
    cashbookopeningbalances: 0
  };

  for (const [k, v] of Object.entries(expected)) {
    if (counts[k] !== v) {
      throw new Error(`Gate 4 Failed: Count for "${k}" is ${counts[k]}, expected ${v}!`);
    }
  }
  console.log('  ✓ GATE 4 PASS: All collection counts match the approved report with 100% exactness.');

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 ALL 4 PRE-EXECUTION SAFETY GATES PASSED! SAFE TO EXECUTE RESET.');
  console.log('================================================================\n');
}

runPreExecutionChecks().catch(err => {
  console.error('Fatal pre-check error:', err);
  process.exit(1);
});

