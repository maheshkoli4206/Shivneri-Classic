import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { requireAdminAuth } from '../middleware/authMiddleware.js';
import {
  getOverview,
  getMaintenanceReportData,
  getExpenseReportData,
  getFinancialSummary,
  getCharts,
  exportExcel,
  exportPdf
} from '../controllers/reportController.js';

const router = Router();

// Protect ALL report endpoints with Super Admin authentication
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

const filterValidation = [
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2050 })
    .withMessage('अवैध वर्ष (Invalid year format)'),
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('अवैध महिना (Month must be between 1 and 12)'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('अवैध आरंभ दिनांक (Invalid startDate format)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('अवैध अखेर दिनांक (Invalid endDate format)'),
  handleValidationErrors
];

// Routes
router.get('/overview', filterValidation, getOverview);
router.get('/maintenance', filterValidation, getMaintenanceReportData);
router.get('/expenses', filterValidation, getExpenseReportData);
router.get('/financial-summary', filterValidation, getFinancialSummary);
router.get('/charts', filterValidation, getCharts);
router.get('/export/excel', filterValidation, exportExcel);
router.get('/export/pdf', filterValidation, exportPdf);

export default router;
