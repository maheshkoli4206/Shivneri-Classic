import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const PROD_DB_NAME = 'shivneri_classic_prod_db';
const ADMIN_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/?authSource=admin`;
const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${PROD_DB_NAME}?authSource=admin`;

export async function rollbackProductionDatabase() {
  console.log('================================================================');
  console.log('🔄 EMERGENCY / SAFETY ROLLBACK: RESTORING VERIFIED PRODUCTION BACKUP');
  console.log('Database:', PROD_DB_NAME);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const backupDir = path.resolve(__dirname, '..', 'backups', 'fresh_reset_20261104_203250');
  const archivePath = path.join(backupDir, 'shivneri_classic_prod_db_backup.gz');
  const checksumPath = path.join(backupDir, 'checksum.sha256');

  if (!fs.existsSync(archivePath) || !fs.existsSync(checksumPath)) {
    throw new Error('ROLLBACK_ERROR: Verified backup archive missing at ' + archivePath);
  }

  // 1. Checksum verification
  console.log('Step 1: Cryptographic SHA-256 verification...');
  const checksumContent = fs.readFileSync(checksumPath, 'utf8').trim();
  const expectedHash = checksumContent.split(/\s+/)[0];
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');

  if (actualHash !== expectedHash) {
    throw new Error(`ROLLBACK_ABORT: Archive checksum ${actualHash} did not match reference ${expectedHash}`);
  }
  console.log('  ✓ Verified Archive SHA-256:', actualHash);

  // 2. Execute mongorestore
  console.log('\nStep 2: Executing mongorestore --drop ...');
  const restoreArgs = [
    `--uri=${ADMIN_URI}`,
    `--nsInclude=${PROD_DB_NAME}.*`,
    `--archive=${archivePath}`,
    '--gzip',
    '--drop'
  ];

  await execFileAsync(MONGORESTORE_PATH, restoreArgs);
  console.log('  ✓ mongorestore completed.');

  // 3. Verify parity
  console.log('\nStep 3: Verifying restored document counts...');
  await mongoose.connect(PROD_URI);
  const db = mongoose.connection.db;

  const counts = {
    residents: await db.collection('residents').countDocuments(),
    admins: await db.collection('admins').countDocuments(),
    maintenancedues: await db.collection('maintenancedues').countDocuments(),
    payments: await db.collection('payments').countDocuments(),
    counters: await db.collection('counters').countDocuments(),
    auditlogs: await db.collection('auditlogs').countDocuments(),
    maintenanceconfigs: await db.collection('maintenanceconfigs').countDocuments(),
    expensecategories: await db.collection('expensecategories').countDocuments()
  };
  await mongoose.disconnect();

  console.table(counts);

  if (counts.residents !== 20 || counts.maintenancedues !== 56 || counts.payments !== 3) {
    throw new Error('ROLLBACK_PARITY_ERROR: Restored counts do not match pre-reset census!');
  }

  console.log('\n🎉 PRODUCTION DATABASE 100% RESTORED TO PRE-RESET STATE!');
  return counts;
}

if (process.argv[2] === '--rollback-confirmed') {
  rollbackProductionDatabase().catch(err => {
    console.error('Rollback error:', err);
    process.exit(1);
  });
}

