import { Router } from 'express';
import { body } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  getResidents,
  getResidentById,
  createResident,
  updateResident,
  updateResidentStatus
} from '../controllers/residentController.js';

const router = Router();

// Protect ALL resident endpoints with Super Admin authentication
router.use(requireAdminAuth);

// Validation for creating/updating a resident
const residentValidation = [
  body('fullNameMarathi')
    .trim()
    .notEmpty()
    .withMessage('मराठी पूर्ण नाव आवश्यक आहे (Full Marathi name is required)')
    .isLength({ min: 2, max: 100 })
    .withMessage('नाव २ ते १०० अक्षरांच्या दरम्यान असावे (Name must be between 2 and 100 characters)'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('कृपया वैध ईमेल पत्ता प्रविष्ट करा (Please provide a valid email)')
];

// GET /api/v1/residents
router.get('/', getResidents);

// GET /api/v1/residents/:id
router.get('/:id', getResidentById);

// POST /api/v1/residents
router.post('/', residentValidation, createResident);

// PUT /api/v1/residents/:id
router.put('/:id', residentValidation, updateResident);

// PATCH /api/v1/residents/:id/status
router.patch('/:id/status', updateResidentStatus);

export default router;
