import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGORESTORE_PATH = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';

const credsPath = path.join(__dirname, '.mongo_admin_credentials');
const adminCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

const ADMIN_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/?authSource=admin`;
const TEMP_DB_NAME = 'shivneri_temp_inspect_db';
const TEMP_URI = `mongodb://${adminCreds.siteAdminUser}:${adminCreds.siteAdminPassword}@127.0.0.1:27017/${TEMP_DB_NAME}?authSource=admin`;

async function inspectBackupResidents() {
  console.log('================================================================');
  console.log('🔍 INSPECTING RESIDENTS IN BACKUP ARCHIVE');
  console.log('================================================================\n');

  const backupDir = path.resolve(__dirname, '..', 'backups', 'fresh_reset_20261104_203250');
  const archivePath = path.join(backupDir, 'shivneri_classic_prod_db_backup.gz');

  console.log('Backup Archive Path:', archivePath);
  console.log('Archive Exists:', fs.existsSync(archivePath));
  console.log('Archive Size:', fs.statSync(archivePath).size, 'bytes');

  // Restore only residents into temporary database shivneri_temp_inspect_db
  const restoreArgs = [
    `--uri=${ADMIN_URI}`,
    '--nsInclude=shivneri_classic_prod_db.residents',
    '--nsFrom=shivneri_classic_prod_db.residents',
    `--nsTo=${TEMP_DB_NAME}.residents`,
    `--archive=${archivePath}`,
    '--gzip',
    '--drop'
  ];

  console.log('Restoring residents into isolated temporary DB:', TEMP_DB_NAME);
  await execFileAsync(MONGORESTORE_PATH, restoreArgs);
  console.log('✓ Restored into temporary inspection DB.');

  // Connect to temporary DB and inspect residents
  await mongoose.connect(TEMP_URI);
  const tempDb = mongoose.connection.db;
  const residents = await tempDb.collection('residents').find({}).toArray();

  console.log(`\nFound ${residents.length} resident records in backup:\n`);
  
  for (const r of residents) {
    console.log(`- Flat/Shop: ${(r.flatNumber || 'N/A').padEnd(12)} | Category: ${(r.maintenanceCategory || 'N/A').padEnd(12)} | Wing: ${(r.wing || 'N/A').padEnd(8)} | Status: ${(r.status || 'N/A').padEnd(8)} | Name: ${r.fullNameMarathi} (${r.fullNameEnglish || ''}) | ID: ${r._id}`);
  }

  console.log('\n--- SAMPLE COMPLETE RESIDENT DOCUMENT STRUCTURE ---');
  console.log(JSON.stringify(residents[0], null, 2));

  // Clean up temporary DB
  await tempDb.dropDatabase();
  console.log('\n✓ Dropped temporary inspection DB shivneri_temp_inspect_db.');
  await mongoose.disconnect();
}

inspectBackupResidents().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

