import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import MaintenanceConfig from './src/models/MaintenanceConfig.js';
import MaintenanceDue from './src/models/MaintenanceDue.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_PORT = 5007;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runVerification() {
  console.log('======================================================================');
  console.log('🔍 VERIFICATION SUITE: MAINTENANCE RATE UPDATE (₹1,000 / ₹16,000 TOTAL)');
  console.log('======================================================================\n');

  let server;
  try {
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) throw new Error('Super Admin missing');

    const adminToken = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    const authHeaders = {
      'Cookie': `token=${adminToken}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': CLIENT_ORIGIN,
      'Content-Type': 'application/json'
    };

    // 1. Verify GET /config returns ₹1,000
    console.log('[CHECK 1] Querying GET /api/v1/maintenance/config ...');
    const configRes = await fetch(`${BASE_URL}/api/v1/maintenance/config`, {
      headers: authHeaders
    });
    const configData = await configRes.json();
    console.log('Response status:', configRes.status);
    console.log('Configured amount:', configData.config?.defaultMonthlyAmount);
    console.log('Due day:', configData.config?.dueDay);
    console.log('isConfigured:', configData.config?.isConfigured);
    const check1Pass =
      configRes.status === 200 &&
      configData.config?.defaultMonthlyAmount === 1000 &&
      configData.config?.isConfigured === true;
    console.log(`  -> CHECK 1: ${check1Pass ? 'PASS' : 'FAIL'}\n`);

    // 2. Verify Preview API for Month 12/2026 projects ₹16,000
    console.log('[CHECK 2] Querying GET /api/v1/maintenance/preview?month=12&year=2026 ...');
    const previewRes = await fetch(`${BASE_URL}/api/v1/maintenance/preview?month=12&year=2026`, {
      headers: authHeaders
    });
    const previewData = await previewRes.json();
    console.log('Preview total active residents:', previewData.preview?.totalActiveResidents);
    console.log('Preview configured amount per resident: ₹', previewData.preview?.configuredAmount);
    console.log('Preview new eligible count:', previewData.preview?.newEligibleCount);
    console.log('Preview estimated collection: ₹', previewData.preview?.estimatedCollection);
    const check2Pass =
      previewRes.status === 200 &&
      previewData.preview?.totalActiveResidents === 16 &&
      previewData.preview?.configuredAmount === 1000 &&
      previewData.preview?.newEligibleCount === 16 &&
      previewData.preview?.estimatedCollection === 16000;
    console.log(`  -> CHECK 2: ${check2Pass ? 'PASS' : 'FAIL'}\n`);

    // 3. Verify Historical Test Dues Intactness (Month 11/2026)
    console.log('[CHECK 3] Verifying Historical Dues Preservation ...');
    const historicalDues = await MaintenanceDue.find({ month: 11, year: 2026 });
    console.log('Historical Month 11 dues count:', historicalDues.length);
    const check3Pass = historicalDues.length === 16;
    console.log(`  -> CHECK 3: ${check3Pass ? 'PASS' : 'FAIL'}\n`);

    // 4. Verify 16 Residents Intactness
    console.log('[CHECK 4] Verifying 16 Approved Residents Intactness ...');
    const residentCount = await Resident.countDocuments({ status: 'ACTIVE' });
    const residents = await Resident.find().select('fullNameMarathi');
    const dbNames = new Set(residents.map(r => r.fullNameMarathi));
    const allOriginalsMatch = ORIGINAL_16_RESIDENTS.every(name => dbNames.has(name));
    console.log('Active residents count:', residentCount);
    console.log('All 16 original Marathi names match:', allOriginalsMatch);
    const check4Pass = residentCount === 16 && allOriginalsMatch;
    console.log(`  -> CHECK 4: ${check4Pass ? 'PASS' : 'FAIL'}\n`);

    // 5. Verify Super Admin Intactness
    console.log('[CHECK 5] Verifying Super Admin Identity ...');
    const adminCount = await Admin.countDocuments();
    console.log('Admin count:', adminCount);
    console.log('Admin name:', admin.fullNameMarathi);
    const check5Pass = adminCount === 1 && admin.fullNameMarathi === 'श्री ल.रा. कोळी';
    console.log(`  -> CHECK 5: ${check5Pass ? 'PASS' : 'FAIL'}\n`);

    console.log('======================================================================');
    console.log('📊 VERIFICATION SUMMARY:');
    console.log(`[1] Configuration shows ₹1,000 per month         : ${check1Pass ? 'PASS' : 'FAIL'}`);
    console.log(`[2] Projected Monthly Billing Total is ₹16,000   : ${check2Pass ? 'PASS' : 'FAIL'}`);
    console.log(`[3] Historical Dues Preserved (0 Duplicates)    : ${check3Pass ? 'PASS' : 'FAIL'}`);
    console.log(`[4] 16 Approved Marathi Residents 100% Intact   : ${check4Pass ? 'PASS' : 'FAIL'}`);
    console.log(`[5] Super Admin Strictly Single & Functional     : ${check5Pass ? 'PASS' : 'FAIL'}`);
    console.log('======================================================================');

    return check1Pass && check2Pass && check3Pass && check4Pass && check5Pass;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runVerification();
