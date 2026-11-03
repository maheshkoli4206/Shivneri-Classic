import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Resident from '../models/Resident.js';

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

