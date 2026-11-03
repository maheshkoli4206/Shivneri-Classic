import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  cancelExpense,
  getCategories,
  addCategory
} from '../controllers/expenseController.js';

const router = Router();

// Protect ALL expense routes with Super Admin authentication
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

// Validation for creating an expense
const createExpenseValidation = [
  body('titleMarathi')
    .notEmpty()
    .withMessage('खर्चाचे मराठी शीर्षक आवश्यक आहे (Expense title is required)')
    .trim(),
  body('category')
    .notEmpty()
    .withMessage('खर्च वर्गवारी आवश्यक आहे (Category is required)')
    .trim(),
  body('amount')
    .notEmpty()
    .withMessage('खर्च रक्कम आवश्यक आहे (Amount is required)')
    .isFloat({ min: 0.01 })
    .withMessage('खर्च रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('पेमेंट पद्धत आवश्यक आहे (Payment method is required)')
    .isIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'])
    .withMessage('अवैध पेमेंट पद्धत (Invalid payment method)'),
  body('payeeName')
    .notEmpty()
    .withMessage('पैसे स्वीकारणाऱ्याचे / विक्रेत्याचे नाव आवश्यक आहे (Payee name is required)')
    .trim(),
  body('expenseDate')
    .optional()
    .isISO8601()
    .withMessage('अवैध खर्च दिनांक (Invalid expense date)'),
  handleValidationErrors
];

// Validation for cancelling an expense
const cancelExpenseValidation = [
  param('id')
    .isMongoId()
    .withMessage('अवैध खर्च ओळख क्रमांक'),
  body()
    .custom((val, { req }) => {
      const reason = req.body.cancellationReason || req.body.reason;
      if (!reason || String(reason).trim().length < 5) {
        throw new Error('रद्द करण्याचे कारण आवश्यक असून किमान ५ अक्षरे असावे (Cancellation reason min 5 chars required)');
      }
      return true;
    }),
  handleValidationErrors
];

// Routes
router.post('/', createExpenseValidation, createExpense);
router.get('/', getExpenses);
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.get('/:id', getExpenseById);
router.patch('/:id/cancel', cancelExpenseValidation, cancelExpense);
router.put('/:id/cancel', cancelExpenseValidation, cancelExpense);

export default router;
