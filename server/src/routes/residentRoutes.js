import { Router } from 'express';
import { body } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  getResidents,
  getResidentById,
  createResident,
  updateResident,
  updateResidentStatus,
  getCategorySummary,
  batchAssignCategories
} from '../controllers/residentController.js';

const router = Router();

// Protect ALL resident endpoints with Super Admin authentication
router.use(requireAdminAuth);

// Category endpoints (must precede /:id to avoid ID pattern match)
// GET /api/v1/residents/category-summary
router.get('/category-summary', getCategorySummary);

// PUT /api/v1/residents/batch-categories
router.put('/batch-categories', batchAssignCategories);

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
    .withMessage('कृपया वैध ईमेल पत्ता प्रविष्ट करा (Please provide a valid email)'),
  body('propertyType')
    .optional()
    .isIn(['RESIDENTIAL_FLAT', 'SHOP'])
    .withMessage('अवैध मालमत्ता प्रकार (Invalid property type)'),
  body('maintenanceCategory')
    .optional()
    .isIn(['RESIDENTIAL', 'SHOP', 'CHAIRMAN', 'UNASSIGNED'])
    .withMessage('अवैध देखभाल श्रेणी (Invalid maintenance category)'),
  body('customMaintenanceAmount')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('विशेष देखभाल रक्कम ० किंवा जास्त असावी (Custom amount must be 0 or greater)')
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

