# PHASE 8.3.6 – PRODUCTION CLEANUP SCRIPT IMPLEMENTATION & DRY-RUN VERIFICATION
## Shivneri Classic Apartment – A Wing (Panchavati, Nashik – 422003)

---

### Executive Summary & Review Scope

| Audit Dimension | Specification | Actual Forensic / Implementation State |
| :--- | :--- | :---: |
| **Project Target** | Shivneri Classic Apartment – A Wing | Verified |
| **Phase Focus** | Script Implementation, Forensic Gating & Dry-Run Verification | **100% Implemented & Verified** |
| **Executable Script Path** | `server/src/scripts/prelaunchCleanup.js` | **Physically Implemented on Disk** |
| **Dedicated Test Suite** | `server/test-prelaunch-cleanup.js` | **31 / 31 Tests Passed (100%)** |
| **Execution Mode** | Default DRY-RUN Mode (Zero Mutations Allowed) | **STRICTLY ENFORCED** |
| **Production Database** | `shivneri_classic_admin_db` (MongoDB localhost:27017) | **100% Untouched (194 docs)** |
| **Dual-Backup Cryptographic Gate**| Primary (Disk 0 HDD) & Secondary (Disk 1 SSD) SHA256 Handshake | **VERIFIED (`dda99092...`)** |
| **Forensic Dues Criteria** | Reconciled 16 Nov @ ₹1,500 + 16 Dec @ ₹1,000 | **Verified by ID Whitelist** |
| **Payment Reconciliation** | 6 Completed @ ₹3,000 + 1 Cancelled @ ₹600 | **Verified by Receipt Whitelist** |
| **Expense Reconciliation** | 4 Completed @ ₹17,550 + 1 Cancelled @ ₹600 | **Verified by Voucher Whitelist** |
| **Opening Balance Criteria** | Exact ID `6aea1f88...`, ₹67,000, Phase 7 test notes | **Verified Individually** |
| **Audit Archival Engine** | Option 2 Adopted: Idempotent bulk upsert to archive | **100% Hash Parity Verified** |
| **Master Data Invariance** | Super Admin (`श्री ल.रा. कोळी`), 16 Residents, ₹1,000 Config | **100% Canonical Hash Match** |
| **Production Mutations** | Writes, updates, deletes, or drops in Phase 8.3.6 | **STRICTLY ZERO** |
| **Phase 9 Go-Live Status**| Deployment and production launch | **STRICTLY NOT STARTED** |

---

## 1. Physical Script Implementation & Code Architecture

### 1.1 Physical File Existence and Repository Status

Unlike previous phases where cleanup logic existed purely as markdown documentation, the actual production cleanup script has now been physically authored and verified on disk:

```powershell
# Physical file verification
Path   : D:\Shivneri Classic App\server\src\scripts\prelaunchCleanup.js
Length : ~18,500 bytes
Module : ECMAScript Module (ESM)
Status : Untracked in Git master branch (Ready for version control)
```

#### Git Repository Status (`git status -s`)
```
?? server/src/scripts/prelaunchCleanup.js
?? server/test-prelaunch-cleanup.js
?? phase8_3_6_cleanup_script_implementation_audit.md
```
Zero existing application routes, controllers, services, middleware, models, or schemas were altered.

---

### 1.2 Multi-Tier Safety Guard Architecture

The script embeds seven strict fail-closed safety controls:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PRELAUNCH CLEANUP SAFETY CONTROLS                    │
├────────────────────────────────────────────────────────────────────────┤
│ 1. DEFAULT DRY-RUN LOCK:                                               │
│    isDryRun defaults strictly to true. Live execution requires BOTH    │
│    CLI flags '--execute' AND '--confirm-production-cleanup' PLUS       │
│    environment variable EXECUTE_CLEANUP='true'.                        │
│                                                                        │
│ 2. IMPORT EXECUTION PREVENTION:                                        │
│    Guarded with `fileURLToPath(import.meta.url) === path.resolve(...)` │
│    Importing prelaunchCleanup.js into another module will NEVER        │
│    trigger execution.                                                  │
│                                                                        │
│ 3. DATABASE NAME ASSERTION:                                            │
│    Direct connection assertion: `db.databaseName === targetDbName`.    │
│    Refuses to execute if connected to 'test', 'dev', or any fallback.  │
│                                                                        │
│ 4. DUAL-BACKUP CRYPTOGRAPHIC HANDSHAKE:                                │
│    Computes SHA256 of primary archive (Disk 0) and secondary archive   │
│    (Disk 1) against checksum.sha256. Mismatch aborts immediately.      │
│                                                                        │
│ 5. RECURSIVE CANONICAL SERIALIZER GUARD:                               │
│    Computes key-order-invariant canonical hashes of Master Data        │
│    (Admin, Residents, Config) before and after cleanup to prove 100%   │
│    immutability.                                                       │
│                                                                        │
│ 6. NON-COUNT FORENSIC IDENTIFICATION:                                  │
│    Deletes records strictly by confirmed ID whitelists matching        │
│    individual forensic criteria (never blind deleteMany).              │
│                                                                        │
│ 7. FAIL-CLOSED ARCHITECTURE (NO AUTOMATIC ROLLBACK):                   │
│    Zero automatic mongorestore --drop. If any assertion fails, the     │
│    script halts immediately, leaving database frozen for inspection.   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Corrected Forensic Rules Implementation

The script replaces all flawed blanket assumptions with the exact forensic criteria reconciled in Phase 8.3.5:

### 2.1 Maintenance Dues Forensic Logic
- **Total Dues**: Exactly 32 documents.
- **November 2026 (16 Dues)**:
  - `year === 2026`, `month === 11`.
  - `totalAmountDue === 1500` (Phase 5 historical rate).
  - `status === 'UNPAID'`.
  - Subtotal: **₹24,000**.
- **December 2026 (16 Dues)**:
  - `year === 2026`, `month === 12`.
  - `totalAmountDue === 1000` (Phase 5.2 society corrected rate).
  - Status breakdown: 2 `PAID` (Flats 101, 102 @ ₹1,000), 2 `PARTIAL` (Flats 103, 104 @ ₹500), 12 `UNPAID` (@ ₹1,000).
  - Subtotal: **₹16,000**.
- **Total Billed**: $\mathbf{₹40,000.00}$.
- **Resident Constraint**: Every single due is asserted to reference one of the 16 approved Marathi resident IDs.
- **Purge Execution**: Deletion occurs strictly via `_id: { $in: targetDueIds }`.

### 2.2 Payment Records Forensic Logic
- **Total Payments**: Exactly 7 documents.
- **Completed Payments (6 Receipts)**:
  - `SCA-202612-0001`: ₹1,000 (Flat 101, श्री संदीप पाटील).
  - `SCA-202612-0002`: ₹400 (Flat 102, श्री ल.रा. कोळी - Installment 1).
  - `SCA-202612-0003`: ₹350 (Flat 102, श्री ल.रा. कोळी - Installment 2).
  - `SCA-202612-0004`: ₹250 (Flat 102, श्री ल.रा. कोळी - Installment 3).
  - `SCA-202612-0005`: ₹500 (Flat 103, श्री नंदकुमार तासकर - Partial).
  - `SCA-202612-0006`: ₹500 (Flat 104, श्री सिताराम जोपळे - Partial).
  - Completed Collections: $\mathbf{₹3,000.00}$.
- **Cancelled Payment (1 Receipt)**:
  - `SCA-202612-0011`: ₹600 (Flat 105, श्री विठ्ठल चत्तर).
  - `status === 'CANCELLED'`.
- **Purge Execution**: Deletion occurs strictly via `_id: { $in: targetPaymentIds }`.

### 2.3 Expense Vouchers Forensic Logic
- **Total Expenses**: Exactly 5 documents.
- **Completed Expenses (4 Vouchers)**:
  - `EXP-202612-0001`: ₹3,250 (MSEDCL Nashik, Common Electricity).
  - `EXP-202612-0002`: ₹1,800 (Kailas Plumber, Water Motor Repair).
  - `EXP-202612-0003`: ₹8,000 (Prakash Shinde Guard, Security Wages).
  - `EXP-202612-0004`: ₹4,500 (Johnson Lifts Pvt Ltd, Lift Maintenance).
  - Completed Expenses: $\mathbf{₹17,550.00}$.
- **Cancelled Expense (1 Voucher)**:
  - `EXP-202612-0005`: ₹600 (Temp Sweeper, Cleaning, `status: 'CANCELLED'`).
- **Purge Execution**: Deletion occurs strictly via `_id: { $in: targetExpenseIds }`.

### 2.4 Opening Balance & Sequential Counters Logic
- **Cashbook Opening Balance**:
  - Exact `_id: 6aea1f882d3bc6fe695b0186`.
  - `singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON'`.
  - Notes: `"TEST_PHASE_7: Initial audited balance"`.
  - Total starting balance: ₹67,000.
  - Purged via single targeted `deleteOne({ _id: targetOpeningBalanceId })`.
- **Counters**:
  - `receipt_202612` (seq: 11) and `expense_202612` (seq: 5).
  - Purged via `deleteMany({ _id: { $in: ['receipt_202612', 'expense_202612'] } })`.

---

## 3. Recursive Canonical Serializer Specification & Proof

### 3.1 Serialization Policy by Data Type

| Data Type | Handling Policy | JSON Canonical Output Example |
| :--- | :--- | :--- |
| **Plain Objects** | Keys recursively sorted lexicographically at every level. | `{"a":1,"b":2}` |
| **Nested Objects** | Recursive traversal into sub-objects with key sorting. | `{"outer":{"alpha":"x","beta":"y"}}` |
| **Arrays** | Element order strictly preserved; elements recursively serialized. | `[1,"two",{"k":"v"}]` |
| **BSON `ObjectId`** | Converted to standard 24-character lowercase hex string. | `"6aea204000998a1c2ff96df8"` |
| **`Date` Instances** | Converted to standardized ISO-8601 UTC string (`.toISOString()`). | `"2026-11-03T16:00:00.000Z"` |
| **Strings / Booleans** | Serialized via `JSON.stringify()`. | `"text"`, `true`, `false` |
| **Finite Numbers** | Serialized via `JSON.stringify()`. | `1000`, `123.45` |
| **Special Numbers (`NaN`, `Infinity`, `-Infinity`)** | Serialized to `null` strictly per ECMAScript / JSON standard. | `null` |
| **`null`** | Serialized to literal `null`. | `null` |
| **`undefined`** | Omitted from objects; converted to `null` if within arrays. | (Omitted from key set) |
| **Unsupported Types** (`Function`, `Symbol`, `BigInt`) | Throws explicit `CANONICAL_SERIALIZE_ERROR`. | Throws fatal exception |

### 3.2 Unit Test Evidence (Section 1 of Test Suite)

All 10 unit tests for the recursive canonical serializer passed with 100% compliance:
- `Key insertion order produces identical hash at root and nested levels`: **PASS**.
- `Deep nested mutation (z=999) changes canonical hash`: **PASS**.
- `Array element ordering is strictly preserved and changes hash if permuted`: **PASS**.
- `Date instances are serialized to canonical ISO-8601 UTC strings`: **PASS**.
- `NaN is serialized to null per JSON specification`: **PASS**.
- `Infinity is serialized to null per JSON specification`: **PASS**.
- `NaN and null produce equivalent canonical hash`: **PASS**.
- `Undefined properties are omitted from object serialization`: **PASS**.
- `Primitives correctly serialized`: **PASS**.
- `Unsupported types (e.g. Function) throw clear exception`: **PASS**.

---

## 4. Audit Archive Safety Engine Implementation

### 4.1 Verification Protocol (Option 2: Clean Slate)

The script enforces Option 2, archiving all 129 development audit logs while leaving the active `auditlogs` collection empty for production:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AUDIT ARCHIVE VERIFICATION PIPELINE                  │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Capture Active Audit Logs:                                          │
│    - Read all 129 documents sorted by _id: 1                           │
│    - Compute pre-archival canonical hash: H_active = canonicalHash(...)│
│                                                                        │
│ 2. Idempotent Upsert (bulkWrite):                                      │
│    - Uses replaceOne({ filter: { _id }, replacement: doc, upsert: true})│
│    - Safely updates pre-existing records; inserts missing records.     │
│    - Zero E11000 duplicate key errors on retry.                        │
│                                                                        │
│ 3. Set-Inclusion & Content Hash Parity Verification:                   │
│    - Fetch archived documents matching active IDs                      │
│    - Assert archivedDocs.length === activeLogs.length                  │
│    - Compute H_archive = canonicalHash(archivedDocs)                   │
│    - Assert H_active === H_archive                                     │
│                                                                        │
│ 4. Gated Deletion of Active Logs:                                      │
│    - ONLY when H_active === H_archive is verified, delete active logs. │
│    - Active auditlogs collection reaches exactly 0 documents.          │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Handling Real-World Scenarios
- **Pre-Existing Archive Documents**: Tested in Section 4D of the test suite (pre-seeded 5 records). The `replaceOne` with `upsert: true` cleanly updated the existing 5 records and inserted the remaining 124 records.
- **Interruption and Retry**: If the script is interrupted midway, re-running it resumes seamlessly without data loss or duplicate records.
- **Verification Failure Safety**: If any log fails set-inclusion or content hash comparison, active audit logs are **NOT** deleted.

---

## 5. Writer Isolation: Observations vs. Enforcement

### 5.1 Technical Distinction: Observation vs. Enforcement

| Mechanism | Classification | Technical Reality |
| :--- | :---: | :--- |
| **`serverStatus().connections.current`** | **Observation Only** | Momentary microsecond count. Modern MongoDB drivers open at least 2 sockets (worker + SDAM monitoring thread), causing false aborts if checked for `=== 1`. Does not prevent a new socket from connecting 50 ms later. |
| **`db.currentOp()`** | **Observation Only** | Confirms whether a write is executing at that specific millisecond. Cannot prevent subsequent queries. |
| **Process Termination (`Get-Process node`)** | **Enforcement** | Physically kills local application servers and test runners, rendering them incapable of issuing writes. |
| **Closed TCP Listeners (Ports 5000, 5173)** | **Enforcement** | Confirms backend and frontend dev servers are completely dead. |
| **Loopback Binding (`bindIp: 127.0.0.1`)** | **Enforcement** | Prevents any network machine on the LAN or WAN from reaching MongoDB port 27017. |

### 5.2 Mandatory Maintenance Window Protocol
Before any authorized cleanup execution:
1. Announce formal maintenance freeze.
2. Terminate Express server (`Ctrl+C` or kill process on port 5000).
3. Terminate Vite frontend (`Ctrl+C` on port 5173).
4. Assert ports 5000, 5173, and 5006–5012 return NULL via `Get-NetTCPConnection`.
5. Assert single operator Node process via `Get-Process node`.
6. Confirm `mongod.cfg` is bound to `127.0.0.1`.
7. Execute cleanup script from single operator terminal.

---

## 6. Comprehensive Test Suite Execution Results

The dedicated test suite `server/test-prelaunch-cleanup.js` was executed:

```powershell
node server/test-prelaunch-cleanup.js
```

### Complete Test Output Log

```
==============================================================================
PRELAUNCH CLEANUP SAFETY & FORENSIC TEST SUITE
==============================================================================

[SECTION 1] Recursive Canonical Serializer Unit Tests...
  ✓ PASS: Key insertion order produces identical hash at root and nested levels
  ✓ PASS: Deep nested mutation (z=999) changes canonical hash
  ✓ PASS: Array element ordering is strictly preserved and changes hash if permuted
  ✓ PASS: Date instances are serialized to canonical ISO-8601 UTC strings
  ✓ PASS: NaN is serialized to null per JSON specification
  ✓ PASS: Infinity is serialized to null per JSON specification
  ✓ PASS: NaN and null produce equivalent canonical hash
  ✓ PASS: Undefined properties are omitted from object serialization
  ✓ PASS: Primitives correctly serialized
  ✓ PASS: Unsupported types (e.g. Function) throw clear exception

[SECTION 2] Backup Cryptographic Handshake Unit Tests...
  ✓ PASS: Production dual-backup cryptographic handshake passes for existing backups
  ✓ PASS: Rejects execution when primary backup archive is missing
  ✓ PASS: Rejects execution when archive checksum diverges from reference

[SECTION 3] Database-Name Safety Lock Tests...
  ✓ PASS: Fails closed and aborts if connected database does not match target database

[SECTION 4] Testing Full Pipeline in Isolated Database (shivneri_classic_test_db)...
  ✓ PASS: Successfully cloned production fixtures into shivneri_classic_test_db
  ✓ PASS: Dry-run executes successfully with 0 mutations
  ✓ PASS: Dues count untouched after dry-run
  ✓ PASS: Rejects and aborts when candidate due has invalid/altered amount
  ✓ PASS: Rejects and aborts when Super Admin master record is altered
  ✓ PASS: Simulated pre-existing archive records
  ✓ PASS: Live execution pipeline completes successfully on test DB
  ✓ PASS: Master Admin preserved in test DB
  ✓ PASS: 16 Residents preserved in test DB
  ✓ PASS: MaintenanceConfig preserved in test DB
  ✓ PASS: Dues completely purged in test DB
  ✓ PASS: Payments completely purged in test DB
  ✓ PASS: Expenses completely purged in test DB
  ✓ PASS: Opening balance purged in test DB
  ✓ PASS: Counters purged in test DB
  ✓ PASS: Active audit logs purged to 0 in test DB
  ✓ PASS: All 129 audit logs archived in auditlogs_prelaunch_archive
  ✓ Cleaned up and dropped shivneri_classic_test_db

==============================================================================
TEST SUITE RESULTS: 31 PASSED, 0 FAILED (100% SUCCESS)
==============================================================================
```

---

## 7. Live Production Dry-Run Verification

The script was executed directly against `shivneri_classic_admin_db` in default DRY-RUN mode:

```powershell
node server/src/scripts/prelaunchCleanup.js
```

### Complete Dry-Run Output Log

```
==============================================================================
SHIVNERI CLASSIC APARTMENT – PRE-LAUNCH DATABASE CLEANUP PIPELINE
OPERATING MODE: 🔍 DRY-RUN MODE (SIMULATION ONLY - ZERO WRITES)
TARGET DATABASE: shivneri_classic_admin_db
==============================================================================

[STAGE 0] Executing Dual-Backup Cryptographic Handshake...
  ✓ Primary Backup SHA256 Verified   : dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec
  ✓ Secondary Backup SHA256 Verified : dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec

[STAGE 1] Connecting to database...
  Connected Database Name: "shivneri_classic_admin_db"

[STAGE 2] Verifying Master Records & Computing Canonical Hashes...
  ✓ Super Admin Verified   : श्री ल.रा. कोळी (Chairman / Building Secretary)
  ✓ Residents Verified     : Exactly 16 approved Marathi members
  ✓ Maintenance Config     : Rate ₹1000/month (Due Day 10)
  ✓ Master Canonical Hash  : Admin=9e80783384b8..., Residents=98171759a2b7..., Config=a01af6557442...

[STAGE 3] Inspecting Candidate Test Records by Individual Forensic Criteria...
  ✓ Maintenance Dues       : All 32 dues confirmed (16 Nov @ ₹1,500 + 16 Dec @ ₹1,000 = ₹40000)
  ✓ Payment Receipts       : All 7 payments confirmed (6 completed @ ₹3000 + 1 cancelled @ ₹600)
  ✓ Expense Vouchers       : All 5 expenses confirmed (4 completed @ ₹17550 + 1 cancelled @ ₹600)
  ✓ Opening Balance Record : Confirmed synthetic test fixture (₹67,000, notes: "TEST_PHASE_7: Initial audited balance")
  ✓ Sequential Counters    : Confirmed 2 counters (receipt_202612, expense_202612)

[STAGE 4] Verifying Audit Logs & Archival Protocol (Option 2)...
  ✓ Active Audit Logs      : Exactly 129 logs captured (Canonical Hash: 9ac2ccbb95aff1bd...)

==============================================================================
CLEANUP OPERATION PLAN (CONFIRMED TARGETS FOR PURGE / ARCHIVAL)
==============================================================================
1. ARCHIVE AUDIT LOGS     : 129 test logs -> 'auditlogs_prelaunch_archive' (idempotent upsert)
2. PURGE ACTIVE AUDITLOGS : 129 test logs -> 0 documents (Clean Slate)
3. PURGE MAINTENANCE DUES : 32 verified test dues (16 Nov @ ₹1,500 + 16 Dec @ ₹1,000)
4. PURGE PAYMENTS         : 7 verified receipts (6 completed @ ₹3,000 + 1 cancelled @ ₹600)
5. PURGE EXPENSES         : 5 verified vouchers (4 completed @ ₹17,550 + 1 cancelled @ ₹600)
6. PURGE OPENING BALANCE  : 1 test balance record (₹67,000, ID: 6aea1f882d3bc6fe695b0186)
7. PURGE COUNTERS         : 2 sequential counters (receipt_202612, expense_202612)
8. PRESERVE MASTER DATA   : Admins=1, Residents=16, MaintenanceConfig=1 (100% UNTOUCHED)
==============================================================================

[DRY-RUN COMPLETE] All pre-flight assertions and forensic criteria PASSED with 100% success.
[SAFETY NOTICE] No database modifications were performed. System remains in safe read-only state.
```

---

### 7.1 Production Database State After Dry-Run (Read-Only Audit)

A live read-only verification query executed immediately following the dry-run confirms **STRICTLY ZERO PRODUCTION WRITES**:

```
=== VERIFYING LIVE PRODUCTION DATABASE COUNTS ===
cashbookopeningbalances    1
counters                   2
admins                     1
auditlogs                  129
expenses                   5
payments                   7
residents                  16
maintenanceconfigs         1
maintenancedues            32
expensecategories          0
-----------------------------------
TOTAL COLLECTIONS:         10
TOTAL DOCUMENTS:           194
```

---

## 8. Known Limitations & Residual Risks

1. **Standalone MongoDB Architecture**:
   MongoDB runs without replica-set configuration; therefore, multi-document ACID rollback transactions (`session.startTransaction()`) cannot be used. The script relies on fail-closed sequential execution with pre-and-post count assertions.
2. **On-Machine Physical Storage**:
   Both `PHYSICALDRIVE0` (HDD) and `PHYSICALDRIVE1` (SSD) reside in the same physical machine. While protected against single-drive hardware failure, true disaster recovery requires exporting the archive to an air-gapped external drive or cloud storage.
3. **Sequence Gap Accounting Property**:
   Receipt and voucher numbers are unique and monotonic, but not guaranteed gapless if mid-transaction server crashes occur during future production operations.

---

## 9. Final Safety Decision & Authorization Gate

In accordance with strict audit instructions:

| Safety Gate Dimension | Audit Finding | Status |
| :--- | :--- | :---: |
| **Physical Script Exists on Disk** | `server/src/scripts/prelaunchCleanup.js` physically exists | **YES** |
| **Dedicated Test Suite Passes** | 31 of 31 tests passed in `server/test-prelaunch-cleanup.js` | **YES (100%)** |
| **Production Dry-Run Zero Mutations** | Dry-run executed against `shivneri_classic_admin_db` with 0 writes | **YES (0 writes)** |
| **Live Database Census Intact** | Exactly 10 collections, exactly 194 documents verified | **YES (194 docs)** |
| **Human Authorization Granted** | Explicit user written instruction to execute cleanup | **PENDING USER APPROVAL** |

> [!CAUTION]
> ### FINAL SAFETY DECISION: NO-GO FOR LIVE PRODUCTION EXECUTION
> 
> **Rationale**:
> - The cleanup script has been **fully implemented**, **comprehensively tested (31/31 passed)**, and **successfully dry-run verified** with zero mutations.
> - However, in strict adherence to project safety rules, **production cleanup remains unauthorized and must NOT be executed until separate explicit written user authorization is received**.
> - **Phase 9 Go-Live activities remain strictly unstarted.**

---

### Final Execution Standstill Notice

- **NO production database writes, updates, deletes, or resets were executed.**
- **NO collections were dropped.**
- **NO application code, schemas, or dependencies were altered.**
- **Phase 9 has NOT been started.**

*Awaiting your explicit written authorization before taking any further action.*

