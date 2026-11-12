/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: setupMongoAdminUser.js
 * 
 * Provisions the cluster administrative user (siteAdmin) on the 'admin' database
 * with root / clusterAdmin privileges before enabling MongoDB authorization.
 * Never outputs credentials to stdout, stderr, or reports.
 * ==============================================================================
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_FILE = path.resolve(__dirname, '../../.mongo_admin_credentials');

export async function setupMongoAdminUser() {
  const rootConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
  try {
    let adminPassword;
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
      adminPassword = existing.siteAdminPassword;
    } else {
      adminPassword = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(
        CREDENTIALS_FILE,
        JSON.stringify({
          siteAdminUser: 'siteAdmin',
          siteAdminPassword: adminPassword,
          createdAt: new Date().toISOString()
        }, null, 2),
        { encoding: 'utf8', mode: 0o600 }
      );
    }

    const userInfo = await rootConn.db.command({ usersInfo: { user: 'siteAdmin', db: 'admin' } });
    if (userInfo.users && userInfo.users.length > 0) {
      await rootConn.db.command({
        updateUser: 'siteAdmin',
        pwd: adminPassword,
        roles: [
          { role: 'userAdminAnyDatabase', db: 'admin' },
          { role: 'readWriteAnyDatabase', db: 'admin' },
          { role: 'clusterAdmin', db: 'admin' }
        ]
      });
      console.log('  ✓ Updated existing "siteAdmin" user on admin database with cluster administration roles.');
    } else {
      await rootConn.db.command({
        createUser: 'siteAdmin',
        pwd: adminPassword,
        roles: [
          { role: 'userAdminAnyDatabase', db: 'admin' },
          { role: 'readWriteAnyDatabase', db: 'admin' },
          { role: 'clusterAdmin', db: 'admin' }
        ]
      });
      console.log('  ✓ Created "siteAdmin" user on admin database with cluster administration roles.');
    }

    return { success: true, user: 'siteAdmin' };
  } finally {
    await rootConn.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('setupMongoAdminUser.js')) {
  setupMongoAdminUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to setup admin user:', err.message);
      process.exit(1);
    });
}

