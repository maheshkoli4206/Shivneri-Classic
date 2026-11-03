import {
  getDashboardOverview,
  getMaintenanceReport,
  getExpenseReport,
  getFinancialSummaryReport,
  getChartsData
} from '../services/reportService.js';
import { generateExcelReport } from '../services/excelReportService.js';
import { generateFinancialReportPDF } from '../services/pdfReportService.js';

/**
 * GET /api/v1/reports/overview
 * Executive summary KPI metrics for reports dashboard
 */
export const getOverview = async (req, res) => {
  try {
    const data = await getDashboardOverview(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getOverview report:', error.message);
    return res.status(500).json({
      success: false,
      message: 'आर्थिक गोषवारा लोड करताना त्रुटी आली (Failed to fetch financial overview)'
    });
  }
};

/**
 * GET /api/v1/reports/maintenance
 * Comprehensive maintenance collection, month-wise, and resident dues reports
 */
export const getMaintenanceReportData = async (req, res) => {
  try {
    const data = await getMaintenanceReport(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getMaintenanceReport:', error.message);
    return res.status(500).json({
      success: false,
      message: 'देखभाल अहवाल लोड करताना त्रुटी आली (Failed to fetch maintenance report)'
    });
  }
};

/**
 * GET /api/v1/reports/expenses
 * Category-wise, month-wise, mode-wise, payee-wise, and cancelled expense reports
 */
export const getExpenseReportData = async (req, res) => {
  try {
    const data = await getExpenseReport(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getExpenseReport:', error.message);
    return res.status(500).json({
      success: false,
      message: 'खर्च अहवाल लोड करताना त्रुटी आली (Failed to fetch expense report)'
    });
  }
};

/**
 * GET /api/v1/reports/financial-summary
 * Mode-wise cashbook summary and annual performance matrix
 */
export const getFinancialSummary = async (req, res) => {
  try {
    const data = await getFinancialSummaryReport(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getFinancialSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'वित्तीय ताळेबंद लोड करताना त्रुटी आली (Failed to fetch financial summary)'
    });
  }
};

/**
 * GET /api/v1/reports/charts
 * Visual analytics time series and distributions
 */
export const getCharts = async (req, res) => {
  try {
    const data = await getChartsData(req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getCharts:', error.message);
    return res.status(500).json({
      success: false,
      message: 'आलेख माहिती लोड करताना त्रुटी आली (Failed to fetch charts data)'
    });
  }
};

/**
 * GET /api/v1/reports/export/excel
 * Export full multi-sheet Excel (.xlsx) financial workbook
 */
export const exportExcel = async (req, res) => {
  try {
    const buffer = await generateExcelReport(req.query);
    const filename = `Shivneri-Classic-Financial-Report-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error exporting Excel report:', error.message);
    return res.status(500).json({
      success: false,
      message: 'एक्सेल अहवाल तयार करताना त्रुटी आली (Failed to export Excel report)'
    });
  }
};

/**
 * GET /api/v1/reports/export/pdf
 * Export official society financial report PDF with Devanagari font support
 */
export const exportPdf = async (req, res) => {
  try {
    const buffer = await generateFinancialReportPDF(req.query);
    const filename = `Shivneri-Classic-Financial-Report-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error exporting PDF report:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पीडीएफ अहवाल तयार करताना त्रुटी आली (Failed to export PDF report)'
    });
  }
};
