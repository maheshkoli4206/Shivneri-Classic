# शिवनेरी क्लासिक अपार्टमेंट (ए विंग)
## Shivneri Classic Apartment – A Wing Management System

---

### प्रकल्प माहिती (Project Overview)

| वैशिष्ट्ये (Attribute) | तपशील (Details) |
| :--- | :--- |
| **अधिकृत नाव (Application Name)** | **Shivneri Classic Apartment** |
| **इमारत / विंग (Building / Wing)** | **A Wing** |
| **पत्ता (Address)** | औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र, भारत |
| **प्रशासक मॉडेल (System Access)** | **एकमेव मुख्य प्रशासक (Sole Super Admin Only)** |
| **मुख्य प्रशासक (Super Admin)** | **श्री ल.रा. कोळी** (*Shri Laxman Koli*) |
| **पद (Designation)** | चेअरमन / सेक्रेटरी (Chairman / Building Secretary) |
| **प्रणाली (Technology Stack)** | MERN Stack (MongoDB, Express.js, React.js + Vite, Node.js) |
| **प्राथमिक भाषा (Default Language)**| **मराठी (Marathi)** (Secondary: English; No Hindi) |
| **डेटाबेस (Target Database)** | `shivneri_classic_admin_db` (Isolated MongoDB Atlas Database) |

---

### फोल्डर रचना (Directory Structure)

```
Shivneri Classic App/
├── client/                 # React.js + Vite + Tailwind CSS Frontend
│   ├── public/             # Static web assets and fonts
│   ├── src/
│   │   ├── components/     # Reusable UI widgets & official receipt templates
│   │   ├── context/        # In-memory authentication & Marathi i18n contexts
│   │   ├── pages/          # Dashboard, Residents, Billing, Receipts, Expenses
│   │   ├── services/       # Axios API client (credentials: true, CSRF headers)
│   │   └── utils/          # Currency formatters & receipt generators
│   └── package.json
│
├── server/                 # Node.js + Express.js REST API
│   ├── src/
│   │   ├── config/         # System configurations
│   │   ├── controllers/    # API Controllers (Health, Payments, Expenses)
│   │   ├── middleware/     # Error handlers, CSRF shields, rate limiters
│   │   ├── models/         # Mongoose Schemas (Single Admin, 16 Residents, Receipts)
│   │   ├── routes/         # Express REST API routes
│   │   └── services/       # Atomic sequence generator for SCA-YYYYMM-XXXX
│   ├── server.js           # Server bootstrap entry point
│   └── package.json
│
├── phase1_architecture_plan.md   # Architectural blueprint & engineering specification
├── phase2_setup_report.md        # Environment setup verification report
└── package.json                  # Root development coordinator scripts
```

---

### आज्ञावली (Available Commands)

From the project root:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs both Backend API and Frontend Client concurrently |
| `npm run client` | Starts the Vite React frontend development server (`http://localhost:5173`) |
| `npm run server` | Starts the Express backend server with nodemon (`http://localhost:5000`) |
| `npm run client:build` | Compiles the production build for the frontend (`client/dist`) |
| `npm run test` | Runs the setup verification script |

---

### सुरक्षितता व गोपनीयता (Security & Isolation)
- **Zero Resident Credentials**: Residents are master data records only; no registration or login portals.
- **HttpOnly Cookies**: All JWT sessions are stored in HttpOnly, Secure, SameSite cookies (no tokens in `localStorage`).
- **Standardized Receipts**: All official receipts are numbered `SCA-YYYYMM-XXXX` using atomic sequential counters.
- **Audited Expense Cancellation**: Financial expense vouchers are never hard deleted; cancellations require written reasons and admin identification.
- **Isolated Target Database**: Dedicated exclusively to `shivneri_classic_admin_db`.

