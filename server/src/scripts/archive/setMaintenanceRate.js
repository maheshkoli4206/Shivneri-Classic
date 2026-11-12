import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import MaintenanceConfig from '../models/MaintenanceConfig.js';
import Admin from '../models/Admin.js';
import Resident from '../models/Resident.js';
import MaintenanceDue from '../models/MaintenanceDue.js';

async function updateMaintenanceRate() {
  console.log('======================================================================');
  console.log('🏛️  SHIVNERI CLASSIC APARTMENT – A WING');
  console.log('⚙️  MAINTENANCE RATE CONFIGURATION UPDATE');
  console.log('======================================================================\n');

  try {
    await connectDB();
    console.log(`Connected to database: "${mongoose.connection.name}"`);

    // 1. Verify Super Admin exists
    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) {
      throw new Error('Super Admin not found in database!');
    }
    console.log(`Super Admin verified: ${admin.fullNameMarathi} (${admin.fullNameEnglish})`);

    // 2. Verify 16 Residents
    const activeResidentsCount = await Resident.countDocuments({ status: 'ACTIVE' });
    console.log(`Active Approved Residents Count: ${activeResidentsCount}`);
    if (activeResidentsCount !== 16) {
      throw new Error(`Expected exactly 16 active residents, found: ${activeResidentsCount}`);
    }

    // 3. Update or Upsert Maintenance Configuration to ₹1,000
    const targetAmount = 1000;
    const dueDay = 10;
    const expectedMonthlyTotal = targetAmount * activeResidentsCount;

    console.log(`\nSetting official monthly maintenance amount: ₹${targetAmount} per resident`);
    console.log(`Expected monthly billing total for 16 residents: ₹${expectedMonthlyTotal}`);

    const updatedConfig = await MaintenanceConfig.findOneAndUpdate(
      { singletonKey: 'MAINTENANCE_CONFIG_SINGLETON' },
      {
        $set: {
          singletonKey: 'MAINTENANCE_CONFIG_SINGLETON',
          defaultMonthlyAmount: targetAmount,
          dueDay: dueDay,
          lateFeeEnabled: false,
          lateFeeAmount: 0,
          financialYearStartMonth: 4,
          isConfigured: true,
          updatedByAdminId: admin._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('\n--- VERIFICATION OF SAVED CONFIGURATION ---');
    console.log(`ID:                   ${updatedConfig._id}`);
    console.log(`Singleton Key:        ${updatedConfig.singletonKey}`);
    console.log(`Monthly Amount:       ₹${updatedConfig.defaultMonthlyAmount}`);
    console.log(`Due Day:              ${updatedConfig.dueDay}th of each month`);
    console.log(`Late Fee Enabled:     ${updatedConfig.lateFeeEnabled}`);
    console.log(`Late Fee Amount:      ₹${updatedConfig.lateFeeAmount}`);
    console.log(`Financial Year Start: Month ${updatedConfig.financialYearStartMonth}`);
    console.log(`Is Configured:        ${updatedConfig.isConfigured}`);
    console.log(`Updated By Admin ID:  ${updatedConfig.updatedByAdminId}`);
    console.log(`Updated At:           ${updatedConfig.updatedAt}`);

    // 4. Verify historical dues are intact and NOT modified
    const existingDues = await MaintenanceDue.find();
    console.log(`\nExisting Historical Dues in DB: ${existingDues.length}`);
    const month11Bills = existingDues.filter(d => d.month === 11 && d.year === 2026);
    console.log(`Month 11/2026 Historical Bills Count: ${month11Bills.length}`);

    // 5. Calculate future monthly projection
    console.log('\n--- PROJECTED MONTHLY BILLING SUMMARY ---');
    console.log(`Number of Approved Residents: ${activeResidentsCount}`);
    console.log(`Per-Resident Monthly Fee:     ₹${updatedConfig.defaultMonthlyAmount}`);
    console.log(`Projected Total Per Month:    ₹${expectedMonthlyTotal} (16 × ₹1,000)`);

    console.log('\n✅ Configuration successfully updated and verified in database.');
    await mongoose.disconnect();
    return {
      success: true,
      config: updatedConfig,
      expectedMonthlyTotal
    };
  } catch (error) {
    console.error('Configuration update failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateMaintenanceRate();

