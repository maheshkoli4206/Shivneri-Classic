import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  recordPayment,
  getPayments,
  getPaymentById,
  downloadReceiptPDF,
  cancelPayment,
  getPaymentDashboardSummary,
  getReceiptByDueId,
  recordAdvancePayment,
  getAdvancePayments,
  getResidentAdvanceSummary,
  applyAdvanceToBill,
  cancelAdvancePayment,
  downloadAdvanceReceiptPDF,
  getAdvanceLedger,
  getResidentFinancialHistory
} from '../controllers/paymentController.js';
import { getMaintenanceDues } from '../controllers/maintenanceController.js';

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

// Validation for recording a regular payment
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
    .withMessage('जमा रक्कम किमान ₹०.०१ असावी (Amount must be at least ₹0.01)'),
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

// Validation for advance payment recording
const recordAdvanceValidation = [
  body('residentId')
    .notEmpty()
    .withMessage('सभासद निवडणे आवश्यक आहे (Resident is required)')
    .isMongoId()
    .withMessage('अवैध सभासद ओळख क्रमांक (Invalid resident ID)'),
  body('amountReceived')
    .notEmpty()
    .withMessage('अ‍ॅडव्हान्स रक्कम आवश्यक आहे (Amount is required)')
    .isFloat({ min: 1 })
    .withMessage('अ‍ॅडव्हान्स रक्कम किमान ₹1 असावी (Amount must be at least 1)'),
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
  handleValidationErrors
];

// Validation for applying advance to bill
const applyAdvanceValidation = [
  body('maintenanceDueId')
    .notEmpty()
    .withMessage('मासिक देयक निवडणे आवश्यक आहे (Maintenance due is required)')
    .isMongoId()
    .withMessage('अवैध मासिक देयक ओळख क्रमांक'),
  body('amountToApply')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('लागू करावयाची रक्कम शून्यापेक्षा जास्त असावी'),
  body('remarks')
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

// Advance payment endpoints (must precede /:id)
router.post('/advance', recordAdvanceValidation, recordAdvancePayment);
router.get('/advance', getAdvancePayments);
router.get('/advance/ledger', getAdvanceLedger);
router.get('/advance/resident/:residentId', getResidentAdvanceSummary);
router.post('/advance/apply', applyAdvanceValidation, applyAdvanceToBill);
router.get('/advance/:id/receipt-pdf', downloadAdvanceReceiptPDF);
router.patch('/advance/:id/cancel', cancelValidation, cancelAdvancePayment);

// Regular payment recording & dashboard endpoints
router.post('/record', recordPaymentValidation, recordPayment);
router.get('/dashboard/summary', getPaymentDashboardSummary);
router.get('/summary', getPaymentDashboardSummary);

// Resident financial history & maintenance dues endpoints
router.get('/resident/:residentId/history', getResidentFinancialHistory);
router.get('/resident/:residentId/dues', (req, res, next) => {
  req.query.residentId = req.params.residentId;
  return getMaintenanceDues(req, res, next);
});

// Dues receipt lookup & PDF
router.get('/due/:dueId/receipt', getReceiptByDueId);
router.get('/due/:id/receipt-pdf', downloadReceiptPDF);

// Payment history & search
router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.get('/:id/receipt-pdf', downloadReceiptPDF);
router.patch('/:id/cancel', cancelValidation, cancelPayment);

export default router;
