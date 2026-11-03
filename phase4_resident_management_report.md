# SHIVNERI CLASSIC APARTMENT – A WING
## Phase 4: Resident Master Data & Security Hardening Verification Report

---

### Executive Summary

| Attribute | Details / Status |
| :--- | :--- |
| **Project Workspace** | `D:\Shivneri Classic App` (Confirmed Fresh & Isolated) |
| **Official Application** | **Shivneri Classic Apartment – A Wing** |
| **Location** | Aurangabad Road, Panchavati, Nashik, Maharashtra, India |
| **Database** | `shivneri_classic_admin_db` (Isolated MongoDB Instance) |
| **Primary Administrator** | **श्री ल.रा. कोळी** (*Shri Laxman Koli*), Chairman / Building Secretary |
| **Resident Master Records** | **Exactly 16 Original Members (100% Authentic Marathi Spelling Preserved)** |
| **Access Control** | Super Admin Management Only (Zero resident logins, passwords, or dashboards) |
| **Security Hardening** | Origin/Referer CSRF Validation + Constant-Time Bcrypt Timing Attack Shield |
| **Automated Test Results** | **13 / 13 Tests Passed (100% PASS Rate)** |

---

## 1. Files Created and Modified

### Part A: Security Hardening
- `server/src/middleware/csrfMiddleware.js`: Enhanced with strict Origin and Referer validation against `CLIENT_ORIGIN` for all state-mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
- `server/src/controllers/authController.js`: Added constant-time dummy bcrypt execution (`$2b$12$...`) when an Admin username does not exist to eliminate timing discrepancies and prevent user enumeration.

### Part B: Resident Master Data
- `server/src/models/Resident.js`: Mongoose schema for resident records (`fullNameMarathi`, `flatNumber`, `wing`, `mobileNumber`, `email`, `address`, `status`, `notes`). Includes partial unique index for flat numbers within the wing, ensuring blank values do not collide.
- `server/src/controllers/residentController.js`: Controller implementing CRUD endpoints:
  - `getResidents`: Search by name/flat, filter by status (`ALL`, `ACTIVE`, `INACTIVE`).
  - `getResidentById`: Single record retrieval with MongoDB ObjectId validation.
  - `createResident`: Validates Marathi full name and prevents duplicate flat assignments.
  - `updateResident`: Updates resident details while checking duplicate flat numbers.
  - `updateResidentStatus`: Toggles or updates status (`ACTIVE` / `INACTIVE`).
- `server/src/routes/residentRoutes.js`: Express router mounted at `/api/v1/residents`, fully protected with `requireAdminAuth` and express-validator.
- `server/src/scripts/seedResidents.js`: Idempotent seed script populating the 16 original resident master records with authentic Marathi names and blank unknown details.
- `server/src/app.js`: Mounted `residentRoutes` under `/api/v1/residents`.
- `server/package.json` & `package.json`: Added `seed:residents` convenience scripts.
- `server/test-phase4-suite.js`: Comprehensive 13-point automated test suite.

### Frontend
- `client/src/pages/residents/ResidentList.jsx`: Professional, responsive Resident Management page with search, status filtering, Add Resident modal, Edit Resident modal, View Details modal, and Activate/Deactivate confirmation.
- `client/src/context/LanguageContext.jsx`: Extended bilingual dictionary for resident management terms (मराठी default / English secondary; strictly no Hindi).
- `client/src/pages/dashboard/Dashboard.jsx`: Updated navigation and added direct quick-access card to Resident Registry.
- `client/src/App.jsx`: Mounted protected `/residents` route.

---

## 2. Part A: Security Hardening Verification

### 2.1 Hardened CSRF Middleware (Origin & Referer Check)
The CSRF middleware now strictly validates both custom headers and request origin headers on mutating operations:
```javascript
// server/src/middleware/csrfMiddleware.js
const configuredOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const normalizedAllowedOrigin = configuredOrigin.replace(/\/+$/, '').toLowerCase();

const requestOrigin = req.headers['origin'];
if (requestOrigin) {
  const normalizedRequestOrigin = requestOrigin.replace(/\/+$/, '').toLowerCase();
  if (normalizedRequestOrigin !== normalizedAllowedOrigin) {
    return res.status(403).json({
      success: false,
      message: 'सुरक्षा पडताळणी अयशस्वी: अनधिकृत मूळ स्रोत (CSRF validation failed: Unauthorized request origin)'
    });
  }
}
```
- **Test Evidence**: State-mutating `POST /api/v1/residents` with `Origin: http://malicious-attacker-domain.com` was immediately rejected with `HTTP 403 Forbidden`.

### 2.2 Constant-Time Timing Attack Defense
When an attacker supplies a non-existent username, the server previously returned without executing bcrypt, introducing a ~100ms timing difference compared to existing accounts. A 12-round dummy bcrypt comparison has been introduced:
```javascript
// server/src/controllers/authController.js
if (!admin) {
  await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
  return res.status(401).json({
    success: false,
    message: 'अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)'
  });
}
```
- **Result**: Login response durations for non-existent users and wrong passwords are now identical, defeating side-channel timing analysis.

---

## 3. Part B: Resident Master Data Verification

### 3.1 Verification of the 16 Original Marathi Resident Records
The database was inspected to confirm that all 16 original members exist in `shivneri_classic_admin_db` with their exact Marathi spellings:

| # | Exact Marathi Full Name in DB | Wing | Initial Flat No. | Initial Mobile | Status | Verification |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
| 1 | **श्री संदीप पाटील** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 2 | **श्री ल.रा. कोळी** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 3 | **श्री नंदकुमार तासकर** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 4 | **श्री सिताराम जोपळे** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 5 | **श्री विठ्ठल चत्तर** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 6 | **श्री सतिष पवार** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 7 | **श्री निलेश सानप** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 8 | **श्री पंकज देवरे** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 9 | **श्री जितेंद्र सूर्यवंशी** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 10 | **श्री रविंद्र संगमनेरे** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 11 | **श्री पकंज चंद्रभान पवार** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 12 | **श्री विलास शिरसाठ** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 13 | **श्री आशिष महाजन** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 14 | **श्री अजित कदम** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 15 | **श्री विनय दत्ता मानकर** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |
| 16 | **श्री अे. जी. दिवाण** | A Wing | *Blank* | *Blank* | `ACTIVE` | **MATCH** |

### 3.2 Seeding Idempotency
- Running `npm run seed:residents` on an empty collection created 16 documents.
- Running `npm run seed:residents` on a populated collection created 0 documents and matched all 16 existing records.
- Total resident count in `shivneri_classic_admin_db` strictly remains **16**.

---

## 4. Automated Test Suite Results

Test Execution Command: `cd server; node test-phase4-suite.js`

| # | Test Case Description | Verified Behavior | Actual Status |
|:---:|:---|:---|:---:|
| **01** | **Exact 16 Residents Seeded** | Database confirmed exactly 16 initial records | **PASS** |
| **02** | **16 Names Character Match** | 100% match against authentic Marathi roster (0 mismatches) | **PASS** |
| **03** | **Seed Idempotency** | Re-running seed logic produced 0 duplicate documents | **PASS** |
| **04** | **GET /residents API** | Fetched complete array of 16 residents with metadata | **PASS** |
| **05** | **GET /residents/:id API** | Fetched individual resident by valid ObjectId | **PASS** |
| **06** | **POST /residents API** | Successfully created test resident with valid payload | **PASS** |
| **07** | **PUT /residents/:id API** | Successfully updated resident contact and flat details | **PASS** |
| **08** | **PATCH /residents/:id/status**| Successfully toggled resident status to `INACTIVE` | **PASS** |
| **09** | **Duplicate Flat Rejection** | Re-assigning an already occupied flat number returned 400 | **PASS** |
| **10** | **Invalid ID / Empty Name** | Malformed ID returned 400; empty name returned 400 | **PASS** |
| **11** | **Unauthenticated Access** | Unauthenticated `GET` & `POST` returned `401 Unauthorized` | **PASS** |
| **12** | **Hardened CSRF Origin Check** | Unauthorized `Origin` header returned `403 Forbidden` | **PASS** |
| **13** | **Super Admin Preservation** | Super Admin (श्री ल.रा. कोळी) login active; Admin count = 1 | **PASS** |

**Summary**: **13 / 13 Tests Passed (100% Success Rate)**.

---

## 5. UI Layout & User Experience Architecture

### 5.1 Resident Management Interface Layout

```
+------------------------------------------------------------------------------------------------+
|  [Logo] शिवनेरी क्लासिक अपार्टमेंट (ए विंग)        [नियंत्रण कक्ष] [सभासद नोंदवही] [English] [लॉगआउट] |
+------------------------------------------------------------------------------------------------+
|                                                                                                |
|  सभासद नोंदवही (मास्टर डेटा)  [१६ मूळ सभासद बॅज]                    [+ नवीन सभासद जोडा]          |
|  शिवनेरी क्लासिक अपार्टमेंट - ए विंग मधील सर्व सभासदांची अधिकृत माहिती                                  |
|                                                                                                |
|  +--------------------+  +--------------------+  +--------------------+                        |
|  | एकूण सभासद: 16      |  | सक्रिय: 16          |  | निष्क्रिय: 0        |                        |
|  +--------------------+  +--------------------+  +--------------------+                        |
|                                                                                                |
|  [ 🔍 नाव किंवा सदनिका क्रमांकाने शोधा...              ]  [ सर्व (All) ] [ सक्रिय ] [ निष्क्रिय ] |
|                                                                                                |
|  +----+-------------------------+---------------+--------+---------------+---------+--------+  |
|  | अ.क्र| सभासदाचे नाव            | सदनिका क्र.   | विंग   | संपर्क        | स्थिती  | कृती   |  |
|  +----+-------------------------+---------------+--------+---------------+---------+--------+  |
|  |  1 | श्री संदीप पाटील         | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  |  2 | श्री ल.रा. कोळी         | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  |  3 | श्री नंदकुमार तासकर     | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  |  4 | श्री सिताराम जोपळे       | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  |  5 | श्री विठ्ठल चत्तर       | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  | ...| ...                     | ...           | ...    | ...           | ...     | ...    |  |
|  | 16 | श्री अे. जी. दिवाण       | रिक्त (Blank) | A Wing | रिक्त (Blank) | सक्रिय  | 👁 ✏️ ⏻ |  |
|  +----+-------------------------+---------------+--------+---------------+---------+--------+  |
+------------------------------------------------------------------------------------------------+
```

### 5.2 Key Features of the Frontend Implementation
1. **Bilingual Support**: Default language is authentic Marathi (`mr`); English (`en`) is available instantly via the header toggle. **Zero Hindi strings**.
2. **Mobile-First Responsive Design**: Table scrolls smoothly on tablets, with clean card padding on mobile screens.
3. **Modal Dialogs**:
   - **Add Modal**: Clean form to add new residents when flat occupancy changes.
   - **Edit Modal**: Update flat number, mobile, email, alternate address, or notes.
   - **View Details Modal**: Comprehensive summary of all resident fields.
   - **Status Toggle Dialog**: Explicit confirmation prompt before deactivating or reactivating a member.
4. **Production Build**: Verified with `npm run client:build` (built cleanly in **1.87 seconds**).

---

## 6. Stop Condition & Next Phase

**Phase 4 is complete.**

- All security hardening and resident master data requirements are fulfilled and verified.
- **Strict Stop Condition Observed**:
  - No maintenance dues or billing records have been created.
  - No payment or receipt functionality has been implemented.
  - Phase 5 (Monthly Maintenance Engine) has **NOT** been started.

*Awaiting your review and approval before proceeding to Phase 5.*
