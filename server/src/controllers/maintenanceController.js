import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import MaintenanceConfig from '../models/MaintenanceConfig.js';
import MaintenanceDue from '../models/MaintenanceDue.js';
import Resident from '../models/Resident.js';
import AdvancePayment from '../models/AdvancePayment.js';
import AuditLog from '../models/AuditLog.js';

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

    // Ensure categoryRates object exists with society standards
    if (!config.categoryRates || typeof config.categoryRates.residential !== 'number') {
      config.categoryRates = {
        residential: config.defaultMonthlyAmount || 1000,
        shop: 300,
        chairman: 500
      };
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
      categoryRates,
      dueDay = 10,
      lateFeeEnabled = false,
      lateFeeAmount = 0,
      financialYearStartMonth = 4,
      autoApplyAdvance = false
    } = req.body;

    const resRate = Number(categoryRates?.residential ?? defaultMonthlyAmount ?? 1000);
    const shopRate = Number(categoryRates?.shop ?? 300);
    const chairRate = Number(categoryRates?.chairman ?? 500);

    const config = await MaintenanceConfig.findOneAndUpdate(
      { singletonKey: 'MAINTENANCE_CONFIG_SINGLETON' },
      {
        $set: {
          singletonKey: 'MAINTENANCE_CONFIG_SINGLETON',
          defaultMonthlyAmount: resRate,
          categoryRates: {
            residential: resRate,
            shop: shopRate,
            chairman: chairRate
          },
          dueDay: Number(dueDay),
          lateFeeEnabled: Boolean(lateFeeEnabled),
          lateFeeAmount: Number(lateFeeAmount),
          financialYearStartMonth: Number(financialYearStartMonth),
          autoApplyAdvance: Boolean(autoApplyAdvance),
          isConfigured: true,
          updatedByAdminId: req.admin._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Record immutable audit log
    try {
      await AuditLog.create({
        action: 'CATEGORY_RATES_UPDATED',
        performedByAdminId: req.admin._id || req.admin.id,
        entityType: 'MAINTENANCE_CONFIG',
        entityId: config._id,
        details: {
          categoryRates: {
            residential: resRate,
            shop: shopRate,
            chairman: chairRate
          },
          defaultMonthlyAmount: resRate,
          dueDay: Number(dueDay)
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    } catch (auditErr) {
      console.warn('Audit log write error for category rates:', auditErr.message);
    }

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
 * Preview category-wise monthly bill generation before confirmation
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

    // Check if configuration exists
    const config = await MaintenanceConfig.findOne({
      singletonKey: 'MAINTENANCE_CONFIG_SINGLETON'
    });

    if (!config || !config.isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'मासिक देखभाल दर अद्याप सेट केलेला नाही. कृपया प्रथम देखभाल सेटिंग्ज कॉन्फिगर करा. (Maintenance configuration is not set. Please configure settings first.)'
      });
    }

    const rates = {
      residential: config.categoryRates?.residential ?? config.defaultMonthlyAmount ?? 1000,
      shop: config.categoryRates?.shop ?? 300,
      chairman: config.categoryRates?.chairman ?? 500
    };

    // Fetch active residents sorted by flat/shop number
    const activeResidents = await Resident.find({ status: 'ACTIVE' }).sort({ flatNumber: 1, fullNameMarathi: 1 });

    // Fetch existing bills for this month and year
    const existingBills = await MaintenanceDue.find({ month: m, year: y });
    const existingResidentIds = new Set(existingBills.map(b => b.residentId.toString()));

    // Category breakdown counters
    const breakdown = {
      residential: { count: 0, billedCount: 0, eligibleCount: 0, rate: rates.residential, totalAmount: 0 },
      shop: { count: 0, billedCount: 0, eligibleCount: 0, rate: rates.shop, totalAmount: 0 },
      chairman: { count: 0, billedCount: 0, eligibleCount: 0, rate: rates.chairman, totalAmount: 0 },
      unassigned: { count: 0, customEligibleCount: 0, totalAmount: 0 }
    };

    let customRatesCount = 0;

    const previewList = activeResidents.map(resident => {
      const alreadyBilled = existingResidentIds.has(resident._id.toString());
      const propertyType = resident.propertyType || (resident.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL_FLAT');
      const category = resident.maintenanceCategory || 'UNASSIGNED';
      const isUnassigned = category === 'UNASSIGNED';

      // Standard category rate
      let defaultCategoryRate = rates.residential;
      if (category === 'SHOP') {
        defaultCategoryRate = rates.shop;
      } else if (category === 'CHAIRMAN') {
        defaultCategoryRate = rates.chairman;
      }

      // Resident master custom rate
      const hasCustomMasterRate = resident.customMaintenanceAmount != null && !isNaN(resident.customMaintenanceAmount) && Number(resident.customMaintenanceAmount) > 0;
      const customMasterRate = hasCustomMasterRate ? Number(resident.customMaintenanceAmount) : null;
      if (hasCustomMasterRate) customRatesCount += 1;

      // Calculation priority:
      // 1. Valid resident-specific custom maintenance rate (> 0)
      //    - If UNASSIGNED but has customMasterRate > 0: Allow bill generation, status = CUSTOM_RATE_ELIGIBLE
      // 2. Assigned category rate (Residential ₹1000, Shop ₹300, Chairman ₹500)
      // 3. UNASSIGNED without custom rate is strictly excluded
      let applicableAmount = 0;
      let billingStatus = 'ELIGIBLE';
      let isUnassignedCustomEligible = false;
      let warning = null;

      if (isUnassigned) {
        if (hasCustomMasterRate) {
          billingStatus = 'CUSTOM_RATE_ELIGIBLE';
          isUnassignedCustomEligible = true;
          applicableAmount = customMasterRate;
          warning = 'वर्गवारी अपूर्ण आहे पण विशेष दर निश्चित आहे (Category Unassigned - Custom Rate Available)';
          breakdown.unassigned.customEligibleCount += 1;
          breakdown.unassigned.totalAmount += applicableAmount;
        } else {
          billingStatus = 'EXCLUDED_UNASSIGNED';
          breakdown.unassigned.count += 1;
        }
      } else if (alreadyBilled) {
        billingStatus = 'ALREADY_BILLED';
        if (hasCustomMasterRate) {
          applicableAmount = customMasterRate;
        } else {
          applicableAmount = defaultCategoryRate;
        }
        if (category === 'RESIDENTIAL') breakdown.residential.billedCount += 1;
        else if (category === 'SHOP') breakdown.shop.billedCount += 1;
        else if (category === 'CHAIRMAN') breakdown.chairman.billedCount += 1;
      } else {
        billingStatus = 'ELIGIBLE';
        if (hasCustomMasterRate) {
          applicableAmount = customMasterRate;
        } else {
          applicableAmount = defaultCategoryRate;
        }

        if (category === 'RESIDENTIAL') {
          breakdown.residential.eligibleCount += 1;
          breakdown.residential.totalAmount += applicableAmount;
        } else if (category === 'SHOP') {
          breakdown.shop.eligibleCount += 1;
          breakdown.shop.totalAmount += applicableAmount;
        } else if (category === 'CHAIRMAN') {
          breakdown.chairman.eligibleCount += 1;
          breakdown.chairman.totalAmount += applicableAmount;
        }
      }

      if (category === 'RESIDENTIAL') breakdown.residential.count += 1;
      else if (category === 'SHOP') breakdown.shop.count += 1;
      else if (category === 'CHAIRMAN') breakdown.chairman.count += 1;

      return {
        residentId: resident._id,
        fullNameMarathi: resident.fullNameMarathi,
        flatNumber: resident.flatNumber || '',
        wing: resident.wing || 'A Wing',
        propertyType,
        maintenanceCategory: category,
        defaultCategoryRate,
        customMasterRate,
        hasCustomMasterRate,
        applicableRate: applicableAmount,
        amountToBill: applicableAmount,
        alreadyBilled,
        isUnassigned,
        isUnassignedCustomEligible,
        warning,
        availableAdvanceBalance: resident.advanceBalance || 0,
        totalAdvanceReceived: resident.totalAdvanceReceived || 0,
        totalAdvanceUtilized: resident.totalAdvanceUtilized || 0,
        billingStatus
      };
    });

    const alreadyBilledCount = previewList.filter(p => p.alreadyBilled).length;
    const standardEligibleCount = previewList.filter(p => p.billingStatus === 'ELIGIBLE').length;
    const unassignedCustomEligibleCount = previewList.filter(p => p.billingStatus === 'CUSTOM_RATE_ELIGIBLE').length;
    const newEligibleCount = standardEligibleCount + unassignedCustomEligibleCount;
    const estimatedCollection = breakdown.residential.totalAmount + breakdown.shop.totalAmount + breakdown.chairman.totalAmount + breakdown.unassigned.totalAmount;
    const totalAdvanceBalanceAvailable = activeResidents.reduce((sum, r) => sum + (r.advanceBalance || 0), 0);

    return res.status(200).json({
      success: true,
      preview: {
        month: m,
        year: y,
        categoryRates: rates,
        configuredAmount: rates.residential,
        dueDay: config.dueDay,
        autoApplyAdvance: Boolean(config.autoApplyAdvance),
        totalActiveResidents: activeResidents.length,
        alreadyBilledCount,
        newEligibleCount,
        standardEligibleCount,
        unassignedCustomEligibleCount,
        unassignedCount: breakdown.unassigned.count,
        customRatesCount,
        estimatedCollection,
        totalAdvanceBalanceAvailable,
        breakdown,
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
 * Idempotent batch generation of category-wise monthly maintenance bills with selective overrides
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

    const { month, year, billingItems } = req.body;
    const m = Number(month);
    const y = Number(year);

    // Verify maintenance configuration
    const config = await MaintenanceConfig.findOne({
      singletonKey: 'MAINTENANCE_CONFIG_SINGLETON'
    });

    if (!config || !config.isConfigured) {
      return res.status(400).json({
        success: false,
        message: 'मासिक देखभाल दर अद्याप सेट केलेला नाही. कृपया प्रथम देखभाल सेटिंग्ज कॉन्फिगर करा. (Maintenance configuration is not set. Please configure settings first.)'
      });
    }

    const rates = {
      residential: config.categoryRates?.residential ?? config.defaultMonthlyAmount ?? 1000,
      shop: config.categoryRates?.shop ?? 300,
      chairman: config.categoryRates?.chairman ?? 500
    };

    // Only ACTIVE residents with assigned categories receive new bills
    const activeResidents = await Resident.find({ status: 'ACTIVE' });
    if (activeResidents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'कोणतेही सक्रिय सभासद आढळले नाहीत (No active residents found)'
      });
    }

    // Active residents eligible for billing:
    // (a) Residents with assigned categories (RESIDENTIAL, SHOP, CHAIRMAN)
    // (b) UNASSIGNED residents with a valid custom maintenance rate > 0
    const eligibleResidents = activeResidents.filter(r => {
      const isAssigned = r.maintenanceCategory && r.maintenanceCategory !== 'UNASSIGNED';
      const hasValidCustom = r.customMaintenanceAmount != null && !isNaN(r.customMaintenanceAmount) && Number(r.customMaintenanceAmount) > 0;
      return isAssigned || hasValidCustom;
    });
    const unassignedCount = activeResidents.length - eligibleResidents.length;

    if (eligibleResidents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'सर्व सभासदांची श्रेणी निश्चित नाही किंवा विशेष दर उपलब्ध नाही. कृपया आधी सभासदांची श्रेणी निश्चित करा. (All residents are unassigned. Please assign categories before billing.)'
      });
    }

    // Calculate due date based on configured dueDay
    const safeDueDay = Math.min(config.dueDay || 10, 28);
    const dueDate = new Date(Date.UTC(y, m - 1, safeDueDay, 23, 59, 59));

    // Fetch existing bills for idempotency
    const existingBills = await MaintenanceDue.find({ month: m, year: y });
    const existingResidentIds = new Set(existingBills.map(b => b.residentId.toString()));

    // Create lookup map for billingItems if provided
    const itemsMap = new Map();
    if (Array.isArray(billingItems)) {
      billingItems.forEach(item => {
        if (item && item.residentId) {
          itemsMap.set(item.residentId.toString(), item);
        }
      });
    }

    const auditOverrides = [];
    let createdCount = 0;
    let skippedCount = 0;
    let fullRateCount = 0;
    let reducedCount = 0;
    let zeroAmountCount = 0;
    let advanceAdjustedTotal = 0;

    for (const resident of eligibleResidents) {
      const resIdStr = resident._id.toString();

      // If already billed, skip to preserve idempotency
      if (existingResidentIds.has(resIdStr)) {
        continue;
      }

      const category = resident.maintenanceCategory || 'UNASSIGNED';
      const isUnassigned = category === 'UNASSIGNED';
      const propertyType = resident.propertyType || (resident.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL_FLAT');

      let defaultCategoryRate = rates.residential;
      if (category === 'SHOP') defaultCategoryRate = rates.shop;
      else if (category === 'CHAIRMAN') defaultCategoryRate = rates.chairman;

      const hasCustomMasterRate = resident.customMaintenanceAmount != null && !isNaN(resident.customMaintenanceAmount) && Number(resident.customMaintenanceAmount) > 0;
      const customMasterRate = hasCustomMasterRate ? Number(resident.customMaintenanceAmount) : null;
      const baseApplicableRate = hasCustomMasterRate ? customMasterRate : defaultCategoryRate;

      // Handle unassigned resident requirement:
      // "Require explicit Admin selection before generating an Unassigned resident's bill."
      const itemConfig = itemsMap.get(resIdStr);
      if (isUnassigned) {
        if (!itemConfig || itemConfig.selected !== true) {
          // Unassigned residents MUST be explicitly selected by Admin to be billed!
          skippedCount += 1;
          continue;
        }
      }

      // Selective instruction handling for assigned residents
      let actionType = 'FULL';
      let appliedAmount = baseApplicableRate;
      let overrideReason = '';

      if (itemsMap.size > 0 && !isUnassigned) {
        if (!itemConfig || itemConfig.selected === false || itemConfig.actionType === 'SKIP') {
          // Resident explicitly skipped: DO NOT CREATE ANY MaintenanceDue document!
          skippedCount += 1;
          auditOverrides.push({
            residentId: resident._id,
            fullNameMarathi: resident.fullNameMarathi,
            flatNumber: resident.flatNumber || '',
            defaultRate: baseApplicableRate,
            appliedAmount: null,
            actionType: 'SKIP',
            reason: itemConfig?.overrideReason?.trim() || 'Skipped for this billing cycle'
          });
          continue;
        }
      }

      if (itemConfig) {
        actionType = itemConfig.actionType || (itemConfig.appliedAmount === 0 ? 'ZERO' : itemConfig.appliedAmount !== baseApplicableRate ? 'REDUCED' : 'FULL');
        overrideReason = itemConfig.overrideReason?.trim() || '';

        if (actionType === 'ZERO' || Number(itemConfig.appliedAmount) === 0) {
          appliedAmount = 0;
        } else if (itemConfig.appliedAmount !== undefined && !isNaN(Number(itemConfig.appliedAmount))) {
          appliedAmount = Math.max(0, Number(itemConfig.appliedAmount));
        } else {
          appliedAmount = baseApplicableRate;
        }
      }

      // Handle Advance payment application
      let advanceToApply = 0;
      const availableAdv = resident.advanceBalance || 0;
      if (availableAdv > 0 && appliedAmount > 0) {
        if (itemConfig?.applyAdvanceAmount !== undefined && !isNaN(Number(itemConfig.applyAdvanceAmount))) {
          advanceToApply = Math.min(Math.max(0, Number(itemConfig.applyAdvanceAmount)), availableAdv, appliedAmount);
        } else if (config.autoApplyAdvance || itemConfig?.applyAdvance === true) {
          advanceToApply = Math.min(availableAdv, appliedAmount);
        }
      }

      const isZero = appliedAmount === 0 || actionType === 'ZERO';
      const isOverride = isZero || (appliedAmount !== baseApplicableRate);

      if (isZero) {
        zeroAmountCount += 1;
      } else if (isOverride) {
        reducedCount += 1;
      } else {
        fullRateCount += 1;
      }

      if (isOverride) {
        auditOverrides.push({
          residentId: resident._id,
          fullNameMarathi: resident.fullNameMarathi,
          flatNumber: resident.flatNumber || '',
          defaultRate: baseApplicableRate,
          appliedAmount,
          actionType: isZero ? 'ZERO' : 'REDUCED',
          reason: overrideReason
        });
      }

      const dueAmount = isZero ? 0 : appliedAmount;
      const outstandingBal = Math.max(0, Math.round((dueAmount - advanceToApply) * 100) / 100);
      const billStatus = isZero ? 'PAID' : (outstandingBal === 0 ? 'PAID' : (advanceToApply > 0 ? 'PARTIAL' : 'UNPAID'));
      const newDueId = new mongoose.Types.ObjectId();
      const advAdjustments = [];

      // Process Advance Allocation (FIFO) if applicable
      if (advanceToApply > 0) {
        const activeAdvDocs = await AdvancePayment.find({
          residentId: resident._id,
          status: 'ACTIVE',
          availableBalance: { $gt: 0 }
        }).sort({ paymentDate: 1 });

        let remToAdjust = advanceToApply;
        for (const advDoc of activeAdvDocs) {
          if (remToAdjust <= 0) break;
          const takeAmt = Math.min(advDoc.availableBalance, remToAdjust);
          advDoc.usedAmount = Math.round((advDoc.usedAmount + takeAmt) * 100) / 100;
          advDoc.availableBalance = Math.round((advDoc.availableBalance - takeAmt) * 100) / 100;
          if (advDoc.availableBalance === 0) {
            advDoc.status = 'FULLY_UTILIZED';
          }
          advDoc.adjustments.push({
            maintenanceDueId: newDueId,
            month: m,
            year: y,
            amountApplied: takeAmt,
            appliedAt: new Date(),
            appliedByAdminId: req.admin._id,
            remarks: `Auto-adjusted against ${m}/${y} maintenance bill upon generation`
          });
          await advDoc.save();

          advAdjustments.push({
            advancePaymentId: advDoc._id,
            receiptNumber: advDoc.receiptNumber,
            amount: takeAmt,
            adjustedAt: new Date(),
            adjustedByAdminId: req.admin._id
          });

          remToAdjust = Math.round((remToAdjust - takeAmt) * 100) / 100;
        }

        resident.advanceBalance = Math.round((resident.advanceBalance - advanceToApply) * 100) / 100;
        resident.totalAdvanceUtilized = Math.round(((resident.totalAdvanceUtilized || 0) + advanceToApply) * 100) / 100;
        await resident.save();
        advanceAdjustedTotal += advanceToApply;

        try {
          await AuditLog.create({
            action: 'ADVANCE_APPLIED_TO_BILL',
            performedByAdminId: req.admin._id,
            entityType: 'MAINTENANCE_DUE',
            entityId: newDueId,
            details: {
              residentId: resident._id,
              residentName: resident.fullNameMarathi,
              flatNumber: resident.flatNumber || '',
              month: m,
              year: y,
              amountApplied: advanceToApply,
              newOutstandingBalance: outstandingBal,
              context: 'MONTHLY_BILL_GENERATION'
            },
            ipAddress: req.ip || '',
            userAgent: req.get('user-agent') || ''
          });
        } catch (audErr) {
          console.warn('Audit log error on advance generation:', audErr.message);
        }
      }

      // Create MaintenanceDue document
      const dueDoc = new MaintenanceDue({
        _id: newDueId,
        residentId: resident._id,
        residentNameSnapshot: resident.fullNameMarathi,
        flatNumberSnapshot: resident.flatNumber || '',
        wing: resident.wing || 'A Wing',
        propertyTypeSnapshot: propertyType,
        maintenanceCategorySnapshot: isUnassigned ? 'UNASSIGNED' : category,
        standardRateSnapshot: isUnassigned ? null : defaultCategoryRate,
        customMasterRateSnapshot: customMasterRate,
        appliedRate: dueAmount,
        month: m,
        year: y,
        maintenanceAmount: dueAmount,
        lateFee: 0,
        totalAmountDue: dueAmount,
        amountPaid: 0,
        advanceAdjustedAmount: advanceToApply,
        isAdvanceApplied: advanceToApply > 0,
        advanceAdjustmentDetails: advAdjustments,
        outstandingBalance: outstandingBal,
        status: billStatus,
        dueDate,
        isMonthlyOverride: isOverride,
        isZeroAmountBill: isZero,
        overrideReason,
        generatedByAdminId: req.admin._id
      });

      await dueDoc.save();
      createdCount += 1;
    }

    const alreadyExistingCount = existingResidentIds.size;

    // Fetch newly created bills to calculate exact total billed amount
    const newlyCreatedBills = await MaintenanceDue.find({
      month: m,
      year: y
    });

    let totalBilledAmount = 0;
    const generatedBreakdown = {
      residential: { count: 0, total: 0 },
      shop: { count: 0, total: 0 },
      chairman: { count: 0, total: 0 },
      unassigned: { count: 0, total: 0 }
    };

    newlyCreatedBills.forEach(b => {
      totalBilledAmount += b.totalAmountDue;
      const cat = b.maintenanceCategorySnapshot || 'RESIDENTIAL';
      if (cat === 'SHOP') {
        generatedBreakdown.shop.count += 1;
        generatedBreakdown.shop.total += b.totalAmountDue;
      } else if (cat === 'CHAIRMAN') {
        generatedBreakdown.chairman.count += 1;
        generatedBreakdown.chairman.total += b.totalAmountDue;
      } else if (cat === 'UNASSIGNED') {
        generatedBreakdown.unassigned.count += 1;
        generatedBreakdown.unassigned.total += b.totalAmountDue;
      } else {
        generatedBreakdown.residential.count += 1;
        generatedBreakdown.residential.total += b.totalAmountDue;
      }
    });

    // Record immutable audit log
    try {
      await AuditLog.create({
        action: 'MONTHLY_DUES_GENERATED',
        performedByAdminId: req.admin._id,
        entityType: 'MAINTENANCE_DUE',
        entityId: req.admin._id,
        details: {
          month: m,
          year: y,
          createdCount,
          skippedCount,
          zeroAmountCount,
          reducedCount,
          fullRateCount,
          alreadyExistingCount,
          unassignedSkippedCount: unassignedCount,
          totalBilledAmount,
          categoryBreakdown: generatedBreakdown,
          auditOverrides
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log for monthly dues generation:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `${m}/${y} महिन्याची देयके यशस्वीरीत्या तयार केली (Monthly dues processed successfully)`,
      summary: {
        month: m,
        year: y,
        createdCount,
        skippedCount,
        zeroAmountCount,
        reducedCount,
        fullRateCount,
        alreadyExistingCount,
        unassignedSkippedCount: unassignedCount,
        categoryRates: rates,
        categoryBreakdown: generatedBreakdown,
        totalBilledAmount,
        overridesCount: auditOverrides.length
      }
    });
  } catch (error) {
    console.error('Error in generateMonthlyDues:', error.message);
    return res.status(500).json({
      success: false,
      message: 'देयके तयार करताना त्रुटी आली (Failed to generate bills)'
    });
  }
};

/**
 * GET /api/v1/maintenance/dues
 * Retrieve maintenance bills with filtering
 */
export const getMaintenanceDues = async (req, res) => {
  try {
    const { month, year, status, search, residentId, category, onlyOutstanding } = req.query;
    const filter = {};

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      filter.month = Number(month);
    }

    if (year && Number(year) >= 2020) {
      filter.year = Number(year);
    }

    if (status) {
      const sUpper = status.toUpperCase();
      if (sUpper === 'PENDING' || sUpper === 'OUTSTANDING') {
        filter.status = { $in: ['UNPAID', 'PARTIAL'] };
        filter.outstandingBalance = { $gt: 0 };
      } else if (['UNPAID', 'PARTIAL', 'PAID'].includes(sUpper)) {
        filter.status = sUpper;
      }
    }

    if (onlyOutstanding === 'true') {
      filter.outstandingBalance = { $gt: 0 };
    }

    if (category && category !== 'ALL') {
      filter.maintenanceCategorySnapshot = category.toUpperCase();
    }

    if (residentId && mongoose.Types.ObjectId.isValid(residentId)) {
      filter.residentId = residentId;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escaped = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { residentNameSnapshot: { $regex: escaped, $options: 'i' } },
        { flatNumberSnapshot: { $regex: escaped, $options: 'i' } }
      ];
    }

    const dues = await MaintenanceDue.find(filter)
      .populate('residentId', 'fullNameMarathi flatNumber propertyType maintenanceCategory advanceBalance mobileNumber')
      .sort({
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

