import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  recordPayment,
  getPayments,
  getPaymentById,
  downloadReceiptPDF,
  cancelPayment,
  getPaymentDashboardSummary
} from '../controllers/paymentController.js';

const router = Router();

// Strict Super Admin protection on all payment endpoints
router.use(requireAdminAuth);

// Helper middleware to handle express-validator results
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

// Validation for recording a payment
const recordPaymentValidation = [
  body('maintenanceDueId')
    .notEmpty()
    .withMessage('मासिक देयक संदर्भ आवश्यक आहे (Maintenance due ID is required)')
    .isMongoId()
    .withMessage('अवैध मासिक देयक आयडी (Invalid due ID)'),
  body('amountReceived')
    .notEmpty()
    .withMessage('जमा रक्कम आवश्यक आहे (Amount is required)')
    .isFloat({ min: 0.01 })
    .withMessage('जमा रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('पेमेंट पद्धत आवश्यक आहे (Payment method is required)')
    .isIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'])
    .withMessage('अवैध पेमेंट पद्धत (Invalid payment method)'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('अवैध पेमेंट तारीख (Invalid payment date)'),
  body('transactionRef')
    .optional()
    .trim(),
  body('remarks')
    .optional()
    .trim(),
  body('idempotencyKey')
    .optional()
    .trim(),
  handleValidationErrors
];

// Validation for payment cancellation
const cancelValidation = [
  param('id')
    .isMongoId()
    .withMessage('अवैध पेमेंट ओळख क्रमांक'),
  body('cancellationReason')
    .notEmpty()
    .withMessage('रद्द करण्याचे कारण आवश्यक आहे (Cancellation reason is required)')
    .isLength({ min: 5 })
    .withMessage('रद्द करण्याचे कारण किमान ५ अक्षरे असावे'),
  handleValidationErrors
];

// Payment recording & dashboard endpoints
router.post('/record', recordPaymentValidation, recordPayment);
router.get('/dashboard/summary', getPaymentDashboardSummary);

// Payment history & search
router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.get('/:id/receipt-pdf', downloadReceiptPDF);
router.patch('/:id/cancel', cancelValidation, cancelPayment);

export default router;
