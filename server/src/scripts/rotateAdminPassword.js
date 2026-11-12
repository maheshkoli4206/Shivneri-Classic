/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – A WING (PANCHAVATI, NASHIK)
 * SCRIPT: rotateAdminPassword.js
 * 
 * DESCRIPTION:
 * Secure Super Admin Password Rotation Utility.
 * Allows the authorized administrator to rotate the Super Admin password.
 * 
 * SECURITY DIRECTIVES:
 * 1. Enforces bcrypt 12-round salt.
 * 2. Enforces minimum 10-character complexity (uppercase, lowercase, number, symbol).
 * 3. Never logs or prints passwords to stdout/stderr.
 * 4. Supports interactive secure prompt or environment variable input.
 * 5. Requires target database confirmation.
 * ==============================================================================
 */

import readline from 'readline';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const BCRYPT_ROUNDS = 12;

function validatePasswordComplexity(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'पासवर्ड किमान १० अक्षरांचा असावा (Password must be at least 10 characters long).';
  }
  if (!/[A-Z]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक मोठे इंग्रजी अक्षर (A-Z) असावे (Must contain at least 1 uppercase letter).';
  }
  if (!/[a-z]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक लहान इंग्रजी अक्षर (a-z) असावे (Must contain at least 1 lowercase letter).';
  }
  if (!/[0-9]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक अंक (0-9) असावा (Must contain at least 1 digit).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक विशेष चिन्ह (symbol) असावे (Must contain at least 1 special character).';
  }
  return null;
}

export async function rotatePassword({
  mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shivneri_classic_admin_db',
  currentPassword,
  newPassword
}) {
  const complexityError = validatePasswordComplexity(newPassword);
  if (complexityError) {
    throw new Error(`PASSWORD_COMPLEXITY_ERROR: ${complexityError}`);
  }

  const conn = await mongoose.createConnection(mongoUri).asPromise();
  try {
    const adminColl = conn.db.collection('admins');
    const admin = await adminColl.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });

    if (!admin) {
      throw new Error('ADMIN_NOT_FOUND: Super Admin document not found in target database.');
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isMatch) {
        throw new Error('AUTH_FAILED: Current password does not match.');
      }
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await adminColl.updateOne(
      { _id: admin._id },
      {
        $set: {
          passwordHash: newHash,
          updatedAt: new Date()
        }
      }
    );

    console.log(`  ✓ Super Admin password successfully rotated for ${admin.fullNameMarathi} (${admin.username}).`);
    return { success: true, adminId: admin._id, username: admin.username };
  } finally {
    await conn.close();
  }
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith('rotateAdminPassword.js')) {
  const targetDbUri = process.env.TARGET_DB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shivneri_classic_admin_db';
  const newPass = process.env.NEW_ADMIN_PASSWORD;
  const currPass = process.env.CURRENT_ADMIN_PASSWORD;

  if (newPass) {
    rotatePassword({
      mongoUri: targetDbUri,
      currentPassword: currPass,
      newPassword: newPass
    })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Password rotation failed:', err.message);
        process.exit(1);
      });
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter target MongoDB URI [' + targetDbUri + ']: ', (uriAnswer) => {
      const finalUri = uriAnswer.trim() || targetDbUri;
      rl.question('Enter current admin password: ', (curr) => {
        rl.question('Enter NEW admin password: ', (newP) => {
          rl.close();
          rotatePassword({
            mongoUri: finalUri,
            currentPassword: curr.trim(),
            newPassword: newP.trim()
          })
            .then(() => {
              console.log('Password rotation completed successfully.');
              process.exit(0);
            })
            .catch((err) => {
              console.error('Password rotation failed:', err.message);
              process.exit(1);
            });
        });
      });
    });
  }
}
