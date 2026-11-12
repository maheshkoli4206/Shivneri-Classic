# PHASE 9.1.1.6 — INDEPENDENT PRODUCTION CUTOVER SECURITY AUDIT

**Project**: Shivneri Classic Apartment – A Wing (Aurangabad Road, Panchavati, Nashik – 422003)  
**Phase**: 9.1.1.6 — Independent Production Cutover Security & Infrastructure Audit  
**Date**: November 4, 2026  
**Auditor Role**: Independent Senior MongoDB Security Engineer & Windows Infrastructure Auditor  
**Audit Scope**:
- `server/src/scripts/checkWriterIsolation.js`
- `server/src/scripts/provisionProductionNamespace.js`
- `server/test-writer-isolation.js`
- `server/test-provisioning-script.js`
- `phase9_1_1_5_writer_isolation_validation_report.md`
- MongoDB 8.2 host configuration (`mongod.cfg`, logs, service metadata)
- Windows host process, networking, and task scheduling tables

---

## 1. Executive Summary & Audit Verdict

```
╔══════════════════════════════════════════════════════════════════════════════╗
║              INDEPENDENT PRODUCTION CUTOVER AUDIT VERDICT                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   EXECUTIVE VERDICT: CONDITIONAL GO                                          ║
║   (NO-GO FOR UNATTENDED EXECUTION; CONDITIONAL GO FOR SUPERVISED CUTOVER)    ║
║                                                                              ║
║   THE PHASE 9.1.1.5 "PASS" VERDICT OVERSTATED THE SYSTEM ISOLATION BOUNDARY: ║
║   1. MongoDB 8.2 runs with authorization DISABLED (open 127.0.0.1:27017).    ║
║   2. Inspector only checked listening ports 5000/5173, omitting port 27017   ║
║      established TCP connection tables.                                      ║
║   3. Inspector only enumerated node.exe, completely ignoring python.exe,     ║
║      mongosh.exe, compass.exe, and PowerShell script hosts.                  ║
║   4. Point-in-time currentOp() snapshot is not an exclusive database lock.   ║
║   5. Master data is extracted from live unauthenticated MongoDB rather       ║
║      than directly from verified immutable backup archives.                  ║
║                                                                              ║
║   DESPITE THESE GAPS, CUTOVER IS SAFE UNDER STRICT SUPERVISED CONDITIONS:    ║
║   - Host is currently quiescent (0 active app processes, ports closed).      ║
║   - Dual backups on Disk 0 & Disk 1 are bit-perfect (SHA256 verified).       ║
║   - Provisioning script preserves 18 master documents with hash parity.      ║
║   - Fail-closed target pre-condition prevents overwrite or data pollution.   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Executive Assessment
The previous Phase 9.1.1.5 inspection concluded with a clean `PASS`. This independent audit concludes that **the PASS verdict accurately verified that the Node.js application server is stopped, but overstates the isolation guarantees of the database host**. 

Because MongoDB authentication is disabled, **any local process on the workstation can connect to port 27017 and write to any namespace**. The existing preflight script did not inspect established TCP sockets connected to MongoDB, nor did it inspect non-Node process runtimes.

However, forensic inspection confirms that the workstation is currently in an idle state, no conflicting processes are running, the legacy database has zero active mutations, and both physical backups are verified. Therefore, cutover is **approved conditionally** under the strict manual supervisory runbook specified in Section 8.

---

## 2. Findings Matrix Ranked by Severity

| Finding ID | Severity | Category | Description | Primary File Reference |
| :--- | :---: | :---: | :--- | :--- |
| **SEC-AUDIT-01** | **CRITICAL** | Access Control | MongoDB 8.2 runs with authentication disabled; arbitrary local processes have full root access to all databases via `127.0.0.1:27017`. | `C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg` (Line 22) |
| **SEC-AUDIT-02** | **HIGH** | Network Inspection | Writer inspector checks listening ports 5000/5173, but completely omits inspecting established TCP client sockets connected to port 27017. | [`server/src/scripts/checkWriterIsolation.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/checkWriterIsolation.js#L30) (Lines 30, 42–78) |
| **SEC-AUDIT-03** | **HIGH** | Process Inspection | Process inventory filter is hardcoded exclusively to `node.exe`, ignoring Python, mongosh, Compass, and PowerShell runtimes. | [`server/src/scripts/checkWriterIsolation.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/checkWriterIsolation.js#L165-L225) (Lines 168–172) |
| **SEC-AUDIT-04** | **MEDIUM** | Migration Architecture| Master documents are extracted from the live unauthenticated database rather than read directly from the verified cryptographic backup archive. | [`server/src/scripts/provisionProductionNamespace.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/provisionProductionNamespace.js#L254-L312) (Lines 254–312) |
| **SEC-AUDIT-05** | **MEDIUM** | Concurrency Boundary | Point-in-time `currentOp()` snapshot was presented as isolation evidence; standalone MongoDB 8.2 provides no exclusive database locking. | [`phase9_1_1_5_writer_isolation_validation_report.md`](file:///d:/Shivneri%20Classic%20App/phase9_1_1_5_writer_isolation_validation_report.md#10-final-cutover-preflight-verdict) |
| **SEC-AUDIT-06** | **LOW** | Test Suite Gap | Test suite lacks negative cases for active client connections to port 27017 and non-Node rogue writer processes. | [`server/test-writer-isolation.js`](file:///d:/Shivneri%20Classic%20App/server/test-writer-isolation.js) |

---

## 3. Mandatory Audit Area 1: MongoDB Writer Access & Authentication

### 3.1 MongoDB Host Configuration Inspection
Inspection of the active MongoDB service configuration file at `C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg` revealed:
```yaml
# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

#security:
```
- **Evidence 1**: Line 22 `#security:` is commented out.
- **Evidence 2**: Querying `usersInfo` against `mongodb://localhost:27017/admin` returns `users: []`. Zero database users are configured.
- **Evidence 3**: MongoDB server log (`mongod.log`) explicitly confirms:
  `{"c":"ACCESS", "id":10483900, "msg":"Connection not authenticating", "attr":{"client":"127.0.0.1:..."}}`

### 3.2 Effective Access Control Analysis
1. **Zero Database-Layer Access Control**: Any process running on the host under any Windows user context (Administrator, Mahesh, LocalSystem, or network services) can open a TCP socket to `127.0.0.1:27017` and execute unauthenticated `insert`, `update`, `delete`, `dropDatabase`, or administrative commands.
2. **Sole Boundary is Loopback (`127.0.0.1`)**: Because `bindIp: 127.0.0.1` is set, remote machines across the local area network cannot reach MongoDB. The security boundary is strictly the Windows OS localhost perimeter.
3. **Application & Script Connection Paths**:
   - Web application backend: `server/.env` sets `MONGODB_URI=mongodb://localhost:27017/shivneri_classic_admin_db`.
   - Provisioning script: Defaults to `mongodb://localhost:27017`.
   - Ad-hoc scripts / IDE extensions: Any script in the repository or user profile connecting to localhost has unrestricted write access.

### 3.3 Audit Finding SEC-AUDIT-01 Evaluation
> [!CRITICAL]
> **Database Authentication is Disabled.**  
> The belief that "only the migration script can write to MongoDB" is an **assumption**, not a technically enforced reality.  
> If an operator has a mongosh prompt open, or a Python script running, or a background test running, that process has full permission to mutate `shivneri_classic_admin_db` or `shivneri_classic_prod_db`.  
> Live cutover must therefore be accompanied by explicit process and connection table auditing.

---

## 4. Mandatory Audit Area 2: Windows Process and Network Inspection

### 4.1 Incomplete Process Inspection Scope (SEC-AUDIT-03)
In [`server/src/scripts/checkWriterIsolation.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/checkWriterIsolation.js#L165-L225), the process inspection query is:
```javascript
const psCmd = `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object ProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress`;
```
- **Limitation**: The filter strictly matches `Name = 'node.exe'`.
- **Omitted Runtimes**:
  - `python.exe` / `pythonw.exe` (common for data migrations or utility scripts).
  - `mongosh.exe` (interactive MongoDB shell).
  - `compass.exe` (MongoDB Compass desktop GUI).
  - `powershell.exe` / `pwsh.exe` running custom automation.
- **Audit Verification**: Direct inspection of the Windows process table during audit confirms that none of these processes are currently running. However, the preflight script *would not have detected them* if they were.

### 4.2 Omission of Port 27017 Established Sockets (SEC-AUDIT-02)
In [`server/src/scripts/checkWriterIsolation.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/checkWriterIsolation.js#L30), the configuration states:
```javascript
export const ISOLATION_DEFAULTS = {
  PORTS_TO_CHECK: [5000, 5173],
  ...
};
```
- **Limitation**: The script only inspects whether ports 5000 (Express) and 5173 (Vite) are in `LISTENING` state.
- **The Blind Spot**: It never queries `Get-NetTCPConnection` for established client sockets where `RemotePort -eq 27017`.
- **Audit Proof**: If a background Python daemon or GUI client had an open connection to MongoDB port 27017, `checkWriterIsolation.js` would report `PASS` with 0 issues.

### 4.3 Scheduled Tasks and Background Launch Mechanisms
Inspection via `Get-ScheduledTask` and `Get-Service` confirmed:
- Zero scheduled tasks matching `shivneri` or `apartment`.
- Zero non-standard Windows services matching `shivneri`.
- MongoDB service runs as `NT AUTHORITY\NetworkService` with PID `4992`.

---

## 5. Mandatory Audit Area 3: Provisioning Script Review

Static code audit of [`server/src/scripts/provisionProductionNamespace.js`](file:///d:/Shivneri%20Classic%20App/server/src/scripts/provisionProductionNamespace.js):

### 5.1 Exact Namespace Identifiers
- **Source Database**: `PROVISIONING_DEFAULTS.SOURCE_DB_NAME = 'shivneri_classic_admin_db'` (Line 51).
- **Target Database**: `PROVISIONING_DEFAULTS.TARGET_DB_NAME = 'shivneri_classic_prod_db'` (Line 52).
- **Collision Guard**: Line 232 enforces `if (targetDbName === sourceDbName) throw new Error(...)`.
- **Census Evidence**: `shivneri_classic_prod_db` strictly **does not exist** (`false`). Source holds **194 documents across 10 collections**.

### 5.2 Source Data Immutability
- The source connection is used solely for `findOne`, `find`, `listCollections`, and `countDocuments`.
- There are **zero** `deleteMany`, `updateOne`, `drop`, or write operations targeting `sourceDb`.
- Stage 8 (Lines 495–505) asserts `finalSourceDocCount === initialSourceDocCount === 194`. If mutated, it throws `CRITICAL_MUTATION_ERROR`.
- *Cautionary Note*: Source immutability is guaranteed by script logic, not database-layer read-only privileges (due to SEC-AUDIT-01).

### 5.3 Approved Master Data Filtering (Zero Financial Contamination)
The script extracts and provisions strictly:
1. `admins`: Exactly 1 record (`_id: 6aea204000998a1c2ff96df8`, `fullNameMarathi: श्री ल.रा. कोळी`, `role: SUPER_ADMIN`, `singletonKey: SHIVNERI_SUPER_ADMIN_SINGLETON`).
2. `residents`: Exactly 16 records (`status: ACTIVE`, `flatNumber: ""`, Marathi names preserved).
3. `maintenanceconfigs`: Exactly 1 record (`defaultMonthlyAmount: 1000`, `dueDay: 10`, `singletonKey: MAINTENANCE_CONFIG_SINGLETON`).
- **Target Census Invariant**: Strictly 18 documents across 3 collections (`admins`, `residents`, `maintenanceconfigs`).
- **Excluded Ledgers**: All 32 dues, 7 payments, 5 expenses, 1 opening balance, 2 counters, and 129 audit logs are strictly excluded. Stage 7 asserts their absence.

### 5.4 Dual-Backup Cryptographic Handshake
- Stage 0 executes `assertDistinctBackupPaths` and `verifyDualBackups`.
- Rejects missing files, tampered checksums, identical paths, and hard links sharing identical NTFS inodes (`dev` + `ino`).
- Both physical archives match SHA256: `dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec`.
- CLI argument `--skip-backup-handshake` was permanently deleted.

### 5.5 Failure Handling & Fail-Closed Retry Protection
- Stage 3 checks target database pre-conditions:
  ```javascript
  if (targetColls.length > 0 || existingTargetDocCount > 0) {
    throw new Error(`TARGET_DATABASE_NOT_EMPTY: Target database "${targetDbName}" already exists ... Refusing to overwrite! Fail-closed.`);
  }
  ```
- If migration aborts midway, the target database will contain $\ge 1$ documents.
- Any subsequent invocation fails closed immediately.
- `dropDatabase()` has been completely removed from `provisionProductionNamespace.js`. Zero automated drops can occur.

---

## 6. Mandatory Audit Area 4: Isolation Strategy Review

### 6.1 Evaluation of Current Isolation Strategy
The current isolation strategy relies on:
1. Shutting down application web ports (5000 and 5173).
2. Verifying zero active user operations via `currentOp()`.
3. Executing live provisioning via CLI dual-flag authorization.

### 6.2 Comparison: Live Source Querying vs. Backup-Based Provisioning (SEC-AUDIT-04)
- **Current Approach**: `provisionProductionNamespace.js` queries the live MongoDB instance on port 27017 to extract master records.
- **Architectural Vulnerability**: Because MongoDB has no authentication, if an unmonitored process writes to `shivneri_classic_admin_db` during the cutover run, the script could extract polluted data.
- **Safer Alternative**: Extracting the 18 master records directly from the verified cryptographic backup archive (`.gz`) guarantees absolute immutability, because the backup archive is static and cryptographically signed.
- **Audit Recommendation**: While live extraction is acceptable for Phase 9.1.2 under supervised conditions (because Stage 8 verifies source standstill and canonical hashes match), migrating from a verified backup archive is the gold standard for enterprise cutovers.

### 6.3 Standalone MongoDB Point-in-Time Reality (SEC-AUDIT-05)
`currentOp()` takes a snapshot of queries in execution at that specific millisecond. It does not set an exclusive lock. Isolation is achieved by ensuring that **no processes are running that could issue queries**, not by MongoDB engine locks.

---

## 7. Mandatory Audit Area 5: Test Quality Assessment

### 7.1 Existing Test Suite Strengths
- **160 Total Passing Tests**:
  - `test-writer-isolation.js`: 38 tests (verifies port states, `Win32_Process` query, and live ephemeral TCP socket detection).
  - `test-provisioning-script.js`: 76 tests (verifies dry-run, flag gates, census parity, index recreation, hard links, and fail-closed retries).
  - `test-prelaunch-cleanup.js`: 35 tests.
  - `test-clean-slate-rehearsal.js`: 11 stages.
- Tests exercise real failure paths (checksum tampering, missing files, non-empty target rejection, role tampering detection).

### 7.2 Identified Test Gaps (SEC-AUDIT-06)
1. **No Test for Port 27017 Established Client Sockets**: Tests did not simulate a third-party process holding an open socket to MongoDB port 27017.
2. **No Test for Non-Node Process Infiltration**: Tests only passed `node.exe` mock processes to the filter.
3. **No Intermediate Partial Failure Simulation**: Test `5B` verified retry failure after 1 Admin document was pre-seeded. It did not test partial failure halfway through the 16 residents (e.g. at resident 8).

---

## 8. Required Pre-Cutover Remediation & Supervised Execution Runbook

To elevate the **CONDITIONAL GO** verdict to an authorized production cutover, the following mandatory steps must be executed:

### Step 1: Pre-Cutover Port 27017 Connection Audit
Before executing provisioning, run the following PowerShell command to assert zero established client connections to MongoDB:
```powershell
# Verify no other client has an open TCP socket to MongoDB port 27017
$mongoClients = Get-NetTCPConnection | Where-Object { $_.RemotePort -eq 27017 -and $_.State -eq 'Established' }
if ($mongoClients) {
    Write-Error "CRITICAL: Active client connections detected on MongoDB port 27017! Cutover aborted."
    $mongoClients | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess
    exit 1
} else {
    Write-Host "✓ Zero external client connections to MongoDB port 27017."
}
```

### Step 2: Multi-Runtime Process Scan
Scan for non-Node database tooling:
```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -match "mongosh|compass|python" } | Select-Object ProcessId, Name, CommandLine
```
*Requirement*: Must return zero processes.

### Step 3: Run the Preflight Inspector
```powershell
node server/src/scripts/checkWriterIsolation.js
```
*Requirement*: Must return `PREFLIGHT WRITER-ISOLATION VERDICT: [ PASS ]`.

### Step 4: Supervised Live Execution (Dual-Flag Mandate)
Only after Steps 1, 2, and 3 pass, execute live provisioning:
```powershell
node server/src/scripts/provisionProductionNamespace.js --execute --confirm-production-cutover
```

### Step 5: Post-Cutover Verification
1. Verify `shivneri_classic_prod_db` holds strictly 18 documents across 3 collections.
2. Verify `shivneri_classic_admin_db` holds strictly 194 documents across 10 collections.
3. Point `server/.env` to `MONGODB_URI=mongodb://localhost:27017/shivneri_classic_prod_db`.

---

## 9. Forensic Standstill Evidence

### 9.1 Source Database Census (`shivneri_classic_admin_db`)
- Total Collections: **10**
- Total Active Documents: **194**
  - `admins`: 1
  - `residents`: 16
  - `maintenanceconfigs`: 1
  - `maintenancedues`: 32
  - `payments`: 7
  - `expenses`: 5
  - `cashbookopeningbalances`: 1
  - `counters`: 2
  - `auditlogs`: 129
  - `expensecategories`: 0

### 9.2 Production Database Existence
- `shivneri_classic_prod_db exists`: **`false`** (Strictly non-existent).

### 9.3 Physical Backup SHA256 Hashes
- **Primary Archive (`D:\...\shivneri_classic_admin_db_backup.gz`)**:  
  `dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec`
- **Secondary Archive (`C:\...\shivneri_classic_admin_db_backup.gz`)**:  
  `dda990926ac61ae830a6e8f81a56c54214243f6080b50ee7ef4e9b3549b9f1ec`
- *Both archives are verified bit-perfect and physically distinct.*

---

## 10. Final Independent Auditor Sign-Off

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   INDEPENDENT AUDITOR CERTIFICATION                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   AUDITOR VERDICT: CONDITIONAL GO                                            ║
║                                                                              ║
║   The application and migration scripts are mathematically rigorous and      ║
║   provably fail-closed. However, the host MongoDB instance has no auth       ║
║   and writer isolation cannot rely on software assumptions.                  ║
║                                                                              ║
║   Live production cutover may proceed ONLY under direct human supervision    ║
║   following the 5-step runbook in Section 8 of this report.                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---
*Report certified by Independent Senior MongoDB Security Engineer & Windows Infrastructure Auditor.*  
*Standstill maintained. Awaiting explicit user instruction before any live cutover.*

