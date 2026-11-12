# SHIVNERI CLASSIC APARTMENT – A WING
## Phase 5: Monthly Maintenance Management Engine Verification Report

---

### Executive Summary

| Attribute | Details / Status |
| :--- | :--- |
| **Project Workspace** | `D:\Shivneri Classic App` (Confirmed Fresh & Isolated) |
| **Official Application** | **Shivneri Classic Apartment – A Wing** |
| **Location** | Aurangabad Road, Panchavati, Nashik, Maharashtra, India |
| **Database** | `shivneri_classic_admin_db` (Isolated MongoDB Instance) |
| **Sole Super Admin** | **श्री ल.रा. कोळी** (*Shri Laxman Koli*), Chairman / Building Secretary |
| **Resident Master Records** | **Exactly 16 Original Members (100% Authentic Marathi Spelling Preserved)** |
| **Access Control** | Super Admin Management Only (Zero resident logins, passwords, or dashboards) |
| **Phase 5 Engine** | **Monthly Maintenance Management Engine (Config, Idempotent Generation, Dues Register)** |
| **Phase Boundaries** | Strictly dues engine; No payment recording, receipts, or expenses in Phase 5 |
| **Automated Test Results** | **16 / 16 Phase 5 Tests Passed (100% PASS Rate)** |
| **Regression Status** | Phase 3 (10/10), Phase 3.1 (14/14), Phase 4 (13/13) — **ALL 100% PASS** |
| **Frontend Production Build** | **Success (0 errors, Vite v8.3.5, 1.80s)** |

---

## 1. Files Created and Modified

### Backend (Server)
- `server/src/models/MaintenanceConfig.js`: Singleton configuration schema (`singletonKey`, `defaultMonthlyAmount`, `dueDay`, `lateFeeEnabled`, `lateFeeAmount`, `financialYearStartMonth`, `isConfigured`). Guaranteed single record via database-level unique index.
- `server/src/models/MaintenanceDue.js`: Maintenance dues schema with compound unique constraint `(residentId, month, year)`. Includes snapshots (`residentNameSnapshot`, `flatNumberSnapshot`), amounts (`maintenanceAmount`, `lateFeeAmount`, `totalAmountDue`, `amountPaid`), virtual `balanceAmount`, `dueDate`, `status`, and `remarks`.
- `server/src/controllers/maintenanceController.js`: Full business logic controller with 7 controller actions:
  - `getMaintenanceConfig`: Fetches current singleton settings (signals `isConfigured: false` if unconfigured).
  - `updateMaintenanceConfig`: Validates and persists Super Admin configuration.
  - `previewMonthlyGeneration`: Analyzes billing run for a selected month/year without writing to DB.
  - `generateMonthlyDues`: Idempotently generates dues using atomic `bulkWrite` with `$setOnInsert`.
  - `getMaintenanceDues`: Queries dues registry with filters (month, year, status, search) and pagination.
  - `getMaintenanceDueById`: Retrieves full details of a specific monthly due with resident metadata.
  - `getMaintenanceSummary`: Aggregates total billed, total paid, total outstanding, and status counts.
- `server/src/routes/maintenanceRoutes.js`: Express router mounted at `/api/v1/maintenance`, protected by `requireAdminAuth` and express-validator input sanitization.
- `server/src/app.js`: Mounted `maintenanceRoutes` under `/api/v1/maintenance`.
- `server/test-phase5-suite.js`: Comprehensive 16-point automated test script with concurrent race testing and regression verification.

### Frontend (Client)
- `client/src/pages/maintenance/MaintenanceManagement.jsx`: Complete, responsive Devanagari/Marathi-first management interface featuring:
  - Interactive tabs: **देयक नोंदवही (Dues Registry)**, **मासिक देयके निर्मिती (Generate)**, **देखभाल दर सेटिंग्ज (Config)**.
  - Financial metric cards (Total Billed, Total Collected, Total Balance Due, Generation Rate).
  - Bill generation workflow with real-time preview, resident count summary, and modal confirmation.
  - Dues table with status badges (`UNPAID`, `PARTIAL`, `PAID`), month/year selectors, and search.
  - Detailed view modal showing bill breakdown and resident snapshot.
  - Configuration card for monthly rate (₹), due day (1-28), and optional late fees.
- `client/src/context/LanguageContext.jsx`: Extended bilingual dictionary (मराठी default / English secondary; strictly no Hindi) covering all maintenance terms.
- `client/src/pages/dashboard/Dashboard.jsx`: Added quick-access Monthly Maintenance tile with real-time routing.
- `client/src/App.jsx`: Configured protected `/maintenance` route under `ProtectedRoute`.

---

## 2. Monthly Maintenance Configuration Design

### Singleton Enforcement
To guarantee a single consistent setting for the society, `MaintenanceConfig` uses a database-level singleton key:
```javascript
singletonKey: {
  type: String,
  default: 'SHIVNERI_MAINTENANCE_CONFIG_SINGLETON',
  unique: true,
  immutable: true,
  required: true
}
```

### Zero Invented Defaults & Unconfigured Guard
In strict compliance with instructions:
- The system **does not invent or guess** any maintenance fee or due date.
- Initial state has `isConfigured: false` with null amount and due day.
- Attempting to generate monthly dues before Super Admin explicit configuration triggers **HTTP 400 Bad Request**:
  > *"मासिक देखभाल दर अद्याप निश्चित केलेले नाहीत. कृपया प्रथम सेटिंग्जमध्ये जाऊन दर निश्चित करा."*

### Configurable Parameters
- **`defaultMonthlyAmount`**: Monthly maintenance fee (₹) applicable to residents.
- **`dueDay`**: Due day of each month (constrained between 1 and 28 to safely cover all months, including February).
- **`lateFeeEnabled`**: Optional boolean toggle (defaults to `false`).
- **`lateFeeAmount`**: Late fee penalty amount in ₹ (defaults to 0).
- **`financialYearStartMonth`**: Financial year commencement month (defaults to 4 / April).

---

## 3. Maintenance Due Model & Database Constraints

### Compound Unique Index for Duplicate Prevention
To guarantee that a resident can never receive duplicate dues for the same calendar month and year, the schema enforces a physical compound unique index directly in MongoDB:

```javascript
maintenanceDueSchema.index(
  { residentId: 1, month: 1, year: 1 },
  { unique: true, name: 'resident_month_year_unique' }
);
```

### Snapshot Pattern for Audit Integrity
In accordance with apartment accounting best practices, each generated due captures immutable snapshots of resident data at the time of billing:
- `residentNameSnapshot`: Full Marathi name of the resident.
- `flatNumberSnapshot`: Assigned flat number at the moment of billing.
If a resident later updates their record or changes flats, historical billing statements remain 100% auditable and unmodified.

### Virtual Outstanding Balance
Balance is dynamically calculated as:
$$\text{balanceAmount} = \text{totalAmountDue} - \text{amountPaid}$$
with a minimum floor of 0.

---

## 4. Idempotent Generation Engine Architecture

The monthly bill generation endpoint (`POST /api/v1/maintenance/generate`) implements atomic bulk upsert semantics:

```javascript
const bulkOperations = activeResidents.map((resident) => ({
  updateOne: {
    filter: {
      residentId: resident._id,
      month: targetMonth,
      year: targetYear
    },
    update: {
      $setOnInsert: {
        residentId: resident._id,
        residentNameSnapshot: resident.fullNameMarathi,
        flatNumberSnapshot: resident.flatNumber || '',
        month: targetMonth,
        year: targetYear,
        maintenanceAmount: config.defaultMonthlyAmount,
        lateFeeAmount: calculatedLateFee,
        totalAmountDue: config.defaultMonthlyAmount + calculatedLateFee,
        amountPaid: 0,
        status: 'UNPAID',
        dueDate: dueDate,
        generatedBy: req.admin._id
      }
    },
    upsert: true
  }
}));

const bulkResult = await MaintenanceDue.bulkWrite(bulkOperations, { ordered: false });
```

### Key Guarantees:
1. **Zero Duplicates**: `$setOnInsert` only executes when the document does not exist. Re-running generation for the same month/year creates 0 records (`upsertedCount: 0`).
2. **Payment Protection**: Existing dues with payments (`amountPaid > 0` or status `PARTIAL`/`PAID`) are **never overwritten or reset**.
3. **Active Resident Targeting**: Only residents with `status: 'ACTIVE'` receive new bills; inactive or departed residents are automatically excluded.
4. **Concurrency Safety**: 10 simultaneous parallel generation calls safely resolve without duplicate index violations or race anomalies.

---

## 5. API Endpoints Specification

All endpoints are prefix-mounted at `/api/v1/maintenance` and require Super Admin authentication (`requireAdminAuth`) and valid CSRF headers (`X-Requested-With` and authorized `Origin`).

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/config` | Get current maintenance configuration | Super Admin |
| `POST` | `/config` | Update maintenance rate, due day, and late fee | Super Admin |
| `GET` | `/preview` | Preview bill generation stats for given `month` & `year` | Super Admin |
| `POST` | `/generate` | Idempotently generate monthly dues for active residents | Super Admin |
| `GET` | `/dues` | List dues register with search, status, month, and year filters | Super Admin |
| `GET` | `/dues/:id` | Get individual monthly due details by ID | Super Admin |
| `GET` | `/summary` | Aggregate financial summary (billed, collected, balance) | Super Admin |

---

## 6. Comprehensive Automated Test Execution & Results

Test Command: `node server/test-phase5-suite.js`

### Phase 5 Test Results Matrix (16 / 16 PASSED)

| # | Test Scenario / Verification Description | Expected Result | Actual Result | Status |
| :-: | :--- | :--- | :--- | :-: |
| **01** | Missing maintenance config blocks bill generation | HTTP 400 Bad Request | HTTP 400 (Config required) | **PASS** |
| **02** | Maintenance config creation & update | Singleton config updated to ₹1500, due day 10 | Persisted correctly (₹1500) | **PASS** |
| **03** | Generate monthly bills for 11/2026 | Exactly 16 bills created for 16 active residents | 16 bills created | **PASS** |
| **04** | Inactive residents skipped in bill generation | Temporary inactive resident receives no bill | Inactive bill is null | **PASS** |
| **05** | Compound uniqueness: 1 bill per resident per month/year | 16 bills match 16 unique resident IDs | 16 unique IDs matched | **PASS** |
| **06** | Re-generation idempotency for 11/2026 | Repeating generation creates 0 new bills | Created: 0, Total: 16 | **PASS** |
| **07** | 10 Parallel concurrent generation requests | Concurrent calls produce 0 duplicates | Count remains exactly 16 | **PASS** |
| **08** | Existing paid amounts & status never overwritten | Bill with ₹500 paid remains ₹500 & PARTIAL | Paid: ₹500, Status: PARTIAL | **PASS** |
| **09** | Initial paid amount strictly zero for generated bills | All newly generated bills have `amountPaid == 0` | Non-zero count: 0 | **PASS** |
| **10** | Outstanding balance calculation formula | `balanceAmount == totalAmountDue - amountPaid` | All 16 matched exactly | **PASS** |
| **11** | Dues query filtering by month, year, and status | Query returns only matching filtered records | Filter returned 16 bills | **PASS** |
| **12** | Unauthenticated access rejection | Denied with HTTP 401 Unauthorized | GET: 401, POST: 401 | **PASS** |
| **13** | CSRF header & Origin verification | Missing header or untrusted origin denied 403 | Header: 403, Origin: 403 | **PASS** |
| **14** | Super Admin session & identity verification | Session belongs to श्री ल.रा. कोळी | श्री ल.रा. कोळी confirmed | **PASS** |
| **15** | Original 16 resident records intactness | All 16 Marathi resident names intact | Count: 16, Mismatched: 0 | **PASS** |
| **16** | Maintenance financial summary aggregate API | Summary aggregates correct total billed (₹24,000) | Billed: ₹24,000, Count: 16 | **PASS** |

### Regression Verification Matrix (All Historical Suites)

| Phase | Test Suite Script | Checks | Result |
| :--- | :--- | :-: | :-: |
| **Phase 3** | `server/test-auth-suite.js` | 10 / 10 | **100% PASS** |
| **Phase 3.1** | `server/test-security-deep-audit.js` | 14 / 14 | **100% PASS** |
| **Phase 4** | `server/test-phase4-suite.js` | 13 / 13 | **100% PASS** |
| **Phase 5** | `server/test-phase5-suite.js` | 16 / 16 | **100% PASS** |
| **Total** | **All Automated Test Suites** | **53 / 53** | **100% PASS** |

---

## 7. Database Integrity & Strict Constraints Verification

Live query inspection of `shivneri_classic_admin_db`:
1. **Super Admin Count**: Exactly 1 (`fullNameMarathi: 'श्री ल.रा. कोळी'`, `role: 'SUPER_ADMIN'`).
2. **Resident Master Records**: Exactly 16 original members present with authentic Marathi spellings:
   1. श्री संदीप पाटील
   2. श्री ल.रा. कोळी
   3. श्री नंदकुमार तासकर
   4. श्री सिताराम जोपळे
   5. श्री विठ्ठल चत्तर
   6. श्री सतिष पवार
   7. श्री निलेश सानप
   8. श्री पंकज देवरे
   9. श्री जितेंद्र सूर्यवंशी
   10. श्री रविंद्र संगमनेरे
   11. श्री पकंज चंद्रभान पवार
   12. श्री विलास शिरसाठ
   13. श्री आशिष महाजन
   14. श्री अजित कदम
   15. श्री विनय दत्ता मानकर
   16. श्री अे. जी. दिवाण
3. **Resident Accounts**: Exactly 0. No resident passwords, credentials, or login models exist.
4. **Financial Boundaries Preserved**:
   - Zero payment collection endpoints created.
   - Zero receipt generators or receipt counters created.
   - Zero expense records or models created.
   - These are strictly deferred to Phase 6 (Payments & Receipts) and Phase 7 (Expense Management).

---

## 8. Frontend User Interface Layout

The Maintenance Management interface (`client/src/pages/maintenance/MaintenanceManagement.jsx`) is built with Tailwind CSS, Lucide icons, and Devanagari typography:
- **Header & Metrics**: Displays society banner and 4 key metric tiles (Total Billed, Total Collected, Outstanding Balance, Dues Generated).
- **Navigation Tabs**:
  1. **देयक नोंदवही (Dues Registry)**:
     - Month, year, and payment status dropdown filters (`सर्व (All)`, `थकबाकी (Unpaid)`, `अंशतः भरलेले (Partial)`, `पूर्ण भरलेले (Paid)`).
     - Search input with Devanagari placeholder for resident name or flat.
     - Table listing Resident, Flat Number, Month/Year, Total Due (₹), Paid (₹), Balance (₹), Status Badge, and View Action button.
  2. **मासिक देयके निर्मिती (Generate Dues)**:
     - Month and year selection controls.
     - Live preview card showing total active residents, estimated billing total, and existing records count.
     - Safe confirmation modal displaying the exact month/year before triggering generation.
  3. **देखभाल दर सेटिंग्ज (Configuration)**:
     - Rate input field (₹ per month).
     - Due day selector (1st to 28th).
     - Optional late fee toggle and penalty amount field.
     - Instant save button with notification alerts.
- **Client Build Verification**:
  - `npm --prefix client run build` completed successfully in 1.80s with zero warnings or errors.

---

## 9. Conclusion & Next Phase Readiness

Phase 5 has been executed in full compliance with the approved architecture. The monthly maintenance configuration, idempotent generation engine, compound unique database constraints, and Super Admin dues register are verified and tested.

- **Phase 1 to 5 Status**: Complete and Verified.
- **Phase 6 Scope (Awaiting User Directive)**: Payment Collection, Offline Payment Recording, Atomic Receipt Generation (`SCA-YYYYMM-XXXX`), and Marathi Payment Receipts.

*Awaiting your review and approval before proceeding to Phase 6.*

