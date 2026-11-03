import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Resident from '../models/Resident.js';
import Admin from '../models/Admin.js';
import MaintenanceConfig from '../models/MaintenanceConfig.js';
import MaintenanceDue from '../models/MaintenanceDue.js';

async function audit() {
  await connectDB();
  console.log('Connected to database:', mongoose.connection.name);

  // 1. Admin
  const admins = await Admin.find();
  console.log('\n--- ADMIN COUNT ---');
  console.log('Total Admins:', admins.length);
  admins.forEach(a => {
    console.log(`ID: ${a._id} | NameMarathi: ${a.fullNameMarathi} | English: ${a.fullNameEnglish} | Role: ${a.role}`);
  });

  // 2. Residents
  const residents = await Resident.find().sort({ createdAt: 1 });
  console.log('\n--- RESIDENTS COUNT ---');
  console.log('Total Residents:', residents.length);
  residents.forEach((r, idx) => {
    console.log(`${idx + 1}. ID: ${r._id} | Name: "${r.fullNameMarathi}" | Flat: "${r.flatNumber}" | Status: ${r.status}`);
  });

  // 3. Maintenance Config
  const configs = await MaintenanceConfig.find();
  console.log('\n--- MAINTENANCE CONFIG ---');
  console.log('Config count:', configs.length);
  configs.forEach(c => {
    console.log(`Monthly: ₹${c.defaultMonthlyAmount} | DueDay: ${c.dueDay} | LateFee: ${c.lateFeeAmount} (Enabled: ${c.lateFeeEnabled}) | isConfigured: ${c.isConfigured}`);
  });

  // 4. Maintenance Dues
  const dues = await MaintenanceDue.find().sort({ createdAt: 1 });
  console.log('\n--- MAINTENANCE DUES ---');
  console.log('Total Dues count:', dues.length);
  dues.forEach((d, idx) => {
    console.log(`${idx + 1}. Due ID: ${d._id} | ResidentID: ${d.residentId} | Snapshot: "${d.residentNameSnapshot}" | Month: ${d.month}/${d.year} | Amount: ₹${d.totalAmountDue} | Paid: ₹${d.amountPaid} | Status: ${d.status}`);
  });

  await mongoose.disconnect();
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

