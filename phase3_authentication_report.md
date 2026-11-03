# SHIVNERI CLASSIC APARTMENT – A WING
## Phase 3: Admin Security & Authentication Verification Report

---

### Executive Overview

| Metric | Status / Value |
| :--- | :--- |
| **Project Workspace** | `D:\Shivneri Classic App` (Confirmed Fresh & Isolated) |
| **Official Application** | **Shivneri Classic Apartment – A Wing** |
| **Physical Address** | Aurangabad Road, Panchavati, Nashik, Maharashtra, India |
| **Target Database** | `shivneri_classic_admin_db` (Isolated MongoDB Instance) |
| **Sole Super Admin** | **श्री ल.रा. कोळी** (*Shri Laxman Koli*) |
| **Admin Designation** | Chairman / Building Secretary |
| **Access Model** | Single Super Admin Only (No resident logins, registrations, or staff accounts) |
| **Authentication Standard**| HttpOnly, Secure, SameSite Cookie JWT (Zero tokens in `localStorage`/`sessionStorage`) |
| **CSRF Defense** | Custom Header Verification (`X-Requested-With: XMLHttpRequest`) + `SameSite` cookies |
| **Test Suite Outcome** | **10 / 10 Tests Passed (100% PASS)** |

---

## 1. Files Created and Modified

### Backend (`server/`)
- `server/src/config/db.js`: MongoDB Atlas/local connection manager with error handling and lifecycle listeners.
- `server/src/models/Admin.js`: Admin Mongoose schema with database-level `singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON'` unique constraint, bcrypt password comparison, and sanitized JSON output.
- `server/src/middleware/authMiddleware.js`: Extracts and verifies JWT strictly from `req.cookies.token`; validates `SUPER_ADMIN` role.
- `server/src/middleware/csrfMiddleware.js`: Validates `X-Requested-With: XMLHttpRequest` on all state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- `server/src/controllers/authController.js`: Handlers for Admin login (sets HttpOnly cookie), logout (clears cookie), and profile retrieval (`/me`).
- `server/src/routes/authRoutes.js`: Exposes `/login` (with 5 attempts/15min rate limiter & express-validator), `/logout`, and `/me`.
- `server/src/scripts/seedAdmin.js`: Secure one-time idempotent Admin provisioning script with password strength validation and zero hardcoded passwords.
- `server/src/app.js`: Integrated CSRF middleware, cookie parser, and mounted `/api/v1/auth` routes.
- `server/server.js`: Connects to MongoDB Atlas/local instance before binding port listener.
- `server/.env.example`: Updated with safe variable placeholders (no secrets committed).
- `server/test-auth-suite.js`: Comprehensive 10-point automated test suite.

### Frontend (`client/`)
- `client/src/context/AuthContext.jsx`: Ephemeral in-memory authentication state initialized via `GET /api/v1/auth/me` (zero tokens in browser storage).
- `client/src/context/LanguageContext.jsx`: Marathi (primary default) and English (secondary) localization provider. Strictly no Hindi.
- `client/src/components/layout/ProtectedRoute.jsx`: Protected route barrier with animated loading indicator and redirect to `/login`.
- `client/src/pages/auth/Login.jsx`: Professional responsive Admin login screen with brand crest, password visibility toggle, safe generic error displays, and bilingual switcher.
- `client/src/pages/dashboard/Dashboard.jsx`: Authenticated Admin management landing page with Chairman identity, session details, and logout action.
- `client/src/App.jsx`: Configured React Router DOM (`/login`, `/`, and fallback redirects).
- `client/src/services/api.js`: Pre-configured Axios instance with `withCredentials: true` and `X-Requested-With: XMLHttpRequest`.

### Root
- `package.json`: Added `seed:admin` orchestration script.
- `README.md`: Updated with Phase 3 security specifications.

---

## 2. Database Connection Verification

- **Database Name**: Confirmed connected strictly to **`shivneri_classic_admin_db`**.
- **Isolation Check**: Never connected to or reused any past project database.
- **Connection Configuration**: Managed through `process.env.MONGODB_URI`.
- **Runtime Verification**:
  ```
  ✅ MongoDB Connected successfully to database: "shivneri_classic_admin_db" on host: localhost
  ```

---

## 3. Admin Singleton Enforcement Evidence

The application enforces **strictly one Super Admin at the MongoDB database engine level**:

```javascript
// Database-level unique constraint
singletonKey: {
  type: String,
  default: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
  unique: true,
  immutable: true,
  required: true
}
```

### Test Evidence:
1. **First Insert**: Succeeded. Admin document created for **श्री ल.रा. कोळी** with `role: 'SUPER_ADMIN'`.
2. **Second Insert Attempt**: Attempted creation of a secondary admin (`secondary_admin`).
3. **Result**: Immediately rejected by the database unique index / singleton hook:
   ```
   Reason: फक्त एकाच मुख्य प्रशासक (Super Admin) खात्यास परवानगी आहे. (Only one Super Admin account is allowed in the database.)
   Total Admin Count in DB: 1 (Strictly unchanged)
   ```
4. **Seed Script Idempotency**:
   Running `npm run seed:admin` when an admin already exists safely outputs:
   ```
   ⚠️  सूचना: मुख्य प्रशासक खाते आधीपासून अस्तित्वात आहे. नवीन खाते तयार केले जाणार नाही.
      (Notice: Super Admin account already exists. Multiple admin accounts are forbidden.)
   ```

---

## 4. Authentication API Details

| Endpoint | Method | Access | Security Controls | Description |
| :--- | :---: | :---: | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Rate-limited (5 attempts / 15 min), CSRF header required, input validation | Authenticates credentials, signs JWT, sets HttpOnly cookie |
| `/api/v1/auth/logout` | `POST` | Public | CSRF header required | Clears `token` cookie with expired timestamp |
| `/api/v1/auth/me` | `GET` | Protected | `requireAdminAuth` middleware | Returns sanitized Admin profile without credentials |

### Generic Error Handling:
- Attempting login with an incorrect password or non-existent username responds with:
  `401 Unauthorized: "अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)"`
- Prevents user enumeration attacks.

---

## 5. Cookie & CSRF Security Implementation

1. **HttpOnly Cookie Configuration**:
   ```javascript
   res.cookie('token', token, {
     httpOnly: true,                               // Completely blocks JavaScript document.cookie access
     secure: process.env.NODE_ENV === 'production', // Encrypted HTTPS in production
     sameSite: isProduction ? 'strict' : 'lax',    // Mitigates cross-site request attacks
     maxAge: 8 * 60 * 60 * 1000,                   // 8 hours session lifespan
     path: '/'
   });
   ```
2. **Zero Browser Storage**:
   The frontend never touches `localStorage` or `sessionStorage`. All authenticated state is kept in volatile React memory and hydrated on application load via `/api/v1/auth/me`.
3. **Anti-CSRF Header Shield**:
   `csrfMiddleware.js` inspects all `POST`, `PUT`, `PATCH`, and `DELETE` requests. If `X-Requested-With: XMLHttpRequest` is absent, the request is rejected with `403 Forbidden`. Browsers block cross-site forms or scripts from attaching custom headers without explicit CORS preflight permission.

---

## 6. Automated Test Suite Results

Test Execution Command: `cd server; node test-auth-suite.js`

| # | Test Case Description | Verified Behavior | Status |
|:---:|:---|:---|:---:|
| **1** | **Fresh Database Connection** | Connected to target `shivneri_classic_admin_db` without error | **PASS** |
| **2** | **First Super Admin Creation** | Successfully created Admin (श्री ल.रा. कोळी) with 12-round bcrypt hash | **PASS** |
| **3** | **Second Admin Rejection** | Duplicate insert rejected by singleton constraint; DB count remains 1 | **PASS** |
| **4** | **Correct Login & Cookie Setting** | Returned 200 OK; `Set-Cookie` contains HttpOnly token; 0 tokens in body | **PASS** |
| **5** | **Incorrect Login Rejection** | Returned 401 Unauthorized with generic error message | **PASS** |
| **6** | **Logout Cookie Invalidation** | Returned 200 OK; `token` cookie cleared with epoch expiration | **PASS** |
| **7** | **Protected API Rejection** | `GET /api/v1/auth/me` without cookie rejected with 401 Unauthorized | **PASS** |
| **8** | **Protected API Success** | `GET /api/v1/auth/me` with valid cookie returned Admin profile | **PASS** |
| **9** | **CSRF Protection Defense** | Request without `X-Requested-With` header rejected with 403 Forbidden | **PASS** |
| **10**| **Login Rate Limiter** | 6th consecutive login attempt blocked with 429 Too Many Requests | **PASS** |

**Summary**: **10 / 10 Tests Passed (100% Success Rate)**.

---

## 7. Security Audit & Isolation Compliance

- **No Secrets in Git**: `server/.env` is strictly listed in `.gitignore` and verified uncommitted via `git status --ignored`. Only `server/.env.example` is committed.
- **No Hardcoded Passwords**: The setup script `seedAdmin.js` requires environment variables and validates password complexity.
- **No Resident Logins**: Strictly no resident accounts, schemas, logins, or registration views exist.
- **Bilingual Architecture**: Marathi is the primary default language; English is available via toggle; zero Hindi strings exist.
- **Frontend Build**: `npm run client:build` builds with zero errors or warnings in 1.13 seconds.

---

## 8. Unresolved Issues

- **None**. All Phase 3 requirements, database constraints, security shields, and tests are functioning as intended.

---

## 9. Conclusion & Phase 3 Sign-Off

**Phase 3: Admin Security & Authentication is complete, tested, and verified.**

As instructed:
- Phase 4 has **NOT** been started.
- Resident master data has **NOT** been seeded.
- Resident login or registration has **NOT** been created.
- Execution is paused awaiting user review and approval before proceeding to **Phase 4: Resident Master Data Management**.
