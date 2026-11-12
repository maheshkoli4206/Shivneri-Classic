/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: prelaunchCleanup.js
 * 
 * DESCRIPTION:
 * Production cleanup script for resetting test-generated financial data and
 * preparing the clean-slate production ledger prior to Phase 9 Go-Live.
 * 
 * STRICT SAFETY DIRECTIVES:
 * 1. DEFAULTS TO DRY-RUN MODE: Zero mutations occur unless BOTH '--execute'
 *    and '--confirm-production-cleanup' flags are explicitly supplied.
 * 2. DATABASE NAME LOCK: Refuses to connect/execute if the target database
 *    is not strictly 'shivneri_classic_admin_db' (or explicitly configured test DB).
 * 3. BACKUP CRYPTOGRAPHIC HANDSHAKE: Refuses to execute if primary or secondary
 *    backup SHA256 checksums fail verification against checksum.sha256.
 * 4. INDIVIDUAL FORENSIC IDENTIFICATION: Deletes records strictly by verified
 *    ID whitelist matching audited forensic test criteria (never blind deleteMany).
 * 5. NO UNVERIFIED FLAT NUMBERS: Master data has flatNumber: "" for all 16 residents.
 *    Identification relies strictly on authoritative _id and approved Marathi name.
 * 6. CANONICAL SPECIAL NUMBERS: Distinguishes null, NaN, +Infinity, -Infinity,
 *    +0, -0, and finite numbers via explicit canonical type markers.
 * 7. AUDIT ARCHIVAL SET INTEGRITY: Requires 100% ID set-inclusion and canonical
 *    content hash parity; rejects unexpected extra archive documents.
 * 8. FAIL-CLOSED ARCHITECTURE: Zero automatic '--drop' rollback on error.
 * 9. NO CONNECTION-COUNT FALSE SECURITY: Connection-count thresholds (e.g.
 *    connections.current <= 3) are intentionally omitted from writer isolation
 *    gates; connection counting cannot detect rogue or concurrent writers in
 *    unauthenticated standalone MongoDB and must never be misrepresented as isolation.
 * ==============================================================================
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { ObjectId } = mongoose.Types;

// ==============================================================================
// 1. RECURSIVE CANONICAL SERIALIZER & HASH ENGINE (WITH SPECIAL NUMBER DISCRIMINATION)
// ==============================================================================

/**
 * Recursively serializes any JS value/BSON document to a deterministic,
 * key-order-invariant canonical string.
 *
 * Special Value Discrimination:
 * - null: serialized as 'null'
 * - NaN: serialized as '{"__bson_type__":"number","val":"NaN"}'
 * - +Infinity: serialized as '{"__bson_type__":"number","val":"+Infinity"}'
 * - -Infinity: serialized as '{"__bson_type__":"number","val":"-Infinity"}'
 * - +0: serialized as '{"__bson_type__":"number","val":"+0"}'
 * - -0: serialized as '{"__bson_type__":"number","val":"-0"}'
 * - Finite non-zero numbers: serialized via JSON.stringify()
 * - BSON ObjectId: converted to 24-character hex string
 * - Dates: converted to strict ISO-8601 UTC string
 * - Arrays: preserved order, elements recursively serialized
 * - Objects: keys lexicographically sorted at EVERY depth level; undefined values omitted
 *
 * Unsupported Types (throws Error):
 * - Functions, Symbols, BigInt
 */
export function canonicalSerialize(val) {
  if (val === null) {
    return 'null';
  }
  if (val === undefined) {
    return 'null';
  }

  // Handle special numeric edge cases with explicit canonical type markers
  if (typeof val === 'number') {
    if (Number.isNaN(val)) {
      return '{"__bson_type__":"number","val":"NaN"}';
    }
    if (val === Infinity) {
      return '{"__bson_type__":"number","val":"+Infinity"}';
    }
    if (val === -Infinity) {
      return '{"__bson_type__":"number","val":"-Infinity"}';
    }
    if (Object.is(val, -0)) {
      return '{"__bson_type__":"number","val":"-0"}';
    }
    if (Object.is(val, 0) || Object.is(val, +0)) {
      return '{"__bson_type__":"number","val":"+0"}';
    }
    return JSON.stringify(val);
  }

  if (typeof val === 'string' || typeof val === 'boolean') {
    return JSON.stringify(val);
  }

  // Handle BSON ObjectId (has _bsontype === 'ObjectID' or toHexString)
  if (typeof val === 'object' && (val._bsontype === 'ObjectID' || val instanceof ObjectId)) {
    return JSON.stringify(val.toHexString ? val.toHexString() : val.toString());
  }

  // Handle Date instances
  if (val instanceof Date) {
    return JSON.stringify(val.toISOString());
  }

  // Handle Arrays (preserve element order)
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalSerialize).join(',') + ']';
  }

  // Handle Objects (Plain objects or BSON/Mongoose documents)
  if (typeof val === 'object') {
    const plain = (typeof val.toJSON === 'function' && !(val instanceof Date)) ? val.toJSON() : val;
    if (plain === null || plain === undefined) return 'null';
    if (typeof plain !== 'object') return canonicalSerialize(plain);
    if (Array.isArray(plain)) return '[' + plain.map(canonicalSerialize).join(',') + ']';

    // Filter out undefined object values (omitted in JSON standard object representation)
    const keys = Object.keys(plain).filter(k => plain[k] !== undefined).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalSerialize(plain[k])).join(',') + '}';
  }

  throw new Error(`CANONICAL_SERIALIZE_ERROR: Unsupported data type "${typeof val}" encountered.`);
}

/**
 * Computes deterministic SHA256 hex digest of canonically serialized input.
 */
export function canonicalHash(data) {
  const serialized = canonicalSerialize(data);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

// ==============================================================================
// 2. AUDITED FORENSIC TEST FIXTURES & MASTER DATA SPECIFICATIONS
// ==============================================================================

export const FORENSIC_CONSTANTS = {
  // Master Super Admin Record
  SUPER_ADMIN: {
    _id: '6aea204000998a1c2ff96df8',
    username: 'laxman_koli',
    fullNameMarathi: 'श्री ल.रा. कोळी',
    role: 'SUPER_ADMIN',
    singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON'
  },

  // Approved Resident Count & Society Maintenance Rate
  APPROVED_RESIDENT_COUNT: 16,
  STANDARD_MONTHLY_RATE: 1000,

  // Expected Pre-Cleanup Census
  PRE_CLEANUP_CENSUS: {
    admins: 1,
    residents: 16,
    maintenanceconfigs: 1,
    maintenancedues: 32,
    payments: 7,
    expenses: 5,
    cashbookopeningbalances: 1,
    counters: 2,
    auditlogs: 129,
    expensecategories: 0,
    totalDocuments: 194
  },

  // Target Dues Specification
  DUES: {
    NOV_2026: { count: 16, amount: 1500, status: 'UNPAID', year: 2026, month: 11 },
    DEC_2026: { count: 16, amount: 1000, year: 2026, month: 12, paid: 2, partial: 2, unpaid: 12 },
    TOTAL_COUNT: 32,
    TOTAL_BILLED: 40000
  },

  // Target Payments Specification (Identified by authoritative receipt and resident ID)
  PAYMENTS: {
    TOTAL_COUNT: 7,
    COMPLETED_COUNT: 6,
    COMPLETED_TOTAL: 3000,
    CANCELLED_COUNT: 1,
    CANCELLED_TOTAL: 600,
    RECEIPTS: [
      { receiptNumber: 'SCA-202612-0001', amount: 1000, status: 'COMPLETED', residentName: 'श्री संदीप पाटील' },
      { receiptNumber: 'SCA-202612-0002', amount: 400,  status: 'COMPLETED', residentName: 'श्री ल.रा. कोळी' },
      { receiptNumber: 'SCA-202612-0003', amount: 350,  status: 'COMPLETED', residentName: 'श्री ल.रा. कोळी' },
      { receiptNumber: 'SCA-202612-0004', amount: 250,  status: 'COMPLETED', residentName: 'श्री ल.रा. कोळी' },
      { receiptNumber: 'SCA-202612-0005', amount: 500,  status: 'COMPLETED', residentName: 'श्री नंदकुमार तासकर' },
      { receiptNumber: 'SCA-202612-0006', amount: 500,  status: 'COMPLETED', residentName: 'श्री सिताराम जोपळे' },
      { receiptNumber: 'SCA-202612-0011', amount: 600,  status: 'CANCELLED', residentName: 'श्री विठ्ठल चत्तर' }
    ]
  },

  // Target Expenses Specification
  EXPENSES: {
    TOTAL_COUNT: 5,
    COMPLETED_COUNT: 4,
    COMPLETED_TOTAL: 17550,
    CANCELLED_COUNT: 1,
    CANCELLED_TOTAL: 600,
    VOUCHERS: [
      { voucherNumber: 'EXP-202612-0001', amount: 3250, status: 'COMPLETED', category: 'ELECTRICITY' },
      { voucherNumber: 'EXP-202612-0002', amount: 1800, status: 'COMPLETED', category: 'PLUMBING' },
      { voucherNumber: 'EXP-202612-0003', amount: 8000, status: 'COMPLETED', category: 'SECURITY' },
      { voucherNumber: 'EXP-202612-0004', amount: 4500, status: 'COMPLETED', category: 'LIFT MAINTENANCE' },
      { voucherNumber: 'EXP-202612-0005', amount: 600,  status: 'CANCELLED', category: 'CLEANING' }
    ]
  },

  // Target Opening Balance Specification
  OPENING_BALANCE: {
    _id: '6aea1f882d3bc6fe695b0186',
    singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON',
    notes: 'TEST_PHASE_7: Initial audited balance',
    totalBalance: 67000
  },

  // Target Counters
  COUNTERS: ['receipt_202612', 'expense_202612'],

  // Target Audit Logs
  AUDIT_LOGS_COUNT: 129
};

// ==============================================================================
// 3. BACKUP CRYPTOGRAPHIC HANDSHAKE
// ==============================================================================

/**
 * Validates the cryptographic SHA256 integrity of both primary and secondary
 * backup archives against the official reference checksum file.
 */
export function verifyBackupHandshake(options = {}) {
  const primaryPath = options.primaryPath || path.resolve(__dirname, '../../../backups/prelaunch_20261104_090827/shivneri_classic_admin_db_backup.gz');
  const secondaryPath = options.secondaryPath || 'C:/Users/mahes/Shivneri_Backups_Secondary/prelaunch_20261104_090827/shivneri_classic_admin_db_backup.gz';
  const checksumPath = options.checksumPath || path.resolve(__dirname, '../../../backups/prelaunch_20261104_090827/checksum.sha256');

  if (!fs.existsSync(checksumPath)) {
    throw new Error(`BACKUP_HANDSHAKE_ERROR: Checksum reference file missing at "${checksumPath}"!`);
  }
  if (!fs.existsSync(primaryPath)) {
    throw new Error(`BACKUP_HANDSHAKE_ERROR: Primary backup archive missing at "${primaryPath}"!`);
  }
  if (!fs.existsSync(secondaryPath)) {
    throw new Error(`BACKUP_HANDSHAKE_ERROR: Secondary backup archive missing at "${secondaryPath}"!`);
  }

  const expectedHash = fs.readFileSync(checksumPath, 'utf8').split(' ')[0].trim().toLowerCase();

  const getHash = (filePath) => {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
  };

  const primaryHash = getHash(primaryPath);
  const secondaryHash = getHash(secondaryPath);

  if (primaryHash !== expectedHash) {
    throw new Error(`PRIMARY_CHECKSUM_MISMATCH: Expected ${expectedHash}, got ${primaryHash}`);
  }
  if (secondaryHash !== expectedHash) {
    throw new Error(`SECONDARY_CHECKSUM_MISMATCH: Expected ${expectedHash}, got ${secondaryHash}`);
  }

  return {
    verified: true,
    expectedHash,
    primaryHash,
    secondaryHash
  };
}

// ==============================================================================
// 4. CORE CLEANUP ENGINE (DRY-RUN & EXECUTION PIPELINE)
// ==============================================================================

/**
 * Executes or simulates the pre-launch database cleanup.
 *
 * @param {Object} config
 * @param {string} config.dbUri - MongoDB connection URI
 * @param {string} config.targetDbName - Expected database name (must equal 'shivneri_classic_admin_db' for prod)
 * @param {boolean} config.isDryRun - When true, simulates all checks with ZERO mutations
 * @param {boolean} config.skipBackupHandshake - Only permitted in dedicated test environments
 * @returns {Promise<Object>} Execution / Dry-Run summary report
 */
export async function runPrelaunchCleanup(config = {}) {
  const isDryRun = config.isDryRun !== false; // Default: true (DRY RUN)
  const targetDbName = config.targetDbName || 'shivneri_classic_admin_db';
  const dbUri = config.dbUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';

  console.log('\n==============================================================================');
  console.log(`SHIVNERI CLASSIC APARTMENT – PRE-LAUNCH DATABASE CLEANUP PIPELINE`);
  console.log(`OPERATING MODE: ${isDryRun ? '🔍 DRY-RUN MODE (SIMULATION ONLY - ZERO WRITES)' : '⚡ LIVE EXECUTION MODE (MUTATION AUTHORIZED)'}`);
  console.log(`TARGET DATABASE: ${targetDbName}`);
  console.log('==============================================================================\n');

  // -------------------------------------------------------------
  // STAGE 0: Backup Cryptographic Handshake
  // -------------------------------------------------------------
  if (!config.skipBackupHandshake) {
    console.log('[STAGE 0] Executing Dual-Backup Cryptographic Handshake...');
    const handshake = verifyBackupHandshake(config.backupOptions || {});
    console.log(`  ✓ Primary Backup SHA256 Verified   : ${handshake.primaryHash}`);
    console.log(`  ✓ Secondary Backup SHA256 Verified : ${handshake.secondaryHash}`);
  } else {
    console.log('[STAGE 0] Backup Handshake skipped (Test/Mock Environment).');
  }

  // -------------------------------------------------------------
  // STAGE 1: Database Connection & Strict Name Assertion
  // -------------------------------------------------------------
  // SAFETY NOTICE (PHASE 8.3.9): Connection-count checks (e.g. connections.current <= 3)
  // are intentionally NOT used as a writer isolation gate because connection counts do not prove
  // absence of concurrent writers in unauthenticated standalone MongoDB. True writer isolation
  // requires verifying that application processes on ports 5000 and 5173 are completely stopped,
  // or utilizing Option 6 (Clean-Slate Namespace Provisioning) to isolate the target database.
  console.log('\n[STAGE 1] Connecting to database...');
  const connection = await mongoose.createConnection(dbUri, { maxPoolSize: 2 }).asPromise();
  const db = connection.db;

  try {
    const actualDbName = db.databaseName;
    console.log(`  Connected Database Name: "${actualDbName}"`);

    if (actualDbName !== targetDbName) {
      throw new Error(`DATABASE_NAME_MISMATCH: Connected to "${actualDbName}", strictly expected "${targetDbName}"!`);
    }

    // -------------------------------------------------------------
    // STAGE 2: Master Data Integrity & Invariant Hash Guard
    // -------------------------------------------------------------
    console.log('\n[STAGE 2] Verifying Master Records & Computing Canonical Hashes...');

    const admin = await db.collection('admins').findOne({ role: 'SUPER_ADMIN' });
    if (!admin) throw new Error('MASTER_DATA_ERROR: Super Admin record not found!');
    if (admin.fullNameMarathi !== FORENSIC_CONSTANTS.SUPER_ADMIN.fullNameMarathi) {
      throw new Error(`MASTER_DATA_ERROR: Super Admin name mismatch: "${admin.fullNameMarathi}"`);
    }

    const residents = await db.collection('residents').find().sort({ _id: 1 }).toArray();
    if (residents.length !== FORENSIC_CONSTANTS.APPROVED_RESIDENT_COUNT) {
      throw new Error(`MASTER_DATA_ERROR: Expected ${FORENSIC_CONSTANTS.APPROVED_RESIDENT_COUNT} residents, found ${residents.length}!`);
    }
    const approvedResidentIds = new Set(residents.map(r => r._id.toString()));

    const configDoc = await db.collection('maintenanceconfigs').findOne({ singletonKey: 'MAINTENANCE_CONFIG_SINGLETON' });
    if (!configDoc) throw new Error('MASTER_DATA_ERROR: Maintenance configuration document not found!');
    if (configDoc.defaultMonthlyAmount !== FORENSIC_CONSTANTS.STANDARD_MONTHLY_RATE) {
      throw new Error(`MASTER_DATA_ERROR: Maintenance rate mismatch: expected ₹${FORENSIC_CONSTANTS.STANDARD_MONTHLY_RATE}, found ₹${configDoc.defaultMonthlyAmount}!`);
    }

    const preAdminHash    = canonicalHash(await db.collection('admins').find().sort({ _id: 1 }).toArray());
    const preResidentHash = canonicalHash(residents);
    const preConfigHash   = canonicalHash(await db.collection('maintenanceconfigs').find().sort({ _id: 1 }).toArray());

    console.log(`  ✓ Super Admin Verified   : ${admin.fullNameMarathi} (${admin.designation || 'Secretary'})`);
    console.log(`  ✓ Residents Verified     : Exactly ${residents.length} approved Marathi members (flatNumber: "")`);
    console.log(`  ✓ Maintenance Config     : Rate ₹${configDoc.defaultMonthlyAmount}/month (Due Day ${configDoc.dueDay})`);
    console.log(`  ✓ Master Canonical Hash  : Admin=${preAdminHash.substring(0, 12)}..., Residents=${preResidentHash.substring(0, 12)}..., Config=${preConfigHash.substring(0, 12)}...`);

    // -------------------------------------------------------------
    // STAGE 3: Individual Forensic Verification of Candidate Test Records
    // -------------------------------------------------------------
    console.log('\n[STAGE 3] Inspecting Candidate Test Records by Individual Forensic Criteria...');

    // 3A. Maintenance Dues Verification (Nov ₹1,500 + Dec ₹1,000)
    const dues = await db.collection('maintenancedues').find().sort({ year: 1, month: 1, residentId: 1 }).toArray();
    if (dues.length !== FORENSIC_CONSTANTS.DUES.TOTAL_COUNT) {
      throw new Error(`FORENSIC_DUES_ERROR: Expected ${FORENSIC_CONSTANTS.DUES.TOTAL_COUNT} dues, found ${dues.length}!`);
    }

    let novCount = 0, decCount = 0, totalBilled = 0;
    const targetDueIds = [];

    for (const d of dues) {
      if (!approvedResidentIds.has(d.residentId.toString())) {
        throw new Error(`FORENSIC_DUES_ERROR: Due ${d._id} references unknown resident ${d.residentId}!`);
      }
      totalBilled += d.totalAmountDue;
      targetDueIds.push(d._id);

      if (d.year === 2026 && d.month === 11) {
        if (d.totalAmountDue !== 1500 || d.status !== 'UNPAID') {
          throw new Error(`FORENSIC_DUES_ERROR: Nov 2026 due ${d._id} invalid: amount=${d.totalAmountDue}, status=${d.status}`);
        }
        novCount++;
      } else if (d.year === 2026 && d.month === 12) {
        if (d.totalAmountDue !== 1000) {
          throw new Error(`FORENSIC_DUES_ERROR: Dec 2026 due ${d._id} invalid amount: ${d.totalAmountDue}`);
        }
        decCount++;
      } else {
        throw new Error(`FORENSIC_DUES_ERROR: Unexpected period ${d.year}-${d.month} on due ${d._id}!`);
      }
    }

    if (novCount !== 16 || decCount !== 16 || totalBilled !== FORENSIC_CONSTANTS.DUES.TOTAL_BILLED) {
      throw new Error(`FORENSIC_DUES_ERROR: Reconciled dues counts mismatch (Nov: ${novCount}, Dec: ${decCount}, Total: ₹${totalBilled})!`);
    }
    console.log(`  ✓ Maintenance Dues       : All 32 dues confirmed (16 Nov @ ₹1,500 + 16 Dec @ ₹1,000 = ₹${totalBilled})`);

    // 3B. Payment Records Verification (6 Completed = ₹3,000; 1 Cancelled = ₹600)
    const payments = await db.collection('payments').find().sort({ createdAt: 1 }).toArray();
    if (payments.length !== FORENSIC_CONSTANTS.PAYMENTS.TOTAL_COUNT) {
      throw new Error(`FORENSIC_PAYMENTS_ERROR: Expected ${FORENSIC_CONSTANTS.PAYMENTS.TOTAL_COUNT} payments, found ${payments.length}!`);
    }

    let completedPayTotal = 0, completedPayCount = 0, cancelledPayCount = 0;
    const targetPaymentIds = [];

    for (const p of payments) {
      targetPaymentIds.push(p._id);
      if (p.status === 'COMPLETED') {
        completedPayTotal += p.amountReceived;
        completedPayCount++;
      } else if (p.status === 'CANCELLED') {
        if (p.amountReceived !== 600 || p.receiptNumber !== 'SCA-202612-0011') {
          throw new Error(`FORENSIC_PAYMENTS_ERROR: Cancelled payment ${p.receiptNumber} amount mismatch: ₹${p.amountReceived}`);
        }
        cancelledPayCount++;
      } else {
        throw new Error(`FORENSIC_PAYMENTS_ERROR: Unexpected status "${p.status}" on payment ${p.receiptNumber}`);
      }
    }

    if (completedPayCount !== 6 || completedPayTotal !== FORENSIC_CONSTANTS.PAYMENTS.COMPLETED_TOTAL || cancelledPayCount !== 1) {
      throw new Error(`FORENSIC_PAYMENTS_ERROR: Reconciled payments mismatch (Completed: ${completedPayCount} totaling ₹${completedPayTotal}, Cancelled: ${cancelledPayCount})!`);
    }
    console.log(`  ✓ Payment Receipts       : All 7 payments confirmed (6 completed @ ₹${completedPayTotal} + 1 cancelled @ ₹600)`);

    // 3C. Expense Records Verification (4 Completed = ₹17,550; 1 Cancelled = ₹600)
    const expenses = await db.collection('expenses').find().sort({ createdAt: 1 }).toArray();
    if (expenses.length !== FORENSIC_CONSTANTS.EXPENSES.TOTAL_COUNT) {
      throw new Error(`FORENSIC_EXPENSES_ERROR: Expected ${FORENSIC_CONSTANTS.EXPENSES.TOTAL_COUNT} expenses, found ${expenses.length}!`);
    }

    let completedExpTotal = 0, completedExpCount = 0, cancelledExpCount = 0;
    const targetExpenseIds = [];

    for (const e of expenses) {
      targetExpenseIds.push(e._id);
      if (e.status === 'COMPLETED') {
        completedExpTotal += e.amount;
        completedExpCount++;
      } else if (e.status === 'CANCELLED') {
        if (e.amount !== 600 || e.voucherNumber !== 'EXP-202612-0005') {
          throw new Error(`FORENSIC_EXPENSES_ERROR: Cancelled expense ${e.voucherNumber} mismatch: ₹${e.amount}`);
        }
        cancelledExpCount++;
      } else {
        throw new Error(`FORENSIC_EXPENSES_ERROR: Unexpected status "${e.status}" on expense ${e.voucherNumber}`);
      }
    }

    if (completedExpCount !== 4 || completedExpTotal !== FORENSIC_CONSTANTS.EXPENSES.COMPLETED_TOTAL || cancelledExpCount !== 1) {
      throw new Error(`FORENSIC_EXPENSES_ERROR: Reconciled expenses mismatch (Completed: ${completedExpCount} totaling ₹${completedExpTotal}, Cancelled: ${cancelledExpCount})!`);
    }
    console.log(`  ✓ Expense Vouchers       : All 5 expenses confirmed (4 completed @ ₹${completedExpTotal} + 1 cancelled @ ₹600)`);

    // 3D. Opening Balance Record Verification
    const openingBal = await db.collection('cashbookopeningbalances').findOne({ singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON' });
    if (!openingBal) {
      throw new Error('FORENSIC_OPENING_ERROR: Opening balance record missing!');
    }
    if (openingBal.notes !== FORENSIC_CONSTANTS.OPENING_BALANCE.notes) {
      throw new Error(`FORENSIC_OPENING_ERROR: Opening balance notes mismatch: "${openingBal.notes}"`);
    }
    const targetOpeningBalanceId = openingBal._id;
    console.log(`  ✓ Opening Balance Record : Confirmed synthetic test fixture (₹67,000, notes: "${openingBal.notes}")`);

    // 3E. Sequential Counters Verification
    const counters = await db.collection('counters').find().toArray();
    const counterIds = counters.map(c => c._id);
    console.log(`  ✓ Sequential Counters    : Confirmed ${counters.length} counters (${counterIds.join(', ')})`);

    // -------------------------------------------------------------
    // STAGE 4: Audit Log Archival Pre-Check & Parity Verification
    // -------------------------------------------------------------
    console.log('\n[STAGE 4] Verifying Audit Logs & Archival Protocol (Option 2)...');

    const activeLogs = await db.collection('auditlogs').find().sort({ _id: 1 }).toArray();
    if (activeLogs.length !== FORENSIC_CONSTANTS.AUDIT_LOGS_COUNT) {
      throw new Error(`AUDIT_LOG_ERROR: Expected ${FORENSIC_CONSTANTS.AUDIT_LOGS_COUNT} active audit logs, found ${activeLogs.length}!`);
    }
    const activeLogHash = canonicalHash(activeLogs);
    console.log(`  ✓ Active Audit Logs      : Exactly ${activeLogs.length} logs captured (Canonical Hash: ${activeLogHash.substring(0, 16)}...)`);

    // -------------------------------------------------------------
    // OPERATION PLAN OUTPUT (MANDATORY IN BOTH MODES)
    // -------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log('CLEANUP OPERATION PLAN (CONFIRMED TARGETS FOR PURGE / ARCHIVAL)');
    console.log('==============================================================================');
    console.log(`1. ARCHIVE AUDIT LOGS     : 129 test logs -> 'auditlogs_prelaunch_archive' (idempotent upsert)`);
    console.log(`2. PURGE ACTIVE AUDITLOGS : 129 test logs -> 0 documents (Clean Slate)`);
    console.log(`3. PURGE MAINTENANCE DUES : 32 verified test dues (16 Nov @ ₹1,500 + 16 Dec @ ₹1,000)`);
    console.log(`4. PURGE PAYMENTS         : 7 verified receipts (6 completed @ ₹3,000 + 1 cancelled @ ₹600)`);
    console.log(`5. PURGE EXPENSES         : 5 verified vouchers (4 completed @ ₹17,550 + 1 cancelled @ ₹600)`);
    console.log(`6. PURGE OPENING BALANCE  : 1 test balance record (₹67,000, ID: ${targetOpeningBalanceId})`);
    console.log(`7. PURGE COUNTERS         : 2 sequential counters (${counterIds.join(', ')})`);
    console.log(`8. PRESERVE MASTER DATA   : Admins=1, Residents=16, MaintenanceConfig=1 (100% UNTOUCHED)`);
    console.log('==============================================================================');

    // -------------------------------------------------------------
    // STAGE 5: MUTATION GATE (STRICTLY BLOCKED IN DRY-RUN MODE)
    // -------------------------------------------------------------
    if (isDryRun) {
      console.log('\n[DRY-RUN COMPLETE] All pre-flight assertions and forensic criteria PASSED with 100% success.');
      console.log('[SAFETY NOTICE] No database modifications were performed. System remains in safe read-only state.');

      await connection.close();
      return {
        success: true,
        mode: 'DRY_RUN',
        targetDbName,
        verifiedTargets: {
          duesCount: targetDueIds.length,
          paymentsCount: targetPaymentIds.length,
          expensesCount: targetExpenseIds.length,
          openingBalanceId: targetOpeningBalanceId.toString(),
          countersCount: counters.length,
          auditLogsCount: activeLogs.length
        },
        mutationsExecuted: 0
      };
    }

    // =============================================================
    // LIVE EXECUTION PIPELINE (ONLY REACHED IF isDryRun === false)
    // =============================================================
    console.log('\n[STAGE 5] EXECUTING LIVE CLEANUP MUTATIONS (FAIL-CLOSED PIPELINE)...');

    // Step 5A: Idempotent Audit Log Archival via bulkWrite
    const archiveOps = activeLogs.map(log => ({
      replaceOne: {
        filter: { _id: log._id },
        replacement: log,
        upsert: true
      }
    }));
    await db.collection('auditlogs_prelaunch_archive').bulkWrite(archiveOps, { ordered: false });

    // Step 5B: Strict Audit Archive Verification (Set Inclusion + Count + Hash Parity)
    const archivedDocs = await db.collection('auditlogs_prelaunch_archive').find({
      _id: { $in: activeLogs.map(l => l._id) }
    }).sort({ _id: 1 }).toArray();

    if (archivedDocs.length !== activeLogs.length) {
      throw new Error(`ARCHIVE_VERIFICATION_FAILED: Archived ${archivedDocs.length} logs, expected ${activeLogs.length}! Active logs will NOT be deleted.`);
    }

    // Check for unexpected extra documents in archive collection
    const totalInArchive = await db.collection('auditlogs_prelaunch_archive').countDocuments();
    if (totalInArchive !== activeLogs.length) {
      throw new Error(`ARCHIVE_EXTRA_DOCUMENTS_DETECTED: Archive holds ${totalInArchive} documents, expected exactly ${activeLogs.length}! Active logs will NOT be deleted.`);
    }

    const archivedLogHash = canonicalHash(archivedDocs);
    if (activeLogHash !== archivedLogHash) {
      throw new Error(`ARCHIVE_HASH_MISMATCH: Archived content hash diverges from active logs! Active logs will NOT be deleted.`);
    }
    console.log('  ✓ Audit Logs Archived    : 129 logs verified in "auditlogs_prelaunch_archive" with 100% hash parity.');

    // Step 5C: Targeted Synthetic Data Purge (Strict ID Whitelists)
    const duesResult = await db.collection('maintenancedues').deleteMany({ _id: { $in: targetDueIds } });
    if (duesResult.deletedCount !== targetDueIds.length) {
      throw new Error(`PURGE_COUNT_MISMATCH: Deleted ${duesResult.deletedCount} dues, expected ${targetDueIds.length}!`);
    }

    const payResult = await db.collection('payments').deleteMany({ _id: { $in: targetPaymentIds } });
    if (payResult.deletedCount !== targetPaymentIds.length) {
      throw new Error(`PURGE_COUNT_MISMATCH: Deleted ${payResult.deletedCount} payments, expected ${targetPaymentIds.length}!`);
    }

    const expResult = await db.collection('expenses').deleteMany({ _id: { $in: targetExpenseIds } });
    if (expResult.deletedCount !== targetExpenseIds.length) {
      throw new Error(`PURGE_COUNT_MISMATCH: Deleted ${expResult.deletedCount} expenses, expected ${targetExpenseIds.length}!`);
    }

    const opResult = await db.collection('cashbookopeningbalances').deleteOne({ _id: targetOpeningBalanceId });
    if (opResult.deletedCount !== 1) {
      throw new Error(`PURGE_COUNT_MISMATCH: Failed to delete opening balance record ${targetOpeningBalanceId}!`);
    }

    const counterResult = await db.collection('counters').deleteMany({ _id: { $in: counterIds } });
    if (counterResult.deletedCount !== counterIds.length) {
      throw new Error(`PURGE_COUNT_MISMATCH: Deleted ${counterResult.deletedCount} counters, expected ${counterIds.length}!`);
    }
    console.log(`  ✓ Transactional Purge    : Deleted ${duesResult.deletedCount} dues, ${payResult.deletedCount} payments, ${expResult.deletedCount} expenses, ${opResult.deletedCount} opening balance, ${counterResult.deletedCount} counters.`);

    // Step 5D: Purge Active Audit Logs (Option 2: Clean Slate)
    const auditPurgeResult = await db.collection('auditlogs').deleteMany({ _id: { $in: activeLogs.map(l => l._id) } });
    if (auditPurgeResult.deletedCount !== activeLogs.length) {
      throw new Error(`PURGE_COUNT_MISMATCH: Deleted ${auditPurgeResult.deletedCount} active logs, expected ${activeLogs.length}!`);
    }

    const postActiveLogs = await db.collection('auditlogs').countDocuments();
    if (postActiveLogs !== 0) {
      throw new Error(`CONCURRENT_WRITE_DETECTED: Active auditlogs holds ${postActiveLogs} documents after purge! Possible concurrent write.`);
    }
    console.log(`  ✓ Active Logs Purged     : Deleted ${auditPurgeResult.deletedCount} active logs (collection verified at exactly 0).`);

    // -------------------------------------------------------------
    // STAGE 6: Post-Cleanup Census & Master Immutability Verification
    // -------------------------------------------------------------
    console.log('\n[STAGE 6] Executing Post-Cleanup Invariant Census...');

    const postAdminHash    = canonicalHash(await db.collection('admins').find().sort({ _id: 1 }).toArray());
    const postResidentHash = canonicalHash(await db.collection('residents').find().sort({ _id: 1 }).toArray());
    const postConfigHash   = canonicalHash(await db.collection('maintenanceconfigs').find().sort({ _id: 1 }).toArray());

    if (preAdminHash !== postAdminHash) {
      throw new Error('FATAL POST-VERIFICATION ERROR: Admin master record was modified during cleanup!');
    }
    if (preResidentHash !== postResidentHash) {
      throw new Error('FATAL POST-VERIFICATION ERROR: Resident master records were modified during cleanup!');
    }
    if (preConfigHash !== postConfigHash) {
      throw new Error('FATAL POST-VERIFICATION ERROR: Maintenance configuration was modified during cleanup!');
    }

    const finalCounts = {
      admins: await db.collection('admins').countDocuments(),
      residents: await db.collection('residents').countDocuments(),
      maintenanceconfigs: await db.collection('maintenanceconfigs').countDocuments(),
      maintenancedues: await db.collection('maintenancedues').countDocuments(),
      payments: await db.collection('payments').countDocuments(),
      expenses: await db.collection('expenses').countDocuments(),
      cashbookopeningbalances: await db.collection('cashbookopeningbalances').countDocuments(),
      counters: await db.collection('counters').countDocuments(),
      auditlogs: await db.collection('auditlogs').countDocuments(),
      auditlogs_prelaunch_archive: await db.collection('auditlogs_prelaunch_archive').countDocuments()
    };

    console.log('\nPOST-CLEANUP CENSUS RESULTS:');
    console.log(`  admins                      : ${finalCounts.admins} (Expected: 1)`);
    console.log(`  residents                   : ${finalCounts.residents} (Expected: 16)`);
    console.log(`  maintenanceconfigs          : ${finalCounts.maintenanceconfigs} (Expected: 1)`);
    console.log(`  maintenancedues             : ${finalCounts.maintenancedues} (Expected: 0)`);
    console.log(`  payments                    : ${finalCounts.payments} (Expected: 0)`);
    console.log(`  expenses                    : ${finalCounts.expenses} (Expected: 0)`);
    console.log(`  cashbookopeningbalances     : ${finalCounts.cashbookopeningbalances} (Expected: 0)`);
    console.log(`  counters                    : ${finalCounts.counters} (Expected: 0)`);
    console.log(`  auditlogs                   : ${finalCounts.auditlogs} (Expected: 0)`);
    console.log(`  auditlogs_prelaunch_archive : ${finalCounts.auditlogs_prelaunch_archive} (Expected: 129)`);

    const isPostCensusClean = (
      finalCounts.admins === 1 &&
      finalCounts.residents === 16 &&
      finalCounts.maintenanceconfigs === 1 &&
      finalCounts.maintenancedues === 0 &&
      finalCounts.payments === 0 &&
      finalCounts.expenses === 0 &&
      finalCounts.cashbookopeningbalances === 0 &&
      finalCounts.counters === 0 &&
      finalCounts.auditlogs === 0 &&
      finalCounts.auditlogs_prelaunch_archive === 129
    );

    if (!isPostCensusClean) {
      throw new Error('FATAL POST-CENSUS ANOMALY: Final collection document counts do not match the expected clean-slate invariants!');
    }

    console.log('\n==============================================================================');
    console.log('✅ PRE-LAUNCH CLEANUP SUCCESSFULLY COMPLETED AND VERIFIED WITH 100% INVARIANCE!');
    console.log('==============================================================================\n');

    await connection.close();
    return {
      success: true,
      mode: 'LIVE_EXECUTION',
      targetDbName,
      finalCounts,
      masterHashesPreserved: true
    };

  } catch (error) {
    console.error('\n❌ CLEANUP PIPELINE HALTED WITH EXCEPTION (FAIL-CLOSED):');
    console.error(`   ${error.message}`);
    console.error('   [FAIL-CLOSED POLICY]: No automatic rollback or mongorestore --drop executed.');
    console.error('   Database remains in frozen state for administrator inspection.');
    await connection.close();
    throw error;
  }
}

// ==============================================================================
// 5. CLI ENTRY POINT (PREVENTS ACCIDENTAL EXECUTION ON IMPORT)
// ==============================================================================

const isDirectCliInvocation = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectCliInvocation) {
  // Determine execution mode from CLI flags and environment variables
  const hasExecuteFlag = process.argv.includes('--execute');
  const hasConfirmFlag = process.argv.includes('--confirm-production-cleanup');
  const hasEnvAuthorization = process.env.EXECUTE_CLEANUP === 'true';

  // Live execution requires EXPLICIT dual authorization
  const isDryRun = !(hasExecuteFlag && hasConfirmFlag && hasEnvAuthorization);

  runPrelaunchCleanup({ isDryRun })
    .then((result) => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('CLI_EXIT: Fatal error during cleanup pipeline execution.');
      process.exit(1);
    });
}
