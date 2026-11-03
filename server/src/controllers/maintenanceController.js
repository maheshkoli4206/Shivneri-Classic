import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import MaintenanceConfig from '../models/MaintenanceConfig.js';
import MaintenanceDue from '../models/MaintenanceDue.js';
import Resident from '../models/Resident.js';

/**
 * GET /api/v1/maintenance/config
 * Retrieve maintenance configuration settings
 */
export const getMaintenanceConfig = async (req, res) => {
  try {
    let config = await MaintenanceConfig.findOne({
      singletonKey: 'MAINTENANCE_CONFIG_SINGLETON'
    });

    if (!config) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        config: null
      });
    }

    return res.status(200).json({
      success: true,
      isConfigured: config.isConfigured,
      config
    });
  } catch (error) {
    console.error('Error in getMaintenanceConfig:', error.message);
    return res.status(500).json({
      success: false,
      message: 'देखभाल सेटिंग्ज मिळवताना त्रुटी आली (Failed to fetch maintenance configuration)'
    });
  }
};

/**
 * PUT /api/v1/maintenance/config
 * Update or initialize maintenance configuration settings
 */
export const updateMaintenanceConfig = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'कृपया फॉर्ममधील त्रुटी तपासा (Validation failed)',
        errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
      });
    }

    const {
      defaultMonthlyAmount,
      dueDay = 10,
      lateFeeEnabled = false,
      lateFeeAmount = 0,
      financialYearStartMonth = 4
    } = req.body;

    const config = await MaintenanceConfig.findOneAndUpdate(
      { singletonKey: 'MAINTENANCE_CONFIG_SINGLETON' },
      {
        $set: {
          singletonKey: 'MAINTENANCE_CONFIG_SINGLETON',
          defaultMonthlyAmount: Number(defaultMonthlyAmount),
          dueDay: Number(dueDay),
          lateFeeEnabled: Boolean(lateFeeEnabled),
          lateFeeAmount: Number(lateFeeAmount),
          financialYearStartMonth: Number(financialYearStartMonth),
          isConfigured: true,
          updatedByAdminId: req.admin._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'देखभाल दर व सेटिंग्ज यशस्वीरीत्या जतन केल्या (Maintenance settings saved successfully)',
      config
    });
  } catch (error) {
    console.error('Error in updateMaintenanceConfig:', error.message);
    return res.status(500).json({
      success: false,
      message: 'सेटिंग्ज जतन करताना त्रुटी आली (Failed to save maintenance settings)'
    });
  }
};

/**
 * GET /api/v1/maintenance/preview
 * Preview monthly bill generation before confirmation
 */
export const previewMonthlyGeneration = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year || Number(month) < 1 || Number(month) > 12) {
      return res.status(400).json({
        success: false,
        message: 'कृपया वैध महिना (१-१२) आणि वर्ष निवडा (Please provide valid month and year)'
      });
    }

    const m = Number(month);
    const y = Number(year);

    // Check if configuration exists and is valid
    const config = await MaintenanceConfig.findOne({
      singletonKey: 'MAINTENANCE_CONFIG_SINGLETON'
    });

    if (!config || !config.isConfigured || config.defaultMonthlyAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'मासिक देखभाल दर अद्याप सेट केलेला नाही. कृपया प्रथम देखभाल सेटिंग्ज कॉन्फिगर करा. (Maintenance configuration is not set. Please configure settings first.)'
      });
    }

    // Fetch active residents eligible for billing
    const activeResidents = await Resident.find({ status: 'ACTIVE' }).sort({ fullNameMarathi: 1 });

    // Fetch existing bills for this month and year
    const existingBills = await MaintenanceDue.find({ month: m, year: y });
    const existingResidentIds = new Set(existingBills.map(b => b.residentId.toString()));

    const previewList = activeResidents.map(resident => {
      const alreadyBilled = existingResidentIds.has(resident._id.toString());
      return {
        residentId: resident._id,
        fullNameMarathi: resident.fullNameMarathi,
        flatNumber: resident.flatNumber || '',
        wing: resident.wing || 'A Wing',
        alreadyBilled,
        amountToBill: alreadyBilled ? 0 : config.defaultMonthlyAmount
      };
    });

    const alreadyBilledCount = previewList.filter(p => p.alreadyBilled).length;
    const newEligibleCount = previewList.filter(p => !p.alreadyBilled).length;
    const estimatedCollection = newEligibleCount * config.defaultMonthlyAmount;

    return res.status(200).json({
      success: true,
      preview: {
        month: m,
        year: y,
        configuredAmount: config.defaultMonthlyAmount,
        dueDay: config.dueDay,
        totalActiveResidents: activeResidents.length,
        alreadyBilledCount,
        newEligibleCount,
        estimatedCollection,
        previewList
      }
    });
  } catch (error) {
    console.error('Error in previewMonthlyGeneration:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पूर्वावलोकन आणताना त्रुटी आली (Failed to generate preview)'
    });
  }
};

/**
 * POST /api/v1/maintenance/generate
 * Idempotent batch generation of monthly maintenance bills
 */
export const generateMonthlyDues = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'कृपया वैध महिना आणि वर्ष निवडा (Validation failed)',
        errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
      });
    }

    const { month, year } = req.body;
    const m = Number(month);
    const y = Number(year);

    // Verify maintenance configuration
    const config = await MaintenanceConfig.findOne({
      singletonKey: 'MAINTENANCE_CONFIG_SINGLETON'
    });

    if (!config || !config.isConfigured || config.defaultMonthlyAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'मासिक देखभाल दर अद्याप सेट केलेला नाही. कृपया प्रथम देखभाल सेटिंग्ज कॉन्फिगर करा. (Maintenance configuration is not set. Please configure settings first.)'
      });
    }

    // Only ACTIVE residents receive new bills (INACTIVE residents are skipped)
    const activeResidents = await Resident.find({ status: 'ACTIVE' });
    if (activeResidents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'कोणतेही सक्रिय सभासद आढळले नाहीत (No active residents found)'
      });
    }

    // Calculate due date based on configured dueDay
    const safeDueDay = Math.min(config.dueDay || 10, 28);
    const dueDate = new Date(Date.UTC(y, m - 1, safeDueDay, 23, 59, 59));

    // Construct idempotent bulk operations using $setOnInsert
    // This strictly guarantees that existing bills are NEVER overwritten,
    // and running repeatedly creates zero duplicates.
    const bulkOps = activeResidents.map(resident => ({
      updateOne: {
        filter: { residentId: resident._id, month: m, year: y },
        update: {
          $setOnInsert: {
            residentId: resident._id,
            residentNameSnapshot: resident.fullNameMarathi,
            flatNumberSnapshot: resident.flatNumber || '',
            wing: resident.wing || 'A Wing',
            month: m,
            year: y,
            maintenanceAmount: config.defaultMonthlyAmount,
            lateFee: 0,
            totalAmountDue: config.defaultMonthlyAmount,
            amountPaid: 0,
            outstandingBalance: config.defaultMonthlyAmount,
            status: 'UNPAID',
            dueDate,
            generatedByAdminId: req.admin._id
          }
        },
        upsert: true
      }
    }));

    const bulkResult = await MaintenanceDue.bulkWrite(bulkOps, { ordered: false });

    const createdCount = bulkResult.upsertedCount || 0;
    const alreadyExistingCount = bulkResult.matchedCount || 0;
    const totalBilledAmount = createdCount * config.defaultMonthlyAmount;

    return res.status(200).json({
      success: true,
      message: `${m}/${y} महिन्याची देयके यशस्वीरीत्या तपासली/तयार केली (Monthly dues processed successfully)`,
      summary: {
        month: m,
        year: y,
        createdCount,
        alreadyExistingCount,
        amountPerUnit: config.defaultMonthlyAmount,
        totalBilledAmount
      }
    });
  } catch (error) {
    console.error('Error in generateMonthlyDues:', error.message);
    return res.status(500).json({
      success: false,
      message: 'मासिक देयके तयार करताना त्रुटी आली (Failed to generate monthly dues)'
    });
  }
};

/**
 * GET /api/v1/maintenance/dues
 * Retrieve maintenance bills with filtering
 */
export const getMaintenanceDues = async (req, res) => {
  try {
    const { month, year, status, search, residentId } = req.query;
    const filter = {};

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      filter.month = Number(month);
    }

    if (year && Number(year) >= 2020) {
      filter.year = Number(year);
    }

    if (status && ['UNPAID', 'PARTIAL', 'PAID'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (residentId && mongoose.Types.ObjectId.isValid(residentId)) {
      filter.residentId = residentId;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      filter.$or = [
        { residentNameSnapshot: { $regex: cleanSearch, $options: 'i' } },
        { flatNumberSnapshot: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const dues = await MaintenanceDue.find(filter).sort({
      year: -1,
      month: -1,
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: dues.length,
      dues
    });
  } catch (error) {
    console.error('Error in getMaintenanceDues:', error.message);
    return res.status(500).json({
      success: false,
      message: 'देयकांची यादी आणताना त्रुटी आली (Failed to fetch dues)'
    });
  }
};

/**
 * GET /api/v1/maintenance/dues/:id
 * Retrieve single maintenance bill details
 */
export const getMaintenanceDueById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध देयक ओळख क्रमांक (Invalid maintenance bill ID)'
      });
    }

    const due = await MaintenanceDue.findById(id).populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber email status');
    if (!due) {
      return res.status(404).json({
        success: false,
        message: 'देयक आढळले नाही (Maintenance bill not found)'
      });
    }

    return res.status(200).json({
      success: true,
      due
    });
  } catch (error) {
    console.error('Error in getMaintenanceDueById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'देयकाची माहिती आणताना त्रुटी आली (Failed to fetch due details)'
    });
  }
};

/**
 * GET /api/v1/maintenance/summary
 * Aggregate maintenance financial summary
 */
export const getMaintenanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const matchFilter = {};

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      matchFilter.month = Number(month);
    }
    if (year && Number(year) >= 2020) {
      matchFilter.year = Number(year);
    }

    const stats = await MaintenanceDue.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalBillsCount: { $sum: 1 },
          totalBilledAmount: { $sum: '$totalAmountDue' },
          totalPaidAmount: { $sum: '$amountPaid' },
          totalOutstandingAmount: { $sum: '$outstandingBalance' },
          unpaidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] }
          },
          partialCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalBillsCount: 0,
      totalBilledAmount: 0,
      totalPaidAmount: 0,
      totalOutstandingAmount: 0,
      unpaidCount: 0,
      partialCount: 0,
      paidCount: 0
    };

    return res.status(200).json({
      success: true,
      summary: result
    });
  } catch (error) {
    console.error('Error in getMaintenanceSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'सारांश माहिती आणताना त्रुटी आली (Failed to fetch summary)'
    });
  }
};

