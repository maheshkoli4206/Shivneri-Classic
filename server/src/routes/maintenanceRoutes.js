import { Router } from 'express';
import { body } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  getMaintenanceConfig,
  updateMaintenanceConfig,
  previewMonthlyGeneration,
  generateMonthlyDues,
  getMaintenanceDues,
  getMaintenanceDueById,
  getMaintenanceSummary
} from '../controllers/maintenanceController.js';

const router = Router();

// Protect ALL maintenance routes with Super Admin authentication
router.use(requireAdminAuth);

// Validation for updating maintenance configuration
const configValidation = [
  body('defaultMonthlyAmount')
    .notEmpty()
    .withMessage('देखभाल रक्कम आवश्यक आहे (Default monthly amount is required)')
    .isFloat({ min: 0 })
    .withMessage('देखभाल रक्कम ० किंवा जास्त असावी (Amount must be 0 or greater)'),
  body('dueDay')
    .optional()
    .isInt({ min: 1, max: 28 })
    .withMessage('देय दिवस १ ते २८ दरम्यान असावा (Due day must be between 1 and 28)'),
  body('lateFeeEnabled')
    .optional()
    .isBoolean(),
  body('lateFeeAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('विलंब शुल्क ० किंवा जास्त असावे')
];

// Validation for generating monthly dues
const generateValidation = [
  body('month')
    .notEmpty()
    .withMessage('महिना आवश्यक आहे (Month is required)')
    .isInt({ min: 1, max: 12 })
    .withMessage('महिना १ ते १२ दरम्यान असावा (Month must be 1 to 12)'),
  body('year')
    .notEmpty()
    .withMessage('वर्ष आवश्यक आहे (Year is required)')
    .isInt({ min: 2020 })
    .withMessage('अवैध वर्ष (Year must be 2020 or later)')
];

// Configuration endpoints
router.get('/config', getMaintenanceConfig);
router.put('/config', configValidation, updateMaintenanceConfig);

// Monthly generation workflow endpoints
router.get('/preview', previewMonthlyGeneration);
router.post('/generate', generateValidation, generateMonthlyDues);

// Dues management & summary endpoints
router.get('/dues', getMaintenanceDues);
router.get('/dues/:id', getMaintenanceDueById);
router.get('/summary', getMaintenanceSummary);

export default router;
