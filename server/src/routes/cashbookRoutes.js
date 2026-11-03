import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  getCashbook,
  getOpeningBalance,
  updateOpeningBalance
} from '../controllers/cashbookController.js';

const router = Router();

// Protect ALL cashbook routes with Super Admin authentication
router.use(requireAdminAuth);

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

const openingBalanceValidation = [
  body('cashAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('रोख रक्कम ० किंवा जास्त असावी'),
  body('bankAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('बँक रक्कम ० किंवा जास्त असावी'),
  body('upiAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('यूपीआय रक्कम ० किंवा जास्त असावी'),
  body('chequeAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('धनादेश रक्कम ० किंवा जास्त असावी'),
  body('effectiveDate')
    .optional()
    .isISO8601()
    .withMessage('अवैध दिनांक'),
  handleValidationErrors
];

// Routes
router.get('/', getCashbook);
router.get('/opening-balance', getOpeningBalance);
router.put('/opening-balance', openingBalanceValidation, updateOpeningBalance);

export default router;
