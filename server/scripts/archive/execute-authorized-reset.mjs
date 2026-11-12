import 'dotenv/config';
import connectDB from './src/config/db.js';

async function executeAuthorizedReset() {
  console.log('================================================================');
  console.log('⚠️  SHIVNERI CLASSIC APARTMENT - AUTHORIZED DATA RESET EXECUTION');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const conn = await connectDB();
  const db = conn.connection.db;

  // Safety Gate: Confirm exact database name
  const dbName = db.databaseName;
  console.log(`[SAFETY CHECK] Target Database: "${dbName}"`);
  
  if (dbName !== 'shivneri_classic_prod_db') {
    console.error(`❌ CRITICAL SECURITY ABORT: Expected "shivneri_classic_prod_db", but connected to "${dbName}".`);
    await conn.connection.close();
    process.exit(1);
  }
  console.log('✓ Database name verified strictly: shivneri_classic_prod_db.\n');

  // List of collections targeted for complete reset
  const collectionsToClear = [
    'residents',
    'maintenancedues',
    'payments',
    'advancepayments',
    'expenses',
    'cashbookopeningbalances',
    'chairmantransferlogs',
    'passwordresets',
    'counters',
    'auditlogs'
  ];

  // List of collections to preserve
  const collectionsToPreserve = [
    'admins',
    'maintenanceconfigs',
    'expensecategories'
  ];

  console.log('--- 1. PRE-DELETION AUDIT CENSUS ---');
  const allCollections = await db.listCollections().toArray();
  const beforeCounts = {};
  for (const c of allCollections) {
    const count = await db.collection(c.name).countDocuments();
    beforeCounts[c.name] = count;
    console.log(`  📁 ${c.name.padEnd(25)} : ${count} documents`);
  }

  // Pre-verification: Verify Admin exists before proceeding
  const adminBefore = await db.collection('admins').findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
  if (!adminBefore || adminBefore.username !== 'laxman_koli') {
    console.error('❌ CRITICAL ERROR: Super Admin account not found before deletion! Aborting.');
    await conn.connection.close();
    process.exit(1);
  }
  console.log(`\n✓ Super Admin account verified before reset: ${adminBefore.fullNameMarathi} (${adminBefore.username})`);

  console.log('\n--- 2. EXECUTING TARGETED RECORD DELETION ---');
  const deletedCounts = {};
  for (const colName of collectionsToClear) {
    const col = db.collection(colName);
    const deleteResult = await col.deleteMany({});
    deletedCounts[colName] = deleteResult.deletedCount;
    console.log(`  🗑️ Cleared ${colName.padEnd(23)}: ${deleteResult.deletedCount} records deleted`);
  }

  console.log('\n--- 3. POST-DELETION VERIFICATION CENSUS ---');
  const afterCounts = {};
  let resetSuccess = true;

  for (const c of allCollections) {
    const count = await db.collection(c.name).countDocuments();
    afterCounts[c.name] = count;
    const isTarget = collectionsToClear.includes(c.name);
    const isPreserved = collectionsToPreserve.includes(c.name);

    if (isTarget && count !== 0) {
      console.error(`  ❌ ERROR: Collection ${c.name} still contains ${count} documents!`);
      resetSuccess = false;
    } else if (isPreserved && count === 0) {
      console.error(`  ❌ ERROR: Preserved collection ${c.name} was wiped!`);
      resetSuccess = false;
    } else {
      console.log(`  ✓ ${c.name.padEnd(25)} : ${count} documents [${isTarget ? 'CLEARED' : 'PRESERVED'}]`);
    }
  }

  // Verify Admin still intact
  const adminAfter = await db.collection('admins').findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
  if (!adminAfter || adminAfter.username !== 'laxman_koli') {
    console.error('❌ CRITICAL ERROR: Super Admin account missing after reset!');
    resetSuccess = false;
  } else {
    console.log(`\n✓ Super Admin account intact: ${adminAfter.fullNameMarathi} (${adminAfter.username})`);
  }

  // Verify Database Indexes
  console.log('\n--- 4. DATABASE INDEX INTEGRITY CHECK ---');
  for (const c of allCollections) {
    const idxs = await db.collection(c.name).indexes();
    console.log(`  ✓ ${c.name.padEnd(25)}: ${idxs.length} indexes intact (${idxs.map(i => i.name).join(', ')})`);
  }

  await conn.connection.close();

  if (!resetSuccess) {
    console.error('\n❌ RESET FAILED POST-VERIFICATION.');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 AUTHORIZED BUSINESS DATA RESET SUCCESSFULLY COMPLETED!');
  console.log('================================================================');

  return {
    databaseName: dbName,
    beforeCounts,
    deletedCounts,
    afterCounts
  };
}

executeAuthorizedReset().catch(err => {
  console.error('Reset execution fatal error:', err);
  process.exit(1);
});

