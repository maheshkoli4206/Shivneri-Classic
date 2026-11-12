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
  body('categoryRates')
    .optional()
    .isObject()
    .withMessage('श्रेणीनिहाय दर ऑब्जेक्ट स्वरूपात असावेत (categoryRates must be an object)'),
  body('categoryRates.residential')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('निवासी दर ० किंवा जास्त असावा (Residential rate must be 0 or greater)'),
  body('categoryRates.shop')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('दुकान दर ० किंवा जास्त असावा (Shop rate must be 0 or greater)'),
  body('categoryRates.chairman')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('चेअरमन दर ० किंवा जास्त असावा (Chairman rate must be 0 or greater)'),
  body('defaultMonthlyAmount')
    .optional()
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
    .withMessage('अवैध वर्ष (Year must be 2020 or later)'),
  body('billingItems')
    .optional()
    .isArray()
    .withMessage('billingItems must be an array'),
  body('billingItems.*.residentId')
    .optional()
    .isMongoId()
    .withMessage('अवैध सभासद ओळख क्रमांक (Invalid residentId)'),
  body('billingItems.*.appliedAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('रक्कम ० किंवा जास्त असावी (Amount must be 0 or greater)'),
  body('billingItems.*.selected')
    .optional()
    .isBoolean(),
  body('billingItems.*.actionType')
    .optional()
    .isIn(['FULL', 'REDUCED', 'ZERO', 'SKIP']),
  body('billingItems.*.overrideReason')
    .optional()
    .trim()
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
router.get('/resident/:residentId/dues', (req, res, next) => {
  req.query.residentId = req.params.residentId;
  return getMaintenanceDues(req, res, next);
});
router.get('/summary', getMaintenanceSummary);

export default router;

