import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Resident from '../models/Resident.js';

/**
 * The 16 Original Resident Master Records for Shivneri Classic Apartment - A Wing.
 * Marathi names are preserved with authentic, exact spelling as specified.
 */
export const ORIGINAL_16_RESIDENTS = [
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

/**
 * Idempotent Resident Seeding Script
 */
async function seedResidents() {
  console.log('======================================================================');
  console.log('🏛️  शिवनेरी क्लासिक अपार्टमेंट (ए विंग) - १६ मूळ सभासद मास्टर डेटा सेटअप');
  console.log('======================================================================');

  try {
    await connectDB();

    console.log(`📋 एकूण १६ मूळ सभासदांची नोंदणी प्रक्रिया तपासत आहे...`);

    let createdCount = 0;
    let existingCount = 0;

    for (const name of ORIGINAL_16_RESIDENTS) {
      // Check if resident already exists by exact Marathi name
      const existing = await Resident.findOne({ fullNameMarathi: name });

      if (existing) {
        existingCount++;
        console.log(`  ℹ️  आधीपासून अस्तित्वात आहे: ${name}`);
      } else {
        // Create new resident master record with blank details
        await Resident.create({
          fullNameMarathi: name,
          flatNumber: '',
          wing: 'A Wing',
          mobileNumber: '',
          email: '',
          address: '',
          status: 'ACTIVE',
          notes: ''
        });
        createdCount++;
        console.log(`  ✅ नवीन नोंदणी झाली: ${name}`);
      }
    }

    const totalResidents = await Resident.countDocuments();

    console.log('\n======================================================================');
    console.log(`📊 सभासद डेटा सेटअप निकाल:`);
    console.log(`   - नव्याने तयार केलेले सभासद: ${createdCount}`);
    console.log(`   - आधीपासून असलेले सभासद: ${existingCount}`);
    console.log(`   - डेटाबेसमधील एकूण सभासद संख्या: ${totalResidents}`);
    console.log('======================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ सभासद मास्टर डेटा सेटअप करताना त्रुटी आली:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Execute when run directly via CLI
if (process.argv[1]?.endsWith('seedResidents.js')) {
  seedResidents();
}

export default seedResidents;

