# 📋 Revised Production Financial Reset Plan: Final Dry-Run & Safety Audit

**Shivneri Classic Apartment, Kapaleshwar Nagar, Nashik**  
**Database:** `shivneri_classic_prod_db`  
**Host:** `127.0.0.1:27017`  
**Status:** ⏸️ **READY FOR APPROVAL — NO PRODUCTION DELETIONS PERFORMED**  
**Super Admin:** `laxman_koli`  
**Document Code:** `SCA-RESET-DRYRUN-V2`  
**Timestamp:** November 4, 2026, 20:40 IST

---

## 1. Executive Summary & Policy Corrections

In accordance with the final reset directives, the fresh production operational reset plan for Shivneri Classic Apartment has been corrected and finalized:

1. **Sequential Counters PRESERVED**:
   - `counters` collection document (`receipt_202611`, current sequence: `3`) is **100% PRESERVED**.
   - Sequence will continue safely: The next generated receipt for November 2026 will be **`SCA-202611-0004`**.
   - **Guarantees zero duplicate receipt numbers** and prevents any confusion or collisions with previously issued physical or PDF receipts.
2. **Audit History PRESERVED**:
   - All **8 existing audit logs** (including payment recordings, cancellations, password changes, and category assignments) are **100% PRESERVED**.
   - After approved reset execution, exactly **1 new immutable audit event** (`FINANCIAL_OPERATIONAL_RESET`) will be appended documenting the reset, timestamp, authorized admin ID, and deleted counts.
3. **Master Data PRESERVED**:
   - All **20 resident and commercial shop records** remain untouched with all contact numbers, Marathi names, flat/shop numbers, property types, and maintenance categories.
4. **Scope of Deletion STRICTLY LIMITED to 59 Records**:
   - Exactly **56 maintenance dues** (`maintenancedues`).
   - Exactly **3 payment transactions** (`payments`).
   - 0 expenses, 0 cashbook opening balances (already 0).
5. **Zero Deletions Have Occurred**: The system remains in a read-only audit state awaiting explicit final user approval.

---

## 2. Target Collection Census & Before / After Projection

| # | Collection Name | Data Classification | Current Count | Action | Projected Count |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **`residents`** | Master Data (Flats & Shops) | **20** | **PRESERVE (NO CHANGE)** | **20** |
| 2 | **`admins`** | Super Admin Account | **1** | **PRESERVE (NO CHANGE)** | **1** |
| 3 | **`maintenanceconfigs`** | Rate Tier Configuration | **1** | **PRESERVE (NO CHANGE)** | **1** |
| 4 | **`expensecategories`** | Expenditure Master Data | **9** | **PRESERVE (NO CHANGE)** | **9** |
| 5 | **`counters`** | **Sequential Counter** | **1** | **PRESERVE (CONTINUE SEQ)** | **1** |
| 6 | **`auditlogs`** | **Audit Trail** | **8** | **PRESERVE ALL + APPEND 1** | **9** |
| 7 | `chairmantransferlogs` | Security History | 0 | PRESERVE (Already 0) | 0 |
| 8 | `passwordresets` | Security Tokens | 0 | PRESERVE (Already 0) | 0 |
| 9 | **`maintenancedues`** | **Financial Operational Bills** | **56** | **PURGE (DELETE)** | **0** |
| 10 | **`payments`** | **Financial Operational Receipts** | **3** | **PURGE (DELETE)** | **0** |
| 11 | **`expenses`** | Financial Operational Vouchers | 0 | PURGE (Already 0) | 0 |
| 12 | **`cashbookopeningbalances`** | Financial Opening Balances | 0 | PURGE (Already 0) | 0 |
| **TOTAL** | **12 Collections** | — | **99** | **Delete Exactly 59 Records** | **40 Documents** |

---

## 3. Master Data Preservation Details

### A. Roster of Preserved Resident & Commercial Units (20 Total)
- **Residential Flats (16 Units):**
  - Flat Numbers: `101`, `102`, `103`, `104`, `201`, `202`, `203`, `204`, `301`, `302`, `303`, `304`, `401`, `402`, `403`, `404`
  - Resident Names: All official Marathi names preserved without alteration.
  - Category Breakdown: 15 Residential (₹1,000/mo), 1 Chairman (Flat 102 - Shri L.R. Koli, ₹500/mo).
- **Commercial Shops (4 Units):**
  - Shop Numbers: `Shop No - 1`, `Shop No - 2`, `Shop No - 3`, `Shop No - 4`
  - Category: Commercial Shop (₹300/mo).
- **Contacts & Statuses:** Mobile numbers, alternate addresses, and Active statuses (`ACTIVE`) preserved.

### B. Numbering Continuity & Receipt Safety
- `counters` record `receipt_202611` with `seq: 3` is preserved.
- When the first live payment is recorded following the reset, the system will atomically increment to `seq: 4` and issue:
  $$\text{Receipt Number} = \mathbf{SCA-202611-0004}$$
- This guarantees:
  1. No newly issued receipt will ever duplicate numbers `SCA-202611-0001`, `0002`, or `0003`.
  2. Any previously printed test receipts cannot be confused with official production receipts.

### C. Complete Audit History Preservation
The 8 existing audit logs will remain intact:
1. `PAYMENT_RECORDED` (2026-11-04 15:30:32 IST)
2. `PAYMENT_RECORDED` (2026-11-04 15:45:31 IST)
3. `PAYMENT_CANCELLED` (2026-11-04 15:46:27 IST)
4. `PAYMENT_RECORDED` (2026-11-04 15:47:20 IST)
5. `PAYMENT_CANCELLED` (2026-11-04 19:20:46 IST)
6. `ADMIN_PASSWORD_CHANGED` (2026-11-04 19:27:13 IST)
7. `ADMIN_PASSWORD_CHANGED` (2026-11-04 19:27:44 IST)
8. `MAINTENANCE_CATEGORY_ASSIGNED` (2026-11-04 20:26:26 IST)
9. *(To be appended upon execution)*: `FINANCIAL_OPERATIONAL_RESET`

---

## 4. Cryptographic Backup Evidence & Parity Verification

A fresh verified backup was created prior to proposing deletion:

- **Backup Directory:** `backups/fresh_reset_20261104_203250`
- **Archive File:** `shivneri_classic_prod_db_backup.gz` (Size: 6,282 bytes)
- **SHA-256 Checksum:**
  ```
  563c1285e5e2530a8ed565bdcca35066dd0e2970a496b30c8afdb60b4afa415a
  ```
- **Integrity Status:** Cryptographically matched with `checksum.sha256`.
- **Restoration Parity Test:** Restored into isolated database `shivneri_classic_backup_verify_db` via `mongorestore`. Parity confirmed at **100% across all 12 collections**.
- **Archive Permissions:** Set to **Read-Only** (`-ar---`) to ensure physical protection.

---

## 5. Security Advisory & Credential Flagging

> [!WARNING] **Security Advisory — Credential Flagged for Post-Reset Rotation**
> - The Super Admin password for account `laxman_koli` was previously shared/input during test workflows.
> - **In compliance with policy:** The password has **NOT** been altered automatically.
> - **Action Item:** Upon completion of the operational reset, the Super Admin should log in via `https://localhost:5443` and execute a manual password rotation under **Admin Settings > Account Security**.
> - All passwords and cryptographic secret hashes in this and all related documents have been redacted.

---

## 6. Deterministic Rollback Procedure

Should an unexpected interruption occur or should rollback to the pre-reset state be required, an automated rollback script is pre-staged:

### Automated Rollback Command
```powershell
cd "d:\Shivneri Classic App"
node server/rollbackToVerifiedBackup.mjs --rollback-confirmed
```

### Manual Rollback Steps
1. Verify SHA-256 checksum of `backups/fresh_reset_20261104_203250/shivneri_classic_prod_db_backup.gz`.
2. Restore using `mongorestore`:
   ```bash
   "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" \
     --uri="mongodb://siteAdmin:[REDACTED]@127.0.0.1:27017/?authSource=admin" \
     --nsInclude="shivneri_classic_prod_db.*" \
     --archive="D:\Shivneri Classic App\backups\fresh_reset_20261104_203250\shivneri_classic_prod_db_backup.gz" \
     --gzip \
     --drop
   ```
3. Re-verify collection counts match the pre-reset census (56 dues, 3 payments, 20 residents, 1 admin).

---

## 7. Execution Readiness & Stop Gate

- **Script Staged:** `server/executeFinancialReset.mjs` (configured with safety guard requiring `--execute-confirmed`).
- **Dry-Run Completed:** Confirmed zero side-effects. Exactly 59 records targeted for purge.
- **Current State:** Production database `shivneri_classic_prod_db` is **100% UNMODIFIED**.

> [!IMPORTANT] **AWAITING USER FINAL APPROVAL**  
> No deletions will be performed until you give explicit final authorization to proceed.

