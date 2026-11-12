import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Resident from '../models/Resident.js';
import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/v1/residents
 * List residents with search and status filtering
 */
export const getResidents = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    // Filter by status if specified and not 'ALL'
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    // Search query by Marathi full name or flat number
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      filter.$or = [
        { fullNameMarathi: { $regex: cleanSearch, $options: 'i' } },
        { flatNumber: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const residents = await Resident.find(filter).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: residents.length,
      residents
    });
  } catch (error) {
    console.error('Error in getResidents:', error.message);
    return res.status(500).json({
      success: false,
      message: 'सभासदांची यादी आणताना त्रुटी आली (Failed to fetch residents list)'
    });
  }
};

/**
 * GET /api/v1/residents/:id
 * Retrieve single resident by ID
 */
export const getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध सभासद ओळख क्रमांक (Invalid resident ID)'
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद आढळला नाही (Resident not found)'
      });
    }

    return res.status(200).json({
      success: true,
      resident
    });
  } catch (error) {
    console.error('Error in getResidentById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'सभासदाची माहिती आणताना त्रुटी आली (Failed to fetch resident details)'
    });
  }
};

/**
 * POST /api/v1/residents
 * Create a new resident master record
 */
export const createResident = async (req, res) => {
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
      fullNameMarathi,
      flatNumber,
      wing = 'A Wing',
      mobileNumber = '',
      email = '',
      address = '',
      status = 'ACTIVE',
      propertyType = 'RESIDENTIAL_FLAT',
      maintenanceCategory = 'UNASSIGNED',
      customMaintenanceAmount = null,
      notes = ''
    } = req.body;

    const trimmedName = fullNameMarathi?.trim();
    const trimmedFlat = flatNumber?.trim() || '';

    // If flat number is supplied, ensure no other resident in same wing already has it
    if (trimmedFlat) {
      const existingFlat = await Resident.findOne({
        flatNumber: trimmedFlat,
        wing: wing.trim()
      });
      if (existingFlat) {
        return res.status(400).json({
          success: false,
          message: `सदनिका क्र. ${trimmedFlat} साठी आधीच सभासद (${existingFlat.fullNameMarathi}) नोंदणीकृत आहे. (A resident is already registered for flat ${trimmedFlat}.)`
        });
      }
    }

    const resident = await Resident.create({
      fullNameMarathi: trimmedName,
      flatNumber: trimmedFlat,
      wing: wing.trim() || 'A Wing',
      mobileNumber: mobileNumber.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      propertyType: ['RESIDENTIAL_FLAT', 'SHOP'].includes(propertyType) ? propertyType : 'RESIDENTIAL_FLAT',
      maintenanceCategory: ['RESIDENTIAL', 'SHOP', 'CHAIRMAN', 'UNASSIGNED'].includes(maintenanceCategory) ? maintenanceCategory : 'UNASSIGNED',
      customMaintenanceAmount: customMaintenanceAmount != null && customMaintenanceAmount !== '' ? Number(customMaintenanceAmount) : null,
      notes: notes.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'नवीन सभासद यशस्वीरीत्या नोंदवला (Resident registered successfully)',
      resident
    });
  } catch (error) {
    console.error('Error in createResident:', error.message);
    return res.status(500).json({
      success: false,
      message: 'नवीन सभासद तयार करताना त्रुटी आली (Failed to create resident)'
    });
  }
};

/**
 * PUT /api/v1/residents/:id
 * Update an existing resident master record
 */
export const updateResident = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध सभासद ओळख क्रमांक (Invalid resident ID)'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'कृपया फॉर्ममधील त्रुटी तपासा (Validation failed)',
        errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद आढळला नाही (Resident not found)'
      });
    }

    const {
      fullNameMarathi,
      flatNumber,
      wing = 'A Wing',
      mobileNumber = '',
      email = '',
      address = '',
      status,
      propertyType,
      maintenanceCategory,
      customMaintenanceAmount,
      notes = ''
    } = req.body;

    const trimmedName = fullNameMarathi?.trim();
    const trimmedFlat = flatNumber !== undefined ? flatNumber.trim() : resident.flatNumber;

    // Check duplicate flat number if non-empty and changing
    if (trimmedFlat && trimmedFlat !== resident.flatNumber) {
      const duplicateFlat = await Resident.findOne({
        _id: { $ne: id },
        flatNumber: trimmedFlat,
        wing: wing.trim()
      });
      if (duplicateFlat) {
        return res.status(400).json({
          success: false,
          message: `सदनिका क्र. ${trimmedFlat} साठी आधीच सभासद (${duplicateFlat.fullNameMarathi}) नोंदणीकृत आहे. (A resident is already registered for flat ${trimmedFlat}.)`
        });
      }
    }

    resident.fullNameMarathi = trimmedName || resident.fullNameMarathi;
    resident.flatNumber = trimmedFlat;
    resident.wing = wing.trim() || resident.wing;
    resident.mobileNumber = mobileNumber !== undefined ? mobileNumber.trim() : resident.mobileNumber;
    resident.email = email !== undefined ? email.trim().toLowerCase() : resident.email;
    resident.address = address !== undefined ? address.trim() : resident.address;
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      resident.status = status.toUpperCase();
    }
    if (propertyType && ['RESIDENTIAL_FLAT', 'SHOP'].includes(propertyType)) {
      resident.propertyType = propertyType;
    }
    if (maintenanceCategory && ['RESIDENTIAL', 'SHOP', 'CHAIRMAN', 'UNASSIGNED'].includes(maintenanceCategory)) {
      resident.maintenanceCategory = maintenanceCategory;
    }
    if (customMaintenanceAmount !== undefined) {
      resident.customMaintenanceAmount = (customMaintenanceAmount !== null && customMaintenanceAmount !== '') ? Number(customMaintenanceAmount) : null;
    }
    resident.notes = notes !== undefined ? notes.trim() : resident.notes;

    await resident.save();

    return res.status(200).json({
      success: true,
      message: 'सभासदाची माहिती यशस्वीरीत्या अद्यतनित केली (Resident details updated successfully)',
      resident
    });
  } catch (error) {
    console.error('Error in updateResident:', error.message);
    return res.status(500).json({
      success: false,
      message: 'माहिती अद्यतनित करताना त्रुटी आली (Failed to update resident)'
    });
  }
};

/**
 * PATCH /api/v1/residents/:id/status
 * Toggle or update resident status (ACTIVE / INACTIVE)
 */
export const updateResidentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध सभासद ओळख क्रमांक (Invalid resident ID)'
      });
    }

    const resident = await Resident.findById(id);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद आढळला नाही (Resident not found)'
      });
    }

    const targetStatus = req.body.status
      ? req.body.status.toUpperCase()
      : resident.status === 'ACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE';

    if (!['ACTIVE', 'INACTIVE'].includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध स्थिती. फक्त ACTIVE किंवा INACTIVE अनुज्ञेय आहे (Invalid status)'
      });
    }

    resident.status = targetStatus;
    await resident.save();

    return res.status(200).json({
      success: true,
      message: `सभासद स्थिती यशस्वीरीत्या ${targetStatus === 'ACTIVE' ? 'सक्रिय' : 'निष्क्रिय'} केली (Resident status updated)`,
      resident
    });
  } catch (error) {
    console.error('Error in updateResidentStatus:', error.message);
    return res.status(500).json({
      success: false,
      message: 'स्थिती अद्यतनित करताना त्रुटी आली (Failed to update status)'
    });
  }
};

/**
 * GET /api/v1/residents/category-summary
 * Get resident count and list by maintenance category
 */
export const getCategorySummary = async (req, res) => {
  try {
    const allResidents = await Resident.find({}).sort({ flatNumber: 1, fullNameMarathi: 1 });

    const summary = {
      total: allResidents.length,
      residentialCount: 0,
      shopCount: 0,
      chairmanCount: 0,
      unassignedCount: 0,
      unassignedResidents: []
    };

    allResidents.forEach(r => {
      const cat = r.maintenanceCategory || 'UNASSIGNED';
      if (cat === 'RESIDENTIAL') summary.residentialCount += 1;
      else if (cat === 'SHOP') summary.shopCount += 1;
      else if (cat === 'CHAIRMAN') summary.chairmanCount += 1;
      else {
        summary.unassignedCount += 1;
        summary.unassignedResidents.push({
          _id: r._id,
          fullNameMarathi: r.fullNameMarathi,
          flatNumber: r.flatNumber || '',
          wing: r.wing || 'A Wing',
          status: r.status,
          propertyType: r.propertyType || (r.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL_FLAT'),
          maintenanceCategory: 'UNASSIGNED'
        });
      }
    });

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error in getCategorySummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'श्रेणी सारांश मिळवताना त्रुटी आली (Failed to retrieve category summary)'
    });
  }
};

/**
 * PUT /api/v1/residents/batch-categories
 * Batch assign/update maintenance categories for residents
 */
export const batchAssignCategories = async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'कृपया श्रेणी निश्चितीसाठी सभासदांची यादी पाठवा (Assignments array is required)'
      });
    }

    let updatedCount = 0;
    const validCategories = ['RESIDENTIAL', 'SHOP', 'CHAIRMAN', 'UNASSIGNED'];
    const validPropertyTypes = ['RESIDENTIAL_FLAT', 'SHOP'];

    for (const item of assignments) {
      if (!item.residentId || !mongoose.Types.ObjectId.isValid(item.residentId)) {
        continue;
      }

      const updateFields = {};
      if (item.propertyType && validPropertyTypes.includes(item.propertyType)) {
        updateFields.propertyType = item.propertyType;
      }
      if (item.maintenanceCategory && validCategories.includes(item.maintenanceCategory)) {
        updateFields.maintenanceCategory = item.maintenanceCategory;
      }
      if (item.customMaintenanceAmount !== undefined) {
        updateFields.customMaintenanceAmount = (item.customMaintenanceAmount !== null && item.customMaintenanceAmount !== '')
          ? Number(item.customMaintenanceAmount)
          : null;
      }

      if (Object.keys(updateFields).length > 0) {
        await Resident.findByIdAndUpdate(item.residentId, { $set: updateFields });
        updatedCount += 1;
      }
    }

    // Record immutable audit log
    try {
      await AuditLog.create({
        action: 'MAINTENANCE_CATEGORY_ASSIGNED',
        performedByAdminId: req.admin._id,
        entityType: 'RESIDENT',
        entityId: req.admin._id,
        details: {
          updatedCount,
          totalSubmitted: assignments.length
        },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (auditErr) {
      console.warn('Failed to record audit log for batch category assignment:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `${updatedCount} सभासदांची देखभाल श्रेणी यशस्वीरीत्या निश्चित केली (Categories assigned successfully for ${updatedCount} residents)`,
      updatedCount
    });
  } catch (error) {
    console.error('Error in batchAssignCategories:', error.message);
    return res.status(500).json({
      success: false,
      message: 'श्रेणी निश्चिती करताना त्रुटी आली (Failed to assign categories)'
    });
  }
};

