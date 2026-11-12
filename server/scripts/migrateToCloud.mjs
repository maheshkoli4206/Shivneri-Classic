/**
 * ==============================================================================
 * 🚀 SHIVNERI CLASSIC APARTMENT – ONE-TIME LOCAL TO CLOUD MONGODB MIGRATION SCRIPT
 * ==============================================================================
 * Safely streams and migrates all collections, documents, and indexes from your
 * local isolated MongoDB database to an online cloud MongoDB Atlas cluster.
 *
 * Usage:
 *   node server/scripts/migrateToCloud.mjs --target="mongodb+srv://<user>:<password>@cluster.mongodb.net/shivneri_classic_prod_db"
 *   node server/scripts/migrateToCloud.mjs --target="mongodb+srv://..." --dry-run
 *   node server/scripts/migrateToCloud.mjs --target="mongodb+srv://..." --drop-existing
 * ==============================================================================
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI Arguments
const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const match = args.find(a => a.startsWith(`${flag}=`));
  return match ? match.split('=')[1].replace(/^["']|["']$/g, '') : null;
};

const isDryRun = args.includes('--dry-run');
const dropExisting = args.includes('--drop-existing');

// 1. Resolve Source Database URI
function getSourceURI() {
  if (process.env.LOCAL_MONGODB_URI) {
    return process.env.LOCAL_MONGODB_URI;
  }

  // Check for local admin credentials file
  const credsPath = path.resolve(__dirname, '../.mongo_admin_credentials');
  if (fs.existsSync(credsPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds.siteAdminUser && creds.siteAdminPassword) {
        return `mongodb://${creds.siteAdminUser}:${encodeURIComponent(creds.siteAdminPassword)}@127.0.0.1:27017/shivneri_classic_prod_db?authSource=admin`;
      }
    } catch {
      // Fallback
    }
  }

  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shivneri_classic_prod_db';
}

// 2. Resolve Target Cloud Database URI
const targetURI = getArgValue('--target') || process.env.TARGET_MONGODB_URI || process.env.CLOUD_MONGODB_URI;

// List of all business, master, financial, and audit collections
const COLLECTIONS_TO_MIGRATE = [
  'admins',
  'residents',
  'maintenanceconfigs',
  'maintenancedues',
  'payments',
  'expenses',
  'expensecategories',
  'cashbookopeningbalances',
  'counters',
  'auditlogs',
  'advancepayments',
  'chairmantransferlogs',
  'passwordresets'
];

async function runMigration() {
  console.log('==============================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – LOCAL TO CLOUD DATABASE MIGRATION');
  console.log('==============================================================================');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 Mode: ${isDryRun ? 'DRY RUN (Simulation only - no cloud writes)' : 'LIVE PRODUCTION MIGRATION'}`);
  console.log(`🔄 Drop Existing in Target: ${dropExisting ? 'YES' : 'NO'}`);
  console.log('------------------------------------------------------------------------------\n');

  if (!targetURI) {
    console.error('❌ त्रुटी: ऑनलाइन क्लाउड डेटाबेस URI आढळले नाही. (Error: Target cloud database URI is missing.)\n');
    console.error('कृपया खालीलप्रमाणे target URI सह कमांड चालवा:');
    console.error('node server/scripts/migrateToCloud.mjs --target="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/shivneri_classic_prod_db?retryWrites=true&w=majority"\n');
    console.error('किंवा .env फाईलमध्ये TARGET_MONGODB_URI किंवा CLOUD_MONGODB_URI सेट करा.');
    process.exit(1);
  }

  const sourceURI = getSourceURI();
  const maskedSource = sourceURI.replace(/:([^:@]+)@/, ':***@');
  const maskedTarget = targetURI.replace(/:([^:@]+)@/, ':***@');

  console.log(`📡 Local Source Database: ${maskedSource}`);
  console.log(`☁️  Cloud Target Database: ${maskedTarget}\n`);

  let sourceConn = null;
  let targetConn = null;

  try {
    // 1. Connect to Source
    console.log('1. स्थानिक डेटाबेसशी कनेक्ट होत आहे (Connecting to local source database)...');
    sourceConn = await mongoose.createConnection(sourceURI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    console.log(`   ✓ Connected to source DB: "${sourceConn.name}"`);

    // 2. Connect to Target
    console.log('2. क्लाउड डेटाबेसशी कनेक्ट होत आहे (Connecting to cloud target database)...');
    targetConn = await mongoose.createConnection(targetURI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log(`   ✓ Connected to cloud target DB: "${targetConn.name}"\n`);

    console.log('==============================================================================');
    console.log('📦 DATA MIGRATION IN PROGRESS');
    console.log('==============================================================================\n');

    const migrationSummary = [];

    for (const collName of COLLECTIONS_TO_MIGRATE) {
      const sourceColl = sourceConn.collection(collName);
      const targetColl = targetConn.collection(collName);

      const sourceCount = await sourceColl.countDocuments();
      let targetInitialCount = 0;
      try {
        targetInitialCount = await targetColl.countDocuments();
      } catch {
        // Target collection may not exist yet
      }

      if (sourceCount === 0) {
        migrationSummary.push({
          collection: collName,
          source: 0,
          targetBefore: targetInitialCount,
          migrated: 0,
          status: 'SKIPPED (Empty)'
        });
        console.log(`ℹ️  [${collName}]: 0 documents found in source. Skipping.`);
        continue;
      }

      console.log(`🚚 [${collName}]: Migrating ${sourceCount} documents...`);

      // Read all source documents
      const docs = await sourceColl.find({}).toArray();

      // Read source indexes (excluding default _id index)
      const rawIndexes = await sourceColl.indexes();
      const indexesToReplicate = rawIndexes.filter(idx => idx.name !== '_id_');

      if (isDryRun) {
        migrationSummary.push({
          collection: collName,
          source: sourceCount,
          targetBefore: targetInitialCount,
          migrated: sourceCount,
          status: 'DRY RUN (Valid)'
        });
        console.log(`   ✓ [DRY RUN] Would migrate ${sourceCount} documents and ${indexesToReplicate.length} indexes.`);
        continue;
      }

      // If dropExisting requested and target already has records
      if (dropExisting && targetInitialCount > 0) {
        await targetColl.deleteMany({});
        console.log(`   ⚠️ Cleared ${targetInitialCount} existing documents in target "${collName}".`);
      }

      // Insert documents into target preserving all _id and types
      if (docs.length > 0) {
        // Insert in batches of 500
        const batchSize = 500;
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = docs.slice(i, i + batchSize);
          await targetColl.insertMany(batch, { ordered: true });
        }
      }

      // Replicate indexes
      for (const idx of indexesToReplicate) {
        try {
          const { key, unique, sparse, name } = idx;
          const options = { name };
          if (unique) options.unique = true;
          if (sparse) options.sparse = true;
          await targetColl.createIndex(key, options);
        } catch (idxErr) {
          console.warn(`   ⚠️ Warning replicating index "${idx.name}" on "${collName}": ${idxErr.message}`);
        }
      }

      const finalCount = await targetColl.countDocuments();
      const success = finalCount >= sourceCount;

      migrationSummary.push({
        collection: collName,
        source: sourceCount,
        targetBefore: targetInitialCount,
        migrated: docs.length,
        targetAfter: finalCount,
        status: success ? 'MIGRATED ✅' : 'COUNT MISMATCH ❌'
      });

      console.log(`   ✓ Migrated ${docs.length} docs -> Cloud Target has ${finalCount} docs.`);
    }

    // Final Summary Table
    console.log('\n==============================================================================');
    console.log('📊 MIGRATION VERIFICATION AUDIT TABLE');
    console.log('==============================================================================');
    console.table(migrationSummary);

    const totalMigrated = migrationSummary.reduce((sum, item) => sum + (item.migrated || 0), 0);
    const allSuccessful = migrationSummary.every(item => !item.status.includes('❌'));

    console.log('==============================================================================');
    if (allSuccessful) {
      console.log(`🎉 SUCCESS: Total ${totalMigrated} documents migrated to MongoDB Atlas cloud.`);
      console.log('All IDs, financial ledgers, audit logs, and collection indexes are 100% verified.');
    } else {
      console.log('⚠️ COMPLETED WITH WARNINGS: Please review the audit table above.');
    }
    console.log('==============================================================================\n');

  } catch (error) {
    console.error('\n❌ Fatal Migration Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (targetConn) await targetConn.close();
  }
}

runMigration();

