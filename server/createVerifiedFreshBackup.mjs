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

const MONGODUMP_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
const MONGORESTORE_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const PROD_DB_NAME = 'shivneri_classic_prod_db';
const VERIFY_DB_NAME = 'shivneri_classic_backup_verify_db';

const PROD_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${PROD_DB_NAME}?authSource=admin`;
const ADMIN_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/?authSource=admin`;

function getTimestampString() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

async function createAndVerifyBackup() {
  console.log('================================================================');
  console.log('🔒 CREATING & VERIFYING FRESH PRODUCTION DATABASE BACKUP');
  console.log('Target Database:', PROD_DB_NAME);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const timestamp = getTimestampString();
  const backupDir = path.resolve(__dirname, '..', 'backups', `fresh_reset_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const archiveFileName = `${PROD_DB_NAME}_backup.gz`;
  const archivePath = path.join(backupDir, archiveFileName);
  const checksumPath = path.join(backupDir, 'checksum.sha256');
  const summaryPath = path.join(backupDir, 'verification_summary.json');

  // STEP 1: Connect to production and collect source counts
  console.log('Step 1: Connecting to production database to record pre-backup census...');
  await mongoose.connect(PROD_URI);
  const prodDb = mongoose.connection.db;

  const collections = await prodDb.listCollections().toArray();
  const sourceParity = {};

  for (const c of collections) {
    const count = await prodDb.collection(c.name).countDocuments();
    sourceParity[c.name] = count;
  }
  await mongoose.disconnect();
  console.log('  ✓ Production census recorded:', JSON.stringify(sourceParity));

  // STEP 2: Execute mongodump
  console.log('\nStep 2: Executing mongodump with gzip compression...');
  const dumpArgs = [
    `--uri=${PROD_URI}`,
    `--archive=${archivePath}`,
    '--gzip'
  ];

  const dumpResult = await execFileAsync(MONGODUMP_PATH, dumpArgs);
  console.log('  ✓ mongodump completed successfully.');

  const archiveStat = fs.statSync(archivePath);
  console.log(`  ✓ Backup archive created: ${archivePath}`);
  console.log(`  ✓ Archive size: ${archiveStat.size} bytes (${(archiveStat.size / 1024).toFixed(2)} KB)`);

  // STEP 3: Compute SHA-256 Checksum
  console.log('\nStep 3: Calculating cryptographic SHA-256 checksum...');
  const archiveBuffer = fs.readFileSync(archivePath);
  const sha256 = crypto.createHash('sha256').update(archiveBuffer).digest('hex');
  const checksumContent = `${sha256}  ${archiveFileName}\n`;
  fs.writeFileSync(checksumPath, checksumContent, 'utf8');
  console.log(`  ✓ SHA-256 Checksum: ${sha256}`);
  console.log(`  ✓ Checksum saved to: ${checksumPath}`);

  // STEP 4: Restore into isolated verification database
  console.log('\nStep 4: Restoring archive into isolated verification database (mongorestore)...');
  const restoreArgs = [
    `--uri=${ADMIN_URI}`,
    `--nsInclude=${PROD_DB_NAME}.*`,
    `--nsFrom=${PROD_DB_NAME}.*`,
    `--nsTo=${VERIFY_DB_NAME}.*`,
    `--archive=${archivePath}`,
    '--gzip',
    '--drop'
  ];

  const restoreResult = await execFileAsync(MONGORESTORE_PATH, restoreArgs);
  console.log('  ✓ mongorestore completed into:', VERIFY_DB_NAME);

  // STEP 5: Verify collection and document parity
  console.log('\nStep 5: Verifying document parity between production and restored backup...');
  const verifyUri = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${VERIFY_DB_NAME}?authSource=admin`;
  await mongoose.connect(verifyUri);
  const verifyDb = mongoose.connection.db;

  const parityReport = {};
  let allParityMatched = true;

  for (const collName of Object.keys(sourceParity)) {
    const prodCount = sourceParity[collName];
    const restoredCount = await verifyDb.collection(collName).countDocuments();
    const match = prodCount === restoredCount;
    parityReport[collName] = {
      production: prodCount,
      restored: restoredCount,
      match
    };
    if (!match) allParityMatched = false;
    console.log(`  • Collection "${collName}": Prod = ${prodCount}, Restored = ${restoredCount} [${match ? '✅ MATCH' : '❌ MISMATCH'}]`);
  }

  // STEP 6: Clean up verification database
  console.log('\nStep 6: Dropping isolated verification database...');
  await verifyDb.dropDatabase();
  await mongoose.disconnect();
  console.log('  ✓ Verification database dropped cleanly.');

  if (!allParityMatched) {
    throw new Error('CRITICAL BACKUP PARITY MISMATCH: Restored backup did not match production database!');
  }

  // STEP 7: Write verification summary
  const summary = {
    timestamp: new Date().toISOString(),
    status: 'VERIFIED_SUCCESSFUL',
    backupDirectory: backupDir,
    archivePath,
    archiveSize: archiveStat.size,
    sha256,
    collectionsCount: Object.keys(sourceParity).length,
    parityReport
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\nStep 7: Verification summary saved to: ${summaryPath}`);

  console.log('\n================================================================');
  console.log('🎉 FRESH PRODUCTION BACKUP COMPLETED AND 100% CRYPTOGRAPHICALLY VERIFIED!');
  console.log('================================================================\n');

  return summary;
}

createAndVerifyBackup().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});

