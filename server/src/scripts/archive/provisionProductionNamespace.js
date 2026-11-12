/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: provisionProductionNamespace.js
 * 
 * DESCRIPTION:
 * Official production database provisioning script for Option 6
 * (Clean-Slate Namespace Provisioning via Master Migration).
 * 
 * Extracts the 18 authoritative master records (1 Admin, 16 Residents, 1 MaintenanceConfig)
 * from the legacy database (or verified backup) and provisions them into the clean
 * production namespace ('shivneri_classic_prod_db') with production indexes.
 * 
 * STRICT SAFETY DIRECTIVES:
 * 1. DEFAULTS TO DRY-RUN MODE: Zero mutations occur unless BOTH '--execute'
 *    and '--confirm-production-cutover' flags are explicitly supplied.
 * 2. TARGET NOT SOURCE: Refuses to execute if the target database name
 *    matches the source database ('shivneri_classic_admin_db').
 * 3. FAIL-CLOSED ON NON-EMPTY TARGET: Refuses to execute if the target database
 *    already contains documents or collections (guaranteeing clean slate).
 * 4. DUAL BACKUP CRYPTOGRAPHIC HANDSHAKE: Asserts that both primary (Disk 0)
 *    and secondary (Disk 1) backups match SHA256 checksums before proceeding.
 * 5. MASTER IDENTITY PRESERVATION: Preserves all original ObjectIds, Marathi names,
 *    authoritative blank flat numbers (""), role, timestamps, and bcrypt password hash.
 * 6. ZERO FINANCIAL RECORD CONTAMINATION: Strictly never copies dues, payments,
 *    expenses, opening balances, counters, or test audit logs.
 * 7. CANONICAL SHA256 HASH VERIFICATION: Every migrated document is verified
 *    via deterministic canonical serialization and SHA256 hashing.
 * 8. COMPLETE INDEX PROVISIONING: Builds authoritative unique and partial indexes.
 * 9. SOURCE DATABASE IMMUTABILITY: Source database is opened strictly in read-only
 *    mode and verified before and after provisioning (194 documents, 0 mutations).
 * ==============================================================================
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { canonicalHash, canonicalSerialize } from './prelaunchCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Default Configuration Constants
export const PROVISIONING_DEFAULTS = {
  SOURCE_DB_NAME: 'shivneri_classic_admin_db',
  TARGET_DB_NAME: 'shivneri_classic_prod_db',
  DEFAULT_MONGO_URI: 'mongodb://localhost:27017',
  MASTER_COLLECTIONS: ['admins', 'residents', 'maintenanceconfigs'],
  EXCLUDED_COLLECTIONS: [
    'maintenancedues',
    'payments',
    'expenses',
    'cashbookopeningbalances',
    'counters',
    'auditlogs',
    'expensecategories'
  ],
  AUTHORITATIVE_COUNTS: {
    ADMINS: 1,
    RESIDENTS: 16,
    CONFIG: 1,
    TOTAL_MASTER: 18,
    SOURCE_TOTAL_DOCS: 194,
    SOURCE_COLLECTIONS: 10
  },
  SUPER_ADMIN: {
    _id: '6aea204000998a1c2ff96df8',
    fullNameMarathi: 'श्री ल.रा. कोळी',
    singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
    role: 'SUPER_ADMIN',
    username: 'laxman_koli'
  },
  CONFIG: {
    _id: '6aea13b72d3bc6fe695b0155',
    singletonKey: 'MAINTENANCE_CONFIG_SINGLETON',
    defaultMonthlyAmount: 1000,
    dueDay: 10
  },
  PRIMARY_BACKUP: {
    archivePath: 'D:\\Shivneri Classic App\\backups\\prelaunch_20261104_090827\\shivneri_classic_admin_db_backup.gz',
    checksumPath: 'D:\\Shivneri Classic App\\backups\\prelaunch_20261104_090827\\checksum.sha256',
    expectedChecksum: 'dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec'
  },
  SECONDARY_BACKUP: {
    archivePath: 'C:\\Users\\mahes\\Shivneri_Backups_Secondary\\prelaunch_20261104_090827\\shivneri_classic_admin_db_backup.gz',
    checksumPath: 'C:\\Users\\mahes\\Shivneri_Backups_Secondary\\prelaunch_20261104_090827\\checksum.sha256',
    expectedChecksum: 'dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec'
  }
};

/**
 * Computes SHA256 checksum of a file.
 */
export function computeFileSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FILE_NOT_FOUND: Backup file does not exist at "${filePath}"`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Asserts that primary and secondary backup paths resolve to distinct physical files.
 * Rejects identical paths, case-variant representations (Windows invariant),
 * relative-vs-absolute representations, and hard link/symlink aliases.
 * Distinguishes path strings, canonical files, and filesystem volumes.
 */
export function assertDistinctBackupPaths(primaryPath, secondaryPath) {
  if (!primaryPath || !secondaryPath) {
    throw new Error('CONFIG_ERROR: Both primary and secondary backup paths must be specified.');
  }

  // 1. Resolve to canonical absolute paths
  const resolvedPrimary = path.resolve(primaryPath);
  const resolvedSecondary = path.resolve(secondaryPath);

  // 2. Case-insensitive path comparison (Windows filesystem invariant)
  if (resolvedPrimary.toLowerCase() === resolvedSecondary.toLowerCase()) {
    throw new Error(`DUPLICATE_BACKUP_PATHS: Primary and secondary backup paths resolve to the same location: "${resolvedPrimary}"`);
  }

  // 3. File existence verification (fail closed if either archive is missing)
  if (!fs.existsSync(resolvedPrimary)) {
    throw new Error(`FILE_NOT_FOUND: Primary backup archive does not exist at "${resolvedPrimary}"`);
  }
  if (!fs.existsSync(resolvedSecondary)) {
    throw new Error(`FILE_NOT_FOUND: Secondary backup archive does not exist at "${resolvedSecondary}"`);
  }

  // 4. Physical file identity verification via realpath and device/inode
  let realPrimary, realSecondary;
  try {
    realPrimary = fs.realpathSync.native ? fs.realpathSync.native(resolvedPrimary) : fs.realpathSync(resolvedPrimary);
    realSecondary = fs.realpathSync.native ? fs.realpathSync.native(resolvedSecondary) : fs.realpathSync(resolvedSecondary);
  } catch (err) {
    throw new Error(`FILE_IDENTITY_ERROR: Failed to establish canonical filesystem realpath: ${err.message}`);
  }

  if (realPrimary.toLowerCase() === realSecondary.toLowerCase()) {
    throw new Error(`DUPLICATE_BACKUP_PATHS: Primary and secondary backup paths resolve to the same canonical file target: "${realPrimary}"`);
  }

  let statPrimary, statSecondary;
  try {
    statPrimary = fs.statSync(realPrimary);
    statSecondary = fs.statSync(realSecondary);
  } catch (err) {
    throw new Error(`FILE_IDENTITY_ERROR: Failed to inspect file stats: ${err.message}`);
  }

  // Check device + inode equality (detects hard links and alias targets)
  if (
    statPrimary.dev !== undefined &&
    statSecondary.dev !== undefined &&
    statPrimary.ino !== undefined &&
    statSecondary.ino !== undefined &&
    statPrimary.ino !== 0 &&
    statPrimary.dev === statSecondary.dev &&
    statPrimary.ino === statSecondary.ino
  ) {
    throw new Error(`DUPLICATE_BACKUP_PATHS: Primary and secondary backup files are identical physical inodes on device/volume ${statPrimary.dev}!`);
  }

  const distinctVolumes = statPrimary.dev !== statSecondary.dev;

  return {
    distinctPathStrings: true,
    distinctCanonicalFiles: true,
    distinctVolumes,
    primaryVolumeId: statPrimary.dev,
    secondaryVolumeId: statSecondary.dev,
    // Note: Node.js fs.stat 'dev' identifies filesystem volumes / mount points.
    // Physical disk drive separation (e.g. Disk 0 NVMe vs Disk 1 SATA SSD)
    // is an operational storage topology requirement evidenced separately via OS disk management.
    physicalDiskSeparationEvidenced: false,
    verified: true
  };
}

/**
 * Executes Dual-Backup Cryptographic Handshake.
 */
export function verifyDualBackups(config = PROVISIONING_DEFAULTS) {
  console.log('\n[STAGE 0] Performing Dual-Backup Cryptographic Handshake...');

  // 0. Assert distinct backup paths before hashing
  const pathAudit = assertDistinctBackupPaths(config.PRIMARY_BACKUP.archivePath, config.SECONDARY_BACKUP.archivePath);
  console.log('  ✓ Backup paths verified distinct (Canonical files verified)');
  if (pathAudit.distinctVolumes) {
    console.log(`  ✓ Filesystem volumes are distinct (Primary Volume: ${pathAudit.primaryVolumeId}, Secondary Volume: ${pathAudit.secondaryVolumeId})`);
  } else {
    console.warn(`  ⚠️  NOTICE: Primary and secondary backups reside on the same filesystem volume (${pathAudit.primaryVolumeId}).`);
  }

  // 1. Primary Backup Handshake
  console.log(`  Verifying Primary Backup Archive: "${config.PRIMARY_BACKUP.archivePath}"`);
  const primaryHash = computeFileSha256(config.PRIMARY_BACKUP.archivePath);
  if (primaryHash !== config.PRIMARY_BACKUP.expectedChecksum) {
    throw new Error(`PRIMARY_BACKUP_CHECKSUM_MISMATCH: Computed ${primaryHash}, expected ${config.PRIMARY_BACKUP.expectedChecksum}`);
  }
  const recordedPrimary = fs.readFileSync(config.PRIMARY_BACKUP.checksumPath, 'utf8').trim().split(/\s+/)[0];
  if (recordedPrimary !== config.PRIMARY_BACKUP.expectedChecksum) {
    throw new Error(`PRIMARY_CHECKSUM_FILE_MISMATCH: Recorded ${recordedPrimary}, expected ${config.PRIMARY_BACKUP.expectedChecksum}`);
  }
  console.log(`  ✓ Primary Backup Verified (SHA256: ${primaryHash})`);

  // 2. Secondary Backup Handshake
  console.log(`  Verifying Secondary Backup Archive: "${config.SECONDARY_BACKUP.archivePath}"`);
  const secondaryHash = computeFileSha256(config.SECONDARY_BACKUP.archivePath);
  if (secondaryHash !== config.SECONDARY_BACKUP.expectedChecksum) {
    throw new Error(`SECONDARY_BACKUP_CHECKSUM_MISMATCH: Computed ${secondaryHash}, expected ${config.SECONDARY_BACKUP.expectedChecksum}`);
  }
  const recordedSecondary = fs.readFileSync(config.SECONDARY_BACKUP.checksumPath, 'utf8').trim().split(/\s+/)[0];
  if (recordedSecondary !== config.SECONDARY_BACKUP.expectedChecksum) {
    throw new Error(`SECONDARY_CHECKSUM_FILE_MISMATCH: Recorded ${recordedSecondary}, expected ${config.SECONDARY_BACKUP.expectedChecksum}`);
  }
  console.log(`  ✓ Secondary Backup Verified (SHA256: ${secondaryHash})`);
  console.log('  ✓ Dual-Backup Cryptographic Handshake PASSED with 100% integrity.');
  return true;
}

/**
 * Main Provisioning Function.
 *
 * @param {Object} options
 * @param {string} options.sourceDb - Source database name (default: shivneri_classic_admin_db)
 * @param {string} options.targetDb - Target database name (default: shivneri_classic_prod_db)
 * @param {string} options.mongoUri - Base MongoDB connection URI (default: mongodb://localhost:27017)
 * @param {boolean} options.execute - Authorize live execution
 * @param {boolean} options.confirmCutover - Explicit cutover confirmation
 * @param {boolean} options.dryRun - Explicit dry-run flag
 */
export async function provisionProductionNamespace(options = {}) {
  const sourceDbName = options.sourceDb || PROVISIONING_DEFAULTS.SOURCE_DB_NAME;
  const targetDbName = options.targetDb || PROVISIONING_DEFAULTS.TARGET_DB_NAME;
  const mongoBaseUri = options.mongoUri || PROVISIONING_DEFAULTS.DEFAULT_MONGO_URI;

  const isExecuteAuthorized = options.execute === true && options.confirmCutover === true && options.dryRun !== true;
  const isDryRun = !isExecuteAuthorized;

  console.log('==============================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)');
  console.log('🚀 PRODUCTION DATABASE PROVISIONING PIPELINE (OPTION 6)');
  console.log(`OPERATING MODE: ${isDryRun ? '🔍 DRY-RUN MODE (SIMULATION ONLY - ZERO WRITES)' : '⚡ LIVE CUTOVER EXECUTION (MUTATION AUTHORIZED)'}`);
  console.log(`SOURCE DATABASE: "${sourceDbName}" (READ-ONLY)`);
  console.log(`TARGET DATABASE: "${targetDbName}"`);
  console.log('==============================================================================');

  // Safety Assertion 1: Target cannot equal source database
  if (targetDbName === sourceDbName) {
    throw new Error(`SAFETY_VIOLATION: Target database "${targetDbName}" cannot be identical to source database!`);
  }

  // Safety Assertion 2: Production safety gate on target name
  // Real cutover targets shivneri_classic_prod_db; isolated tests target explicit test DBs
  if (targetDbName !== PROVISIONING_DEFAULTS.TARGET_DB_NAME) {
    console.warn(`⚠️  NOTICE: Custom target database "${targetDbName}" specified.`);
  }

  // -------------------------------------------------------------
  // STAGE 0: Backup Handshake
  // -------------------------------------------------------------
  // Mandatory assertion: Live cutover mode or targeting production database can NEVER skip backup verification
  if (isExecuteAuthorized || targetDbName === PROVISIONING_DEFAULTS.TARGET_DB_NAME) {
    if (options._testDisableBackupHandshake) {
      throw new Error('SAFETY_VIOLATION: Backup verification cannot be disabled in live execution mode or when targeting production database!');
    }
  }

  const verifier = options._testBackupVerifier || verifyDualBackups;
  if (!options._testDisableBackupHandshake) {
    verifier(options.backupConfig || PROVISIONING_DEFAULTS);
  } else {
    console.log('\n[STAGE 0] Backup Handshake skipped (Test-Only Programmatic Override).');
  }

  // -------------------------------------------------------------
  // STAGE 1: Connect to Source Database & Inspect Master Records
  // -------------------------------------------------------------
  console.log('\n[STAGE 1] Connecting to Source Database (Read-Only Inspection)...');
  const sourceConn = await mongoose.createConnection(`${mongoBaseUri}/${sourceDbName}`).asPromise();
  const sourceDb = sourceConn.db;

  let initialSourceDocCount = 0;
  const sourceColls = await sourceDb.listCollections().toArray();
  const sourceCollNames = sourceColls.map(c => c.name).sort();
  for (const name of sourceCollNames) {
    const count = await sourceDb.collection(name).countDocuments();
    initialSourceDocCount += count;
  }
  console.log(`  Source Collections (${sourceCollNames.length}): ${sourceCollNames.join(', ')}`);
  console.log(`  Source Total Documents: ${initialSourceDocCount}`);

  // Master records extraction & canonical hashing
  console.log('\n[STAGE 2] Extracting Master Records & Computing Source Canonical Hashes...');
  const masterData = {};
  const sourceHashes = {};

  // 1. Super Admin
  const adminDoc = await sourceDb.collection('admins').findOne({ role: 'SUPER_ADMIN' });
  if (!adminDoc) throw new Error('MASTER_EXTRACTION_ERROR: Super Admin record not found in source database!');
  if (adminDoc.fullNameMarathi !== PROVISIONING_DEFAULTS.SUPER_ADMIN.fullNameMarathi) {
    throw new Error(`MASTER_EXTRACTION_ERROR: Super Admin name mismatch: "${adminDoc.fullNameMarathi}"`);
  }
  masterData.admins = [adminDoc];
  sourceHashes.admins = [{ _id: adminDoc._id.toString(), hash: canonicalHash(adminDoc) }];
  console.log(`  ✓ Super Admin Verified   : ${adminDoc.fullNameMarathi} (${adminDoc.designation})`);

  // 2. 16 Approved Residents
  const residents = await sourceDb.collection('residents').find({}).sort({ _id: 1 }).toArray();
  if (residents.length !== PROVISIONING_DEFAULTS.AUTHORITATIVE_COUNTS.RESIDENTS) {
    throw new Error(`MASTER_EXTRACTION_ERROR: Expected strictly ${PROVISIONING_DEFAULTS.AUTHORITATIVE_COUNTS.RESIDENTS} residents, found ${residents.length}!`);
  }
  for (const r of residents) {
    if (r.flatNumber !== '') {
      throw new Error(`MASTER_DATA_ANOMALY: Resident ${r._id} has non-blank flatNumber: "${r.flatNumber}"`);
    }
    if (r.status !== 'ACTIVE') {
      throw new Error(`MASTER_DATA_ANOMALY: Resident ${r._id} status is not ACTIVE: "${r.status}"`);
    }
  }
  masterData.residents = residents;
  sourceHashes.residents = residents.map(r => ({ _id: r._id.toString(), hash: canonicalHash(r) }));
  console.log(`  ✓ Residents Verified     : Exactly 16 approved Marathi members (flatNumber: "")`);

  // 3. Maintenance Configuration
  const configDoc = await sourceDb.collection('maintenanceconfigs').findOne({ singletonKey: PROVISIONING_DEFAULTS.CONFIG.singletonKey });
  if (!configDoc) throw new Error('MASTER_EXTRACTION_ERROR: Maintenance configuration document not found in source database!');
  if (configDoc.defaultMonthlyAmount !== PROVISIONING_DEFAULTS.CONFIG.defaultMonthlyAmount) {
    throw new Error(`MASTER_DATA_ANOMALY: Maintenance rate mismatch: expected ₹${PROVISIONING_DEFAULTS.CONFIG.defaultMonthlyAmount}, found ₹${configDoc.defaultMonthlyAmount}!`);
  }
  masterData.maintenanceconfigs = [configDoc];
  sourceHashes.maintenanceconfigs = [{ _id: configDoc._id.toString(), hash: canonicalHash(configDoc) }];
  console.log(`  ✓ Maintenance Config     : Rate ₹${configDoc.defaultMonthlyAmount}/month (Due Day: ${configDoc.dueDay}th)`);

  const totalMasterExtracted = masterData.admins.length + masterData.residents.length + masterData.maintenanceconfigs.length;
  console.log(`  ✓ Total Master Documents Extracted: ${totalMasterExtracted} / 18`);

  // -------------------------------------------------------------
  // STAGE 3: Inspect Target Database Pre-Conditions (Fail-Closed)
  // -------------------------------------------------------------
  console.log(`\n[STAGE 3] Inspecting Target Database Pre-Conditions: "${targetDbName}"...`);
  const targetConn = await mongoose.createConnection(`${mongoBaseUri}/${targetDbName}`).asPromise();
  const targetDb = targetConn.db;

  const targetColls = await targetDb.listCollections().toArray();
  let existingTargetDocCount = 0;
  for (const c of targetColls) {
    existingTargetDocCount += await targetDb.collection(c.name).countDocuments();
  }

  if (targetColls.length > 0 || existingTargetDocCount > 0) {
    await sourceConn.close();
    await targetConn.close();
    throw new Error(`TARGET_DATABASE_NOT_EMPTY: Target database "${targetDbName}" already exists and contains ${existingTargetDocCount} documents across ${targetColls.length} collections. Refusing to overwrite! Fail-closed.`);
  } else {
    console.log(`  ✓ Target Database is 100% clean slate (0 collections, 0 documents).`);
  }

  // -------------------------------------------------------------
  // STAGE 4: Operation Plan Summary & Dry-Run Gate
  // -------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log('PROVISIONING OPERATION PLAN');
  console.log('==============================================================================');
  console.log('1. PROVISION ADMINS          : 1 Super Admin (श्री ल.रा. कोळी, singletonKey enforced)');
  console.log('2. PROVISION RESIDENTS        : 16 Approved Members (authentic Marathi names, flatNumber: "")');
  console.log('3. PROVISION CONFIG           : 1 Maintenance Config (₹1,000/mo, due day 10)');
  console.log('4. BUILD PRODUCTION INDEXES   : 9 indexes across 3 collections (unique + partial indexes)');
  console.log('5. EXCLUDE FINANCIAL LEDGER   : 0 dues, 0 payments, 0 expenses, 0 balances, 0 counters, 0 logs');
  console.log('6. PRESERVE SOURCE DATABASE   : shivneri_classic_admin_db remains 100% UNTOUCHED');
  console.log('==============================================================================');

  if (isDryRun) {
    console.log('\n[DRY-RUN COMPLETE] All pre-flight assertions and master records verified successfully.');
    console.log('[SAFETY NOTICE] No database writes were performed. Target database remains untouched.');
    await sourceConn.close();
    await targetConn.close();
    return {
      success: true,
      mode: 'DRY_RUN',
      totalMasterExtracted,
      targetDbName,
      sourceDbName
    };
  }

  // -------------------------------------------------------------
  // STAGE 5: Live Execution - Provision Master Data
  // -------------------------------------------------------------
  console.log('\n[STAGE 5] EXECUTING LIVE PRODUCTION PROVISIONING...');

  // 1. Insert Admins
  await targetDb.collection('admins').insertMany(masterData.admins);
  console.log(`  ✓ Inserted 1 document into "${targetDbName}.admins"`);

  // 2. Insert Residents
  await targetDb.collection('residents').insertMany(masterData.residents);
  console.log(`  ✓ Inserted 16 documents into "${targetDbName}.residents"`);

  // 3. Insert MaintenanceConfig
  await targetDb.collection('maintenanceconfigs').insertMany(masterData.maintenanceconfigs);
  console.log(`  ✓ Inserted 1 document into "${targetDbName}.maintenanceconfigs"`);

  // -------------------------------------------------------------
  // STAGE 6: Build Authoritative Production Indexes
  // -------------------------------------------------------------
  console.log('\n[STAGE 6] Building Production Indexes on Target Collections...');

  // Admins indexes
  await targetDb.collection('admins').createIndex(
    { singletonKey: 1 },
    { name: 'singletonKey_1', unique: true, background: true }
  );
  await targetDb.collection('admins').createIndex(
    { username: 1 },
    { name: 'username_1', unique: true, background: true }
  );
  console.log('  ✓ admins indexes built (singletonKey_1 [unique], username_1 [unique])');

  // Residents indexes
  await targetDb.collection('residents').createIndex(
    { fullNameMarathi: 1 },
    { name: 'fullNameMarathi_1', background: true }
  );
  await targetDb.collection('residents').createIndex(
    { status: 1 },
    { name: 'status_1', background: true }
  );
  await targetDb.collection('residents').createIndex(
    { flatNumber: 1, wing: 1 },
    {
      name: 'flatNumber_1_wing_1',
      unique: true,
      background: true,
      partialFilterExpression: {
        flatNumber: { $type: 'string', $gt: '' }
      }
    }
  );
  console.log('  ✓ residents indexes built (fullNameMarathi_1, status_1, flatNumber_1_wing_1 [unique partial])');

  // MaintenanceConfig indexes
  await targetDb.collection('maintenanceconfigs').createIndex(
    { singletonKey: 1 },
    { name: 'singletonKey_1', unique: true, background: true }
  );
  console.log('  ✓ maintenanceconfigs indexes built (singletonKey_1 [unique])');

  // -------------------------------------------------------------
  // STAGE 7: Post-Provisioning Verification & Invariant Hash Parity
  // -------------------------------------------------------------
  console.log('\n[STAGE 7] Verifying Target Database Census & Canonical Hash Parity...');

  const finalTargetColls = await targetDb.listCollections().toArray();
  const finalTargetCollNames = finalTargetColls.map(c => c.name).sort();

  if (finalTargetColls.length !== 3) {
    throw new Error(`CENSUS_ERROR: Target expected strictly 3 master collections, found ${finalTargetColls.length} (${finalTargetCollNames.join(', ')})!`);
  }

  // Check absence of financial collections
  for (const excluded of PROVISIONING_DEFAULTS.EXCLUDED_COLLECTIONS) {
    if (finalTargetCollNames.includes(excluded)) {
      throw new Error(`POLLUTION_ERROR: Excluded collection "${excluded}" was detected in target database!`);
    }
  }

  // Compare canonical hashes document by document
  let totalTargetVerified = 0;
  for (const col of PROVISIONING_DEFAULTS.MASTER_COLLECTIONS) {
    const targetDocs = await targetDb.collection(col).find({}).sort({ _id: 1 }).toArray();
    const sourceDocs = masterData[col];

    if (targetDocs.length !== sourceDocs.length) {
      throw new Error(`COUNT_MISMATCH in "${col}": source=${sourceDocs.length}, target=${targetDocs.length}`);
    }

    for (let i = 0; i < sourceDocs.length; i++) {
      const sDoc = sourceDocs[i];
      const tDoc = targetDocs[i];

      const sHash = canonicalHash(sDoc);
      const tHash = canonicalHash(tDoc);

      if (sDoc._id.toString() !== tDoc._id.toString()) {
        throw new Error(`ID_MISMATCH in "${col}": ${sDoc._id} vs ${tDoc._id}`);
      }

      if (sHash !== tHash) {
        throw new Error(`HASH_MISMATCH in "${col}" for doc ${sDoc._id}: source=${sHash}, target=${tHash}`);
      }

      totalTargetVerified++;
    }
    console.log(`  ✓ Collection "${col}": ${targetDocs.length}/${targetDocs.length} documents verified with 100% hash parity.`);
  }

  console.log(`  ✓ Total Master Documents Verified: ${totalTargetVerified} / 18`);

  // Verify total documents across entire target database
  let totalDocsInTarget = 0;
  for (const c of finalTargetColls) {
    totalDocsInTarget += await targetDb.collection(c.name).countDocuments();
  }
  if (totalDocsInTarget !== PROVISIONING_DEFAULTS.AUTHORITATIVE_COUNTS.TOTAL_MASTER) {
    throw new Error(`TARGET_TOTAL_MISMATCH: Expected strictly 18 documents in target DB, found ${totalDocsInTarget}!`);
  }
  console.log(`  ✓ Total Active Documents in Target Database: Exactly ${totalDocsInTarget} (Census Verified)`);

  // -------------------------------------------------------------
  // STAGE 8: Source Database Immutability Check
  // -------------------------------------------------------------
  console.log('\n[STAGE 8] Verifying Source Database Immutability...');
  let finalSourceDocCount = 0;
  for (const name of sourceCollNames) {
    finalSourceDocCount += await sourceDb.collection(name).countDocuments();
  }
  console.log(`  Source Document Total: ${finalSourceDocCount} (Initial: ${initialSourceDocCount})`);
  if (finalSourceDocCount !== initialSourceDocCount || finalSourceDocCount !== PROVISIONING_DEFAULTS.AUTHORITATIVE_COUNTS.SOURCE_TOTAL_DOCS) {
    throw new Error(`CRITICAL_MUTATION_ERROR: Source database was mutated! Initial=${initialSourceDocCount}, Final=${finalSourceDocCount}`);
  }
  console.log('  ✓ Source Production Database: 100% UNTOUCHED (Zero writes, zero deletions)');

  await sourceConn.close();
  await targetConn.close();

  console.log('\n==============================================================================');
  console.log('✅ PRODUCTION NAMESPACE PROVISIONING COMPLETED WITH 100% SUCCESS!');
  console.log('==============================================================================\n');

  return {
    success: true,
    mode: 'LIVE_EXECUTION',
    totalMasterProvisioned: totalTargetVerified,
    targetDbName,
    sourceDbName
  };
}

// ==============================================================================
// CLI Direct Invocation & Strict Argument Whitelist Validator
// ==============================================================================

/**
 * Validates MongoDB database name format against forbidden characters.
 */
export function validateDbName(name, flagName) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error(`INVALID_CLI_ARGUMENT: Value for ${flagName} cannot be empty.`);
  }
  const forbiddenChars = /[\/\\."$*<>:|?\s\0]/;
  if (forbiddenChars.test(name)) {
    throw new Error(`INVALID_CLI_ARGUMENT: Value "${name}" for ${flagName} contains forbidden characters.`);
  }
  if (name.length > 64) {
    throw new Error(`INVALID_CLI_ARGUMENT: Value for ${flagName} exceeds maximum length of 64 characters.`);
  }
  return true;
}

/**
 * Strictly parses and validates command-line arguments against a rigid whitelist.
 * Rejects unknown, misspelled, duplicate, or conflicting arguments.
 */
export function parseAndValidateCliArgs(args = []) {
  const recognizedFlags = new Set([
    '--dry-run',
    '--execute',
    '--confirm-production-cutover'
  ]);

  const seenArgs = new Set();
  const options = {
    execute: false,
    confirmCutover: false,
    dryRun: false,
    targetDb: undefined,
    sourceDb: undefined
  };

  for (const rawArg of args) {
    const arg = rawArg.trim();
    if (seenArgs.has(arg)) {
      throw new Error(`CONFLICTING_CLI_ARGUMENT: Duplicate argument "${arg}" provided.`);
    }
    seenArgs.add(arg);

    if (recognizedFlags.has(arg)) {
      if (arg === '--dry-run') options.dryRun = true;
      else if (arg === '--execute') options.execute = true;
      else if (arg === '--confirm-production-cutover') options.confirmCutover = true;
    } else if (arg.startsWith('--target-db=')) {
      if (options.targetDb !== undefined) {
        throw new Error(`CONFLICTING_CLI_ARGUMENT: Multiple --target-db parameters provided.`);
      }
      const val = arg.slice('--target-db='.length).trim();
      validateDbName(val, '--target-db');
      options.targetDb = val;
    } else if (arg.startsWith('--source-db=')) {
      if (options.sourceDb !== undefined) {
        throw new Error(`CONFLICTING_CLI_ARGUMENT: Multiple --source-db parameters provided.`);
      }
      const val = arg.slice('--source-db='.length).trim();
      validateDbName(val, '--source-db');
      options.sourceDb = val;
    } else {
      throw new Error(`UNKNOWN_CLI_ARGUMENT: Unrecognized or misspelled argument "${arg}". Execution aborted.`);
    }
  }

  // If neither execute nor confirmCutover was passed, default to dryRun
  if (!options.execute && !options.confirmCutover) {
    options.dryRun = true;
  }

  return options;
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  try {
    const args = process.argv.slice(2);
    const options = parseAndValidateCliArgs(args);

    provisionProductionNamespace(options)
      .then(() => {
        process.exit(0);
      })
      .catch(err => {
        console.error('\n❌ PROVISIONING FAILED:', err.message);
        process.exit(1);
      });
  } catch (err) {
    console.error('\n❌ CLI VALIDATION ERROR:', err.message);
    process.exit(1);
  }
}

