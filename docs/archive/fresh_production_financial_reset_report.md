# 📋 Pre-Reset Census & Verification Report: Fresh Production Operational Reset

**Shivneri Classic Apartment, Kapaleshwar Nagar, Nashik**  
**Database:** `shivneri_classic_prod_db`  
**Host:** `127.0.0.1:27017`  
**Execution Phase:** Phase 1 — Pre-Reset Census, Cryptographic Backup & Dry-Run Simulation  
**Status:** ⏸️ **AWAITING USER EXPLICIT APPROVAL** (No deletions performed)  
**Super Admin:** Shri Laxman R. Koli (`laxman_koli`)  
**Audit Timestamp:** November 4, 2026, 20:35 IST

---

## 1. Executive Summary & Objective

To prepare **Shivneri Classic Apartment** for a clean client demonstration and official operational rollout, all previous test and demo financial transactions must be purged, while **100% of resident and commercial shop master records, admin accounts, and category configurations are preserved strictly**.

In strict compliance with the **Data Safety & Integrity Rules**, this report presents:
1. Complete **production database census** across all 12 collections.
2. Verification of **20 resident master records** (16 flats, 4 shops).
3. Creation and cryptographic verification of a **fresh read-only backup** (`fresh_reset_20261104_203250`).
4. Read-only **dry-run reset simulation** showing exact projected document counts.
5. Explicit safety confirmation and stop point requesting user approval.

---

## 2. Complete Production Database Census

A full census was executed against `shivneri_classic_prod_db`:

| # | Collection Name | Classification | Current Count | Action Proposed | Projected Post-Reset Count |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **`residents`** | **Master Data** | **20** | **PRESERVE (NO CHANGE)** | **20** |
| 2 | **`admins`** | **Master Data / Auth** | **1** | **PRESERVE (NO CHANGE)** | **1** |
| 3 | **`maintenanceconfigs`** | **Configuration** | **1** | **PRESERVE (NO CHANGE)** | **1** |
| 4 | **`expensecategories`** | **Master Data** | **9** | **PRESERVE (NO CHANGE)** | **9** |
| 5 | `chairmantransferlogs` | Security History | 0 | PRESERVE (Already 0) | 0 |
| 6 | `passwordresets` | Security Token | 0 | PRESERVE (Already 0) | 0 |
| 7 | **`maintenancedues`** | **Financial Operational** | **56** | **PURGE / DELETE** | **0** |
| 8 | **`payments`** | **Financial Operational** | **3** | **PURGE / DELETE** | **0** |
| 9 | **`expenses`** | **Financial Operational** | **0** | **PURGE / DELETE** | **0** |
| 10 | **`cashbookopeningbalances`** | **Financial Operational** | **0** | **PURGE / DELETE** | **0** |
| 11 | **`counters`** | **Sequence Counter** | **1** | **PURGE / RESET** | **0** |
| 12 | **`auditlogs`** | **Audit Trail** | **8** | **PRESERVE SECURITY + LOG RESET** | **4** |
| **TOTAL** | **12 Collections** | — | **99** | **Purge 59 Operational + 5 Test Logs** | **35 Documents** |

---

## 3. Master Data Preservation Details (Guaranteed Zero Deletion)

### A. Resident & Commercial Shop Master Records (20 Total)
- **Residential Flats (16 Units):**
  - Flats: `101`, `102`, `103`, `104`, `201`, `202`, `203`, `204`, `301`, `302`, `303`, `304`, `401`, `402`, `403`, `404`
  - All Marathi names, contact numbers, email addresses, and active statuses will remain strictly intact.
- **Commercial Shops (4 Units):**
  - Shops: `Shop No - 1`, `Shop No - 2`, `Shop No - 3`, `Shop No - 4`
  - Commercial business names and contact numbers will remain strictly intact.
- **Maintenance Categories Preserved:**
  - `RESIDENTIAL` (₹1,000/mo): 15 units
  - `SHOP` (₹300/mo): 4 units
  - `CHAIRMAN` (₹500/mo): 1 unit (Flat 102 - Shri L.R. Koli)
  - `UNASSIGNED`: 0 units

### B. Super Admin Account
- **Username:** `laxman_koli`
- **Role:** `SUPER_ADMIN`
- **Designation:** Chairman / Building Secretary
- **Password Hash:** Preserved `$2b$12$...` (Password remains `Devraj@123`)

### C. Maintenance & Expense Configurations
- **Category Rates:** Residential ₹1,000, Shop ₹300, Chairman ₹500
- **Default Due Day:** 10th of every month
- **Expense Categories (9 Standards):** `ELECTRICITY`, `WATER`, `CLEANING`, `SECURITY`, `REPAIR_MAINTENANCE`, `PLUMBING`, `LIFT`, `GARDEN`, `OTHER`

---

## 4. Financial Records Proposed for Reset (59 Documents)

1. **`maintenancedues` (56 records):**
   - Previous test bills across past months (Total billed: ₹56,000, Total paid: ₹1,000, Outstanding: ₹55,000).
   - Will be deleted so that billing starts with a completely clean slate.
2. **`payments` (3 records):**
   - Receipts `SCA-202611-0001`, `SCA-202611-0002`, `SCA-202611-0003` (demo payments and cancellations).
   - Will be deleted so payments registry shows ₹0 collections.
3. **`counters` (1 record):**
   - `_id: "receipt_202611"` (Current seq: 3).
   - Resetting this ensures the next live receipt issued for November 2026 starts cleanly at **`SCA-202611-0001`**.
4. **`auditlogs` Retention Policy:**
   - **Preserved (3 records):** Administrative security logs (`ADMIN_PASSWORD_CHANGED` × 2, `MAINTENANCE_CATEGORY_ASSIGNED` × 1).
   - **Purged (5 records):** Test payment transaction logs (`PAYMENT_RECORDED` × 3, `PAYMENT_CANCELLED` × 2).
   - **Appended (1 record):** Immutable audit event `FINANCIAL_OPERATIONAL_RESET` recording the reset action, backup archive hash, and authorized admin ID.

---

## 5. Fresh Cryptographic Backup Verification Evidence

A verified backup was created prior to proposing any deletion:

- **Backup Directory:** `D:\Shivneri Classic App\backups\fresh_reset_20261104_203250`
- **Archive File:** `shivneri_classic_prod_db_backup.gz` (Size: 6,282 bytes)
- **SHA-256 Checksum:** `563c1285e5e2530a8ed565bdcca35066dd0e2970a496b30c8afdb60b4afa415a`
- **File Protection:** Marked **Read-Only** (`-ar---`) to prevent modification.
- **Restoration Test:** Restored into isolated database `shivneri_classic_backup_verify_db` using `mongorestore`.
- **Parity Result:** **100% Match across all 12 collections** (verified and dropped).

---

## 6. Verification Plan Following Approval

Upon receiving explicit user approval:
1. Execute `server/executeFinancialReset.mjs` with `--execute-confirmed`.
2. Confirm document counts in `shivneri_classic_prod_db`:
   - `residents` = 20
   - `admins` = 1
   - `maintenancedues` = 0
   - `payments` = 0
   - `expenses` = 0
   - `cashbookopeningbalances` = 0
   - `counters` = 0
3. Run browser verification on `https://localhost:5443`:
   - Admin Login (`laxman_koli` / `Devraj@123`).
   - Dashboard: Verify Total Revenue = ₹0, Total Outstanding = ₹0, Total Expenses = ₹0.
   - Residents: Verify all 20 residents with categories visible.
   - Maintenance: Verify 0 dues, rates intact (1000/300/500).
   - Generate Monthly Dues Preview: Verify clean preview calculation.
4. Capture post-reset verification screenshots.

