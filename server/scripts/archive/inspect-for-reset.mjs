import 'dotenv/config';
import connectDB from './src/config/db.js';

async function inspect() {
  const conn = await connectDB();
  const db = conn.connection.db;
  console.log('================================================================');
  console.log('🔍 PRE-RESET PRODUCTION DATABASE AUDIT & CENSUS');
  console.log('CONFIRMED TARGET DATABASE:', db.databaseName);
  console.log('================================================================');

  if (db.databaseName !== 'shivneri_classic_prod_db') {
    console.error('FATAL: Database name does not match shivneri_classic_prod_db! Aborting.');
    process.exit(1);
  }

  const cols = await db.listCollections().toArray();
  const report = [];

  for (const c of cols) {
    const col = db.collection(c.name);
    const count = await col.countDocuments();
    const indexes = await col.indexes();
    report.push({
      name: c.name,
      count: count,
      indexes: indexes.map(i => i.name)
    });
  }

  report.sort((a, b) => b.count - a.count);

  console.log('\n--- ALL COLLECTIONS & RECORD COUNTS ---');
  for (const r of report) {
    console.log(`📁 ${r.name.padEnd(25)} : ${r.count.toString().padStart(4)} docs | Indexes: ${r.indexes.join(', ')}`);
  }

  // Sample data from key collections
  console.log('\n--- CRITICAL COLLECTIONS INSPECTION ---');
  
  // 1. Admins
  const adminCol = db.collection('admins');
  const admins = await adminCol.find({}, { projection: { password: 0 } }).toArray();
  console.log(`\n👑 Admins (${admins.length}):`, JSON.stringify(admins, null, 2));

  // 2. Maintenance Config
  const configCol = db.collection('maintenanceconfigs');
  const configs = await configCol.find({}).toArray();
  console.log(`\n⚙️ Maintenance Configs (${configs.length}):`, JSON.stringify(configs, null, 2));

  // 3. Expense Categories
  const expCatCol = db.collection('expensecategories');
  const expCats = await expCatCol.find({}).toArray();
  console.log(`\n🏷️ Expense Categories (${expCats.length}):`, expCats.map(c => c.name || c.categoryKey));

  // 4. Counters
  const counterCol = db.collection('counters');
  const counters = await counterCol.find({}).toArray();
  console.log(`\n🔢 Counters (${counters.length}):`, JSON.stringify(counters, null, 2));

  // 5. Residents
  const residentCol = db.collection('residents');
  const residentCount = await residentCol.countDocuments();
  console.log(`\n👥 Residents (${residentCount} total)`);

  // 6. Maintenance Dues
  const duesCol = db.collection('maintenancedues');
  const duesCount = await duesCol.countDocuments();
  console.log(`\n📜 Maintenance Dues (${duesCount} total)`);

  // 7. Payments
  const paymentCol = db.collection('payments');
  const paymentCount = await paymentCol.countDocuments();
  console.log(`\n💳 Payments (${paymentCount} total)`);

  // 8. Advance Payments
  const advanceCol = db.collection('advancepayments');
  const advanceCount = await advanceCol.countDocuments();
  console.log(`\n💰 Advance Payments (${advanceCount} total)`);

  // 9. Audit Logs
  const auditCol = db.collection('auditlogs');
  const auditCount = await auditCol.countDocuments();
  console.log(`\n🛡️ Audit Logs (${auditCount} total)`);

  await conn.connection.close();
}

inspect().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

