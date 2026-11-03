import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Resident from '../models/Resident.js';
import Admin from '../models/Admin.js';
import MaintenanceConfig from '../models/MaintenanceConfig.js';
import MaintenanceDue from '../models/MaintenanceDue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPROVED_LIST = [
  'श्री संदीप पाटील',
  'श्री ल.रा. कोळी',
  'श्री नंदकुमार तासकर',
  'श्री सिताराम जोपळे',
  'श्री विठ्ठल चत्तर',
  'श्री सतिष पवार',
  'श्री निलेश सानप',
  'श्री पंकज देवरे',
  'श्री जितेंद्र सूर्यवंशी',
  'श्री रविंद्र संगमनेरे',
  'श्री पकंज चंद्रभान पवार',
  'श्री विलास शिरसाठ',
  'श्री आशिष महाजन',
  'श्री अजित कदम',
  'श्री विनय दत्ता मानकर',
  'श्री अे. जी. दिवाण'
];

async function runDetailedAuditAndBackup() {
  await connectDB();
  console.log('Connected to DB:', mongoose.connection.name);

  // 1. Create backup directory
  const backupDir = path.resolve(__dirname, '../../backups/backup_phase5_1');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 2. Fetch all collections
  const admins = await Admin.find().lean();
  const residents = await Resident.find().sort({ createdAt: 1 }).lean();
  const dues = await MaintenanceDue.find().sort({ createdAt: 1 }).lean();
  const configs = await MaintenanceConfig.find().lean();

  // Save backups
  fs.writeFileSync(path.join(backupDir, 'admins.json'), JSON.stringify(admins, null, 2), 'utf8');
  fs.writeFileSync(path.join(backupDir, 'residents.json'), JSON.stringify(residents, null, 2), 'utf8');
  fs.writeFileSync(path.join(backupDir, 'maintenancedues.json'), JSON.stringify(dues, null, 2), 'utf8');
  fs.writeFileSync(path.join(backupDir, 'maintenanceconfigs.json'), JSON.stringify(configs, null, 2), 'utf8');
  console.log(`Backup saved to ${backupDir}`);

  // 3. Compare residents with APPROVED_LIST
  console.log('\n======================================================');
  console.log('🔍 CHARACTER-BY-CHARACTER AUDIT: RESIDENTS');
  console.log('======================================================');
  console.log(`Total Residents in DB: ${residents.length}`);
  console.log(`Total Approved Residents: ${APPROVED_LIST.length}`);

  let allMatch = true;
  residents.forEach((r, idx) => {
    const approved = APPROVED_LIST[idx];
    const isExact = r.fullNameMarathi === approved;
    if (!isExact) {
      allMatch = false;
      console.error(`❌ MISMATCH at [${idx + 1}]:`);
      console.error(`   Approved: "${approved}" (length: ${approved?.length})`);
      console.error(`   DB:       "${r.fullNameMarathi}" (length: ${r.fullNameMarathi?.length})`);
      // codepoint comparison
      console.error(`   Approved codepoints:`, [...approved].map(c => c.codePointAt(0).toString(16)));
      console.error(`   DB codepoints:      `, [...r.fullNameMarathi].map(c => c.codePointAt(0).toString(16)));
    } else {
      console.log(`✅ [${String(idx + 1).padStart(2, '0')}] EXACT MATCH: "${r.fullNameMarathi}" | ID: ${r._id} | Flat: "${r.flatNumber}" | Status: ${r.status}`);
    }
  });

  if (allMatch && residents.length === APPROVED_LIST.length) {
    console.log('\n🎉 ALL 16 RESIDENT RECORDS IN MONGODB MATCH APPROVED LIST 100% EXACTLY!');
  } else {
    console.log('\n⚠️ SOME RECORDS DO NOT MATCH!');
  }

  // 4. Audit Maintenance Dues
  console.log('\n======================================================');
  console.log('🔍 AUDIT: MAINTENANCE DUES RELATIONSHIPS');
  console.log('======================================================');
  console.log(`Total Maintenance Dues in DB: ${dues.length}`);
  const residentIdSet = new Set(residents.map(r => r._id.toString()));
  let duesValid = true;

  dues.forEach((d, idx) => {
    const resId = d.residentId.toString();
    const existsInResidents = residentIdSet.has(resId);
    const residentDoc = residents.find(r => r._id.toString() === resId);
    const snapshotMatches = residentDoc && residentDoc.fullNameMarathi === d.residentNameSnapshot;

    if (!existsInResidents || !snapshotMatches) {
      duesValid = false;
      console.error(`❌ Due [${idx + 1}] ID: ${d._id} invalid! Exists: ${existsInResidents}, SnapshotMatch: ${snapshotMatches}`);
    } else {
      console.log(`✅ Due [${String(idx + 1).padStart(2, '0')}] Valid ref to "${d.residentNameSnapshot}" | Month: ${d.month}/${d.year} | Amount: ₹${d.totalAmountDue} | Paid: ₹${d.amountPaid} | Status: ${d.status}`);
    }
  });

  if (duesValid) {
    console.log('\n🎉 ALL 16 MAINTENANCE DUES VALIDLY REFERENCE CORRECT ORIGINAL RESIDENTS!');
  }

  // 5. Check Super Admin
  console.log('\n======================================================');
  console.log('🔍 AUDIT: SUPER ADMIN');
  console.log('======================================================');
  console.log(`Total Admins in DB: ${admins.length}`);
  if (admins.length === 1 && admins[0].fullNameMarathi === 'श्री ल.रा. कोळी' && admins[0].role === 'SUPER_ADMIN') {
    console.log(`✅ Super Admin is strictly 1: "${admins[0].fullNameMarathi}" (${admins[0].fullNameEnglish})`);
  } else {
    console.error(`❌ Super Admin integrity issue!`);
  }

  await mongoose.disconnect();
}

runDetailedAuditAndBackup().catch(err => {
  console.error('Error in audit:', err);
  process.exit(1);
});
