import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';

/**
 * Validates password complexity
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'पासवर्ड किमान ८ अक्षरांचा असावा (Password must be at least 8 characters long)';
  }
  if (!/[A-Z]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक मोठे अक्षर (A-Z) आवश्यक आहे (Password must contain at least one uppercase letter)';
  }
  if (!/[a-z]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक लहान अक्षर (a-z) आवश्यक आहे (Password must contain at least one lowercase letter)';
  }
  if (!/[0-9]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक अंक (0-9) आवश्यक आहे (Password must contain at least one digit)';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'पासवर्डमध्ये किमान एक विशेष चिन्ह आवश्यक आहे (Password must contain at least one special character)';
  }
  return null;
}

/**
 * One-time Secure Admin Setup Script
 */
async function seedAdmin() {
  console.log('====================================================');
  console.log('🏛️  शिवनेरी क्लासिक अपार्टमेंट - मुख्य प्रशासक सेटअप');
  console.log('====================================================');

  const username = process.env.ADMIN_INITIAL_USERNAME?.trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!username || !password) {
    console.error('❌ त्रुटी: ADMIN_INITIAL_USERNAME आणि ADMIN_INITIAL_PASSWORD पर्यावरण व्हेरिएबल्स आवश्यक आहेत.');
    console.error('   कृपया .env फाईलमध्ये ही व्हेरिएबल्स सुरक्षितपणे भरा.');
    process.exit(1);
  }

  // Validate password strength
  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    console.error(`❌ पासवर्ड पडताळणी अयशस्वी: ${passwordError}`);
    process.exit(1);
  }

  try {
    await connectDB();

    // Check if an Admin already exists
    const existingCount = await Admin.countDocuments();
    if (existingCount >= 1) {
      console.log('⚠️  सूचना: मुख्य प्रशासक खाते आधीपासून अस्तित्वात आहे. नवीन खाते तयार केले जाणार नाही.');
      console.log('   (Notice: Super Admin account already exists. Multiple admin accounts are forbidden.)');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password with 12 salt rounds
    console.log('🔒 पासवर्ड सुरक्षितपणे हॅश (bcrypt 12 rounds) केला जात आहे...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the sole Super Admin document
    const admin = await Admin.create({
      singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
      fullNameMarathi: 'श्री ल.रा. कोळी',
      fullNameEnglish: 'Shri Laxman Koli',
      designation: 'Chairman / Building Secretary',
      username: username.toLowerCase(),
      passwordHash: passwordHash,
      role: 'SUPER_ADMIN'
    });

    console.log('✅ मुख्य प्रशासक (Super Admin) खाते यशस्वीरीत्या तयार केले:');
    console.log(`   नाव (Name): ${admin.fullNameMarathi} (${admin.fullNameEnglish})`);
    console.log(`   पद (Designation): ${admin.designation}`);
    console.log(`   भूमिका (Role): ${admin.role}`);
    console.log(`   वापरकर्तानाव (Username): ${admin.username}`);
    console.log('   पासवर्ड (Password): [सुरक्षितरीत्या हॅश करून जतन केला / MASKED]');
    console.log('   डेटाबेस सिंगलटन की: SHIVNERI_SUPER_ADMIN_SINGLETON (Enforced)');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    if (error.code === 11000 || error.code === 'SINGLETON_VIOLATION') {
      console.warn('⚠️  डेटाबेस सिंगलटन नियमाने दुय्यम प्रशासक तयार करण्यास मज्जाव केला (Duplicate Super Admin rejected by database unique index).');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.error('❌ प्रशासक सेटअप करताना त्रुटी आली:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmin();
