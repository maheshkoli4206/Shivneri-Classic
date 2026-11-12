/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: executeProductionDeployment.js
 * 
 * FINAL PRODUCTION CUTOVER & DEPLOYMENT RUNNER
 * 
 * EXECUTES:
 * 1. Dual Backup Checksum Verification (Disk 0 & Disk 1 bit-perfect match).
 * 2. Source Database Standstill Baseline Audit (194 docs preserved).
 * 3. Option A Production Database Provisioning (mongorestore into shivneri_classic_prod_db).
 * 4. Production Master Index Construction & Auditing (Unique partial index).
 * 5. Production Dedicated Database User Creation & SCRAM Verification.
 * 6. Exclusion Verification: Zero financial records in production namespace.
 * 7. Super Admin Password Rotation Verification.
 * 8. Production Environment File Configuration (.env).
 * ==============================================================================
 */

import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { rotatePassword } from './rotateAdminPassword.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_CHECKSUM = 'dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec';
const PRIMARY_BACKUP = 'D:\\Shivneri Classic App\\backups\\prelaunch_20261104_090827\\shivneri_classic_admin_db_backup.gz';
const SECONDARY_BACKUP = 'C:\\Users\\mahes\\Shivneri_Backups_Secondary\\prelaunch_20261104_090827\\shivneri_classic_admin_db_backup.gz';
const MONGORESTORE_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';

const SOURCE_DB = 'shivneri_classic_admin_db';
const PROD_DB = 'shivneri_classic_prod_db';

function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

export async function executeProductionDeployment(options = {}) {
  console.log('==============================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)');
  console.log('🚀 FINAL PRODUCTION DEPLOYMENT & CUTOVER EXECUTION');
  console.log(`TARGET DATABASE: "${PROD_DB}"`);
  console.log('==============================================================================\n');

  // STEP 1: Verify Dual Backup Checksums
  console.log('[STEP 1] Verifying Dual Backup Checksums...');
  const primaryHash = computeSha256(PRIMARY_BACKUP);
  const secondaryHash = computeSha256(SECONDARY_BACKUP);

  if (primaryHash !== EXPECTED_CHECKSUM || secondaryHash !== EXPECTED_CHECKSUM) {
    throw new Error('BACKUP_CHECKSUM_MISMATCH: One or both backup archives failed cryptographic verification!');
  }
  if (primaryHash !== secondaryHash) {
    throw new Error('BACKUP_DIVERGENCE: Primary and secondary backups diverge!');
  }
  console.log(`  ✓ Primary Backup Verified (Disk 0 NVMe): ${primaryHash}`);
  console.log(`  ✓ Secondary Backup Verified (Disk 1 SSD): ${secondaryHash}`);
  console.log('  ✓ Dual Backup Cryptographic Handshake: 100% BIT-PERFECT MATCH.\n');

  // STEP 2: Verify Source Baseline Standstill
  console.log('[STEP 2] Verifying Source Database Standstill Baseline...');
  const rootConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
  const dbsList = await rootConn.db.admin().listDatabases();
  const sourceDbDoc = dbsList.databases.find(d => d.name === SOURCE_DB);
  if (!sourceDbDoc) {
    throw new Error(`SOURCE_DB_NOT_FOUND: Source database "${SOURCE_DB}" not found!`);
  }

  const srcDb = rootConn.useDb(SOURCE_DB);
  const srcColls = await srcDb.db.listCollections().toArray();
  let srcDocCount = 0;
  for (const c of srcColls) {
    srcDocCount += await srcDb.db.collection(c.name).countDocuments();
  }
  if (srcDocCount !== 194 || srcColls.length !== 10) {
    throw new Error(`SOURCE_INTEGRITY_ANOMALY: Expected 194 docs / 10 colls, found ${srcDocCount} docs / ${srcColls.length} colls!`);
  }
  console.log(`  ✓ Source Database "${SOURCE_DB}": Strictly 194 documents across 10 collections (Baseline confirmed).\n`);

  // STEP 3: Ensure Target Database Is Clean Before Migration
  console.log(`[STEP 3] Verifying Target Production Database Preconditions: "${PROD_DB}"...`);
  const prodExistsBefore = dbsList.databases.some(d => d.name === PROD_DB);
  if (prodExistsBefore) {
    const prodDbBefore = rootConn.useDb(PROD_DB);
    const prodColls = await prodDbBefore.db.listCollections().toArray();
    let prodDocs = 0;
    for (const c of prodColls) {
      prodDocs += await prodDbBefore.db.collection(c.name).countDocuments();
    }
    if (prodDocs > 0) {
      throw new Error(`PROD_DB_NOT_EMPTY: Production database "${PROD_DB}" already contains ${prodDocs} documents! Manual operator clearance required.`);
    }
  }
  console.log(`  ✓ Target production namespace "${PROD_DB}" is clean.\n`);

  // STEP 4: Restore Master Records From Verified Primary Backup Archive
  console.log('[STEP 4] Restoring Master Collections Directly From Verified Backup Archive...');
  const restoreArgs = [
    '--host=127.0.0.1:27017',
    '--gzip',
    `--archive=${PRIMARY_BACKUP}`,
    `--nsInclude=${SOURCE_DB}.admins`,
    `--nsInclude=${SOURCE_DB}.residents`,
    `--nsInclude=${SOURCE_DB}.maintenanceconfigs`,
    `--nsFrom=${SOURCE_DB}.*`,
    `--nsTo=${PROD_DB}.*`
  ];

  console.log(`  Executing: mongorestore --nsInclude (admins, residents, maintenanceconfigs) -> ${PROD_DB}`);
  const restoreOutput = execFileSync(MONGORESTORE_PATH, restoreArgs, { encoding: 'utf8' });
  console.log(restoreOutput.trim());
  console.log('  ✓ Master records successfully restored into production database.\n');

  // STEP 5: Recreate and Audit Production Indexes
  console.log('[STEP 5] Recreating and Auditing Production Master Indexes...');
  const prodConn = rootConn.useDb(PROD_DB);

  // Admins indexes
  await prodConn.db.collection('admins').createIndex({ singletonKey: 1 }, { unique: true });
  await prodConn.db.collection('admins').createIndex({ username: 1 }, { unique: true });

  // Residents indexes
  await prodConn.db.collection('residents').createIndex({ fullNameMarathi: 1 });
  await prodConn.db.collection('residents').createIndex({ status: 1 });
  await prodConn.db.collection('residents').createIndex(
    { flatNumber: 1, wing: 1 },
    { unique: true, partialFilterExpression: { flatNumber: { $type: 'string', $gt: '' } } }
  );

  // MaintenanceConfigs index
  await prodConn.db.collection('maintenanceconfigs').createIndex({ singletonKey: 1 }, { unique: true });

  console.log('  ✓ Production unique and partial indexes established successfully.\n');

  // STEP 6: Verify Production Census & Zero Financial Records Invariant
  console.log('[STEP 6] Auditing Production Database Census & Invariants...');
  const prodColls = await prodConn.db.listCollections().toArray();
  const prodCollNames = prodColls.map(c => c.name);

  const adminCount = await prodConn.db.collection('admins').countDocuments();
  const residentCount = await prodConn.db.collection('residents').countDocuments();
  const configCount = await prodConn.db.collection('maintenanceconfigs').countDocuments();

  if (adminCount !== 1 || residentCount !== 16 || configCount !== 1) {
    throw new Error(`CENSUS_MISMATCH: Production DB has Admins=${adminCount}, Residents=${residentCount}, Config=${configCount}!`);
  }
  console.log(`  ✓ Master Census Verified: Admins=1, Residents=16, Config=1 (Total: 18 docs)`);

  const forbiddenColls = [
    'maintenancedues', 'payments', 'expenses',
    'cashbookopeningbalances', 'counters', 'auditlogs', 'expensecategories'
  ];
  for (const coll of forbiddenColls) {
    if (prodCollNames.includes(coll)) {
      const count = await prodConn.db.collection(coll).countDocuments();
      if (count > 0) {
        throw new Error(`FINANCIAL_LEAKAGE: Operational collection "${coll}" contains ${count} documents in production!`);
      }
    }
  }
  console.log('  ✓ Zero financial/historical records present in production namespace.\n');

  // STEP 7: Create Dedicated Application Database User
  console.log('[STEP 7] Provisioning Dedicated Least-Privilege Application User...');
  const appDbPassword = options.appDbPassword || crypto.randomBytes(24).toString('hex');
  const appUsername = 'shivneri_app_user';

  // Check if user already exists
  const userInfo = await rootConn.db.command({ usersInfo: { user: appUsername, db: 'admin' } });
  if (userInfo.users && userInfo.users.length > 0) {
    await rootConn.db.command({ updateUser: appUsername, pwd: appDbPassword, roles: [{ role: 'readWrite', db: PROD_DB }] });
    console.log(`  ✓ Updated existing user "${appUsername}" with readWrite on "${PROD_DB}"`);
  } else {
    await rootConn.db.command({
      createUser: appUsername,
      pwd: appDbPassword,
      roles: [{ role: 'readWrite', db: PROD_DB }]
    });
    console.log(`  ✓ Created dedicated application user "${appUsername}" with readWrite on "${PROD_DB}"`);
  }

  // Verify authenticated connectivity
  console.log('  Verifying SCRAM authenticated connection for application user...');
  const testAppConn = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${PROD_DB}`, {
    authSource: 'admin',
    auth: { username: appUsername, password: appDbPassword }
  }).asPromise();

  const authedCount = await testAppConn.db.collection('residents').countDocuments();
  if (authedCount !== 16) {
    throw new Error('AUTH_VERIFY_FAILED: Authenticated connection failed to query production residents!');
  }
  await testAppConn.close();
  console.log('  ✓ SCRAM-SHA-256 authenticated database connection verified successfully.\n');

  // STEP 8: Super Admin Password Rotation
  console.log('[STEP 8] Super Admin Password Verification & Rotation...');
  const adminDoc = await prodConn.db.collection('admins').findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
  const newAdminPassword = options.adminPassword || 'Shivneri@Nashik2026#Prod';

  const rotRes = await rotatePassword({
    mongoUri: `mongodb://127.0.0.1:27017/${PROD_DB}`,
    newPassword: newAdminPassword
  });
  console.log(`  ✓ Super Admin password rotated with 12-round bcrypt hash for: ${rotRes.username}\n`);

  // STEP 9: Configure Production Environment Variables (.env)
  console.log('[STEP 9] Updating Production Environment Configuration (server/.env)...');
  const envPath = path.resolve(__dirname, '../../.env');
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  const productionEnvContent = `# Shivneri Classic Apartment - Production Environment
PORT=5000
HTTPS_PORT=5443
NODE_ENV=production
CLIENT_ORIGIN=https://localhost:5443

MONGODB_URI=mongodb://${appUsername}:${appDbPassword}@127.0.0.1:27017/${PROD_DB}?authSource=admin
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=8h

ADMIN_INITIAL_USERNAME=${adminDoc.username}

SOCIETY_NAME_MARATHI="शिवनेरी क्लासिक अपार्टमेंट"
SOCIETY_WING="A Wing"
SOCIETY_LOCATION="औरंगाबाद रोड, पंचवटी, नाशिक - ४२२००३"
`;

  fs.writeFileSync(envPath, productionEnvContent, 'utf8');
  console.log('  ✓ server/.env updated with production database URI, secure JWT secret, and HTTPS origin.\n');

  // STEP 10: Final Source Standstill Audit
  console.log('[STEP 10] Final Source Database & Backup Invariance Audit...');
  let finalSrcDocs = 0;
  for (const c of srcColls) {
    finalSrcDocs += await srcDb.db.collection(c.name).countDocuments();
  }
  if (finalSrcDocs !== 194) {
    throw new Error(`CRITICAL_ANOMALY: Source DB document count changed! (Expected 194, Found: ${finalSrcDocs})`);
  }
  console.log(`  ✓ Source Database "${SOURCE_DB}": 100% UNTOUCHED (194 documents, 10 collections preserved).`);

  const finalPrimaryHash = computeSha256(PRIMARY_BACKUP);
  const finalSecondaryHash = computeSha256(SECONDARY_BACKUP);
  if (finalPrimaryHash !== EXPECTED_CHECKSUM || finalSecondaryHash !== EXPECTED_CHECKSUM) {
    throw new Error('BACKUP_TAMPERED: Backup checksum altered during deployment!');
  }
  console.log('  ✓ Dual physical backups remain 100% cryptographically identical.');

  await rootConn.close();

  console.log('\n==============================================================================');
  console.log('✅ PRODUCTION DATABASE PROVISIONING & CUTOVER COMPLETED WITH 100% SUCCESS!');
  console.log(`DATABASE NAME : ${PROD_DB}`);
  console.log(`APP USER      : ${appUsername}`);
  console.log(`ADMIN USER    : ${adminDoc.username} (${adminDoc.fullNameMarathi})`);
  console.log('==============================================================================\n');

  return {
    success: true,
    prodDb: PROD_DB,
    appUsername,
    appDbPassword,
    adminUsername: adminDoc.username,
    newAdminPassword,
    jwtSecret
  };
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith('executeProductionDeployment.js')) {
  executeProductionDeployment()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ PRODUCTION DEPLOYMENT FAILED:');
      console.error(err.message);
      process.exit(1);
    });
}

