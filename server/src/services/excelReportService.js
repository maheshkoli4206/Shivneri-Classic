import ExcelJS from 'exceljs';
import {
  getDashboardOverview,
  getMaintenanceReport,
  getExpenseReport,
  getFinancialSummaryReport
} from './reportService.js';

export async function generateExcelReport(options = {}) {
  const { lang = 'mr', year, month, startDate, endDate } = options;
  const isMr = lang === 'mr';

  const [overviewData, maintenanceData, expenseData, financialData] = await Promise.all([
    getDashboardOverview({ year, month, startDate, endDate }),
    getMaintenanceReport({ year, month }),
    getExpenseReport({ year, month, startDate, endDate }),
    getFinancialSummaryReport({ year, month, startDate, endDate })
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shivneri Classic Apartment - A Wing (Shri Laxman Koli)';
  workbook.created = new Date();

  // Helper styles
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE65100' } // Deep Orange
  };
  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };
  const fontBoldWhite = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
  const fontTitle = { bold: true, size: 14, color: { argb: 'FF1E293B' }, name: 'Arial' };
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // =========================================================================
  // SHEET 1: EXECUTIVE FINANCIAL SUMMARY & CASHBOOK
  // =========================================================================
  const wsSummary = workbook.addWorksheet(isMr ? 'वित्तीय ताळेबंद' : 'Financial Summary');
  wsSummary.columns = [
    { key: 'col1', width: 28 },
    { key: 'col2', width: 22 },
    { key: 'col3', width: 20 },
    { key: 'col4', width: 20 },
    { key: 'col5', width: 20 }
  ];

  // Header Banner
  wsSummary.mergeCells('A1:E1');
  const titleCell = wsSummary.getCell('A1');
  titleCell.value = 'शिवनेरी क्लासिक अपार्टमेंट - ए विंग (Shivneri Classic Apartment – A Wing)';
  titleCell.font = fontTitle;
  titleCell.alignment = { horizontal: 'center' };

  wsSummary.mergeCells('A2:E2');
  const subCell = wsSummary.getCell('A2');
  subCell.value = 'औरंगाबाद रोड, पंचवटी, नाशिक - ४२२००३ | अधिकृत वित्तीय अहवाल (Official Financial Report)';
  subCell.alignment = { horizontal: 'center' };
  subCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

  wsSummary.mergeCells('A3:E3');
  const genCell = wsSummary.getCell('A3');
  genCell.value = `अहवाल दिनांक: ${new Date().toLocaleDateString('en-GB')} | अधिकृत स्वाक्षरी: श्री ल.रा. कोळी (अध्यक्ष / सचिव)`;
  genCell.alignment = { horizontal: 'center' };
  genCell.font = { bold: true, size: 9, color: { argb: 'FF334155' } };

  wsSummary.addRow([]); // Blank row

  // KPI Overview Section
  wsSummary.addRow([isMr ? '१. मुख्य आर्थिक निर्देशांक (Key Financial KPIs)' : '1. Key Financial KPIs']).font = { bold: true, size: 11 };
  wsSummary.addRow([
    isMr ? 'आर्थिक बाब (Metric)' : 'Metric',
    isMr ? 'रक्कम (Amount in ₹)' : 'Amount (₹)',
    isMr ? 'तपशील (Remarks)' : 'Remarks'
  ]);
  const kpiHRow = wsSummary.getRow(6);
  kpiHRow.eachCell((cell, num) => {
    if (num <= 3) {
      cell.fill = subHeaderFill;
      cell.font = fontBoldWhite;
    }
  });

  const ov = overviewData.overview;
  const kpiData = [
    [isMr ? 'एकूण देखभाल आकारणी (Total Billed)' : 'Total Billed', ov.totalBilled, isMr ? '१६ मूळ सभासदांची आकारणी' : '16 Residents billed at ₹1,000/mo'],
    [isMr ? 'एकूण वसूल देखभाल (Total Collected)' : 'Total Collected', ov.totalCollected, isMr ? 'अधिकृत पावत्यांनुसार जमा' : 'Collected via official receipts'],
    [isMr ? 'थकीत येणेबाकी (Outstanding Dues)' : 'Outstanding Dues', ov.totalOutstanding, isMr ? 'प्रलंबित थकबाकी' : 'Pending resident dues'],
    [isMr ? 'वसुली टक्केवारी (Collection Rate)' : 'Collection Rate', `${ov.collectionPercentage}%`, isMr ? 'एकूण आकारणीच्या तुलनेत' : 'Percentage of total billed'],
    [isMr ? 'एकूण मंजूर खर्च (Total Expenses)' : 'Total Expenses', ov.totalExpenses, isMr ? 'मान्य व्हाउचर्सनुसार खर्च' : 'Approved vouchers (excluding cancelled)'],
    [isMr ? 'निव्वळ शिल्लक / तूट (Net Surplus/Deficit)' : 'Net Surplus/Deficit', ov.netSurplusDeficit, isMr ? 'जमा वजा खर्च निव्वळ फरक' : 'Total collected minus total expenses']
  ];

  kpiData.forEach(row => {
    const r = wsSummary.addRow(row);
    r.getCell(2).numFmt = typeof row[1] === 'number' ? '₹#,##0.00' : '@';
    r.eachCell(c => c.border = borderThin);
  });

  wsSummary.addRow([]);

  // Segregated Mode-Wise Cashbook Balances Section
  wsSummary.addRow([isMr ? '२. साधननिहाय स्वतंत्र कॅशबुक ताळेबंद (Strictly Segregated Mode-Wise Balances)' : '2. Mode-Wise Segregated Balances']).font = { bold: true, size: 11 };
  const modeHeaders = [
    isMr ? 'पेमेंट साधन (Payment Mode)' : 'Payment Mode',
    isMr ? 'आरंभी शिल्लक (Opening ₹)' : 'Opening Balance (₹)',
    isMr ? 'एकूण जमा (Inflow ₹)' : 'Income Inflow (₹)',
    isMr ? 'एकूण खर्च (Outflow ₹)' : 'Expense Outflow (₹)',
    isMr ? 'अखेर शिल्लक (Closing ₹)' : 'Closing Balance (₹)'
  ];
  wsSummary.addRow(modeHeaders);
  const modeHRow = wsSummary.getRow(15);
  modeHRow.eachCell(c => {
    c.fill = headerFill;
    c.font = fontBoldWhite;
  });

  const mw = financialData.modeWise;
  const modeRows = [
    [isMr ? 'रोख वही (Physical Cash)' : 'Physical Cash', mw.CASH.opening, mw.CASH.income, mw.CASH.expense, mw.CASH.closing],
    [isMr ? 'बँक खाते (Bank Transfer)' : 'Bank Transfer', mw.BANK_TRANSFER.opening, mw.BANK_TRANSFER.income, mw.BANK_TRANSFER.expense, mw.BANK_TRANSFER.closing],
    [isMr ? 'यूपीआय (UPI / PhonePe / GPay)' : 'UPI', mw.UPI.opening, mw.UPI.income, mw.UPI.expense, mw.UPI.closing],
    [isMr ? 'धनादेश (Cheque)' : 'Cheque', mw.CHEQUE.opening, mw.CHEQUE.income, mw.CHEQUE.expense, mw.CHEQUE.closing]
  ];

  modeRows.forEach(row => {
    const r = wsSummary.addRow(row);
    for (let i = 2; i <= 5; i++) {
      r.getCell(i).numFmt = '₹#,##0.00';
    }
    r.eachCell(c => c.border = borderThin);
  });

  // Total Mode Row
  const totalModeRow = wsSummary.addRow([
    isMr ? 'एकूण ताळेबंद योग (Combined Total)' : 'Combined Total',
    financialData.totals.totalOpeningBalance,
    financialData.totals.totalIncome,
    financialData.totals.totalExpenses,
    financialData.totals.totalClosingBalance
  ]);
  totalModeRow.font = { bold: true };
  for (let i = 2; i <= 5; i++) {
    totalModeRow.getCell(i).numFmt = '₹#,##0.00';
  }
  totalModeRow.eachCell(c => c.border = borderThin);

  // =========================================================================
  // SHEET 2: MONTH-WISE MAINTENANCE COLLECTIONS
  // =========================================================================
  const wsMaint = workbook.addWorksheet(isMr ? 'देखभाल देयक अहवाल' : 'Maintenance Collections');
  wsMaint.columns = [
    { key: 'year', width: 10 },
    { key: 'month', width: 18 },
    { key: 'billed', width: 18 },
    { key: 'paid', width: 18 },
    { key: 'outstanding', width: 18 },
    { key: 'colPct', width: 16 },
    { key: 'paidCount', width: 14 },
    { key: 'partCount', width: 14 },
    { key: 'unpaidCount', width: 14 }
  ];

  wsMaint.addRow([isMr ? 'शिवनेरी क्लासिक - मासिक देखभाल वसुली अहवाल' : 'Monthly Maintenance Collection Report']).font = fontTitle;
  wsMaint.addRow([
    isMr ? 'वर्ष (Year)' : 'Year',
    isMr ? 'महिना (Month)' : 'Month',
    isMr ? 'आकारणी (Billed ₹)' : 'Billed (₹)',
    isMr ? 'वसुली (Collected ₹)' : 'Collected (₹)',
    isMr ? 'थकबाकी (Outstanding ₹)' : 'Outstanding (₹)',
    isMr ? 'वसुली %' : 'Collection %',
    isMr ? 'पूर्ण भरलेली देयके' : 'Paid Count',
    isMr ? 'अंशतः देयके' : 'Partial Count',
    isMr ? 'थकीत देयके' : 'Unpaid Count'
  ]);
  const maintHRow = wsMaint.getRow(2);
  maintHRow.eachCell(c => {
    c.fill = headerFill;
    c.font = fontBoldWhite;
  });

  maintenanceData.monthWiseCollections.forEach(m => {
    const r = wsMaint.addRow([
      m.year,
      isMr ? m.monthNameMarathi : m.monthNameEnglish,
      m.totalBilled,
      m.totalPaid,
      m.totalOutstanding,
      `${m.collectionPercentage}%`,
      m.paidCount,
      m.partialCount,
      m.unpaidCount
    ]);
    r.getCell(3).numFmt = '₹#,##0.00';
    r.getCell(4).numFmt = '₹#,##0.00';
    r.getCell(5).numFmt = '₹#,##0.00';
    r.eachCell(c => c.border = borderThin);
  });

  // =========================================================================
  // SHEET 3: RESIDENT-WISE DUES ROSTER (16 APPROVED MEMBERS)
  // =========================================================================
  const wsResidents = workbook.addWorksheet(isMr ? 'सभासद येणेबाकी' : 'Resident Dues Roster');
  wsResidents.columns = [
    { key: 'sr', width: 8 },
    { key: 'flat', width: 14 },
    { key: 'name', width: 30 },
    { key: 'mobile', width: 16 },
    { key: 'billed', width: 18 },
    { key: 'paid', width: 18 },
    { key: 'due', width: 18 },
    { key: 'status', width: 18 }
  ];

  wsResidents.addRow([isMr ? 'शिवनेरी क्लासिक - १६ मूळ सभासद देयके व येणेबाकी नोंदवही' : 'Approved 16 Residents Dues & Payments Roster']).font = fontTitle;
  wsResidents.addRow([
    isMr ? 'अ.क्र.' : 'Sr.No.',
    isMr ? 'सदनिका क्र.' : 'Flat No.',
    isMr ? 'सभासदाचे नाव (Marathi Name)' : 'Member Name',
    isMr ? 'संपर्क क्र.' : 'Mobile',
    isMr ? 'एकूण आकारणी (Billed ₹)' : 'Total Billed (₹)',
    isMr ? 'एकूण जमा (Paid ₹)' : 'Total Paid (₹)',
    isMr ? 'थकबाकी (Outstanding ₹)' : 'Outstanding (₹)',
    isMr ? 'स्थिती (Status)' : 'Status'
  ]);
  const resHRow = wsResidents.getRow(2);
  resHRow.eachCell(c => {
    c.fill = headerFill;
    c.font = fontBoldWhite;
  });

  maintenanceData.residentSummaries.forEach((res, idx) => {
    const statusText = res.overallStatus === 'CLEARED'
      ? (isMr ? 'थकबाकी शून्य (Cleared)' : 'Cleared')
      : res.overallStatus === 'PARTIAL'
      ? (isMr ? 'अंशतः थकीत (Partial)' : 'Partial')
      : (isMr ? 'पूर्ण थकीत (Pending)' : 'Pending');

    const r = wsResidents.addRow([
      idx + 1,
      `${res.wing}-${res.flatNumber}`,
      res.fullNameMarathi,
      res.mobileNumber,
      res.totalBilled,
      res.totalPaid,
      res.totalOutstanding,
      statusText
    ]);
    r.getCell(5).numFmt = '₹#,##0.00';
    r.getCell(6).numFmt = '₹#,##0.00';
    r.getCell(7).numFmt = '₹#,##0.00';
    r.eachCell(c => c.border = borderThin);
  });

  // =========================================================================
  // SHEET 4: EXPENSES REGISTER & CATEGORY BREAKDOWN
  // =========================================================================
  const wsExpense = workbook.addWorksheet(isMr ? 'सोसायटी खर्च तपशील' : 'Expense Details');
  wsExpense.columns = [
    { key: 'voucher', width: 18 },
    { key: 'date', width: 14 },
    { key: 'cat', width: 22 },
    { key: 'title', width: 32 },
    { key: 'payee', width: 24 },
    { key: 'method', width: 18 },
    { key: 'ref', width: 20 },
    { key: 'amount', width: 18 }
  ];

  wsExpense.addRow([isMr ? 'शिवनेरी क्लासिक - अधिकृत खर्च व्हाउचर नोंदवही (EXP-YYYYMM-XXXX)' : 'Official Expense Register']).font = fontTitle;
  wsExpense.addRow([
    isMr ? 'व्हाउचर क्र.' : 'Voucher No.',
    isMr ? 'दिनांक' : 'Date',
    isMr ? 'खर्च वर्गवारी' : 'Category',
    isMr ? 'खर्चाचे शीर्षक' : 'Expense Title',
    isMr ? 'पैसे स्वीकारणारे' : 'Payee / Vendor',
    isMr ? 'पेमेंट पद्धत' : 'Payment Method',
    isMr ? 'संदर्भ / धनादेश क्र.' : 'Reference',
    isMr ? 'रक्कम (Amount ₹)' : 'Amount (₹)'
  ]);
  const expHRow = wsExpense.getRow(2);
  expHRow.eachCell(c => {
    c.fill = headerFill;
    c.font = fontBoldWhite;
  });

  expenseData.activeExpensesList.forEach(e => {
    const formattedDate = new Date(e.expenseDate).toLocaleDateString('en-GB');
    const r = wsExpense.addRow([
      e.voucherNumber,
      formattedDate,
      e.category,
      e.titleMarathi || e.titleEnglish,
      e.payeeName,
      e.paymentMethod,
      e.transactionRef || '-',
      e.amount
    ]);
    r.getCell(8).numFmt = '₹#,##0.00';
    r.eachCell(c => c.border = borderThin);
  });

  // =========================================================================
  // SHEET 5: AUDITED CANCELLED RECORDS HISTORY
  // =========================================================================
  const wsCancelled = workbook.addWorksheet(isMr ? 'रद्दबातल नोंदी (Audit)' : 'Cancelled History');
  wsCancelled.columns = [
    { key: 'type', width: 16 },
    { key: 'docNo', width: 20 },
    { key: 'amount', width: 18 },
    { key: 'date', width: 16 },
    { key: 'reason', width: 38 },
    { key: 'cancelledBy', width: 24 }
  ];

  wsCancelled.addRow([isMr ? 'शिवनेरी क्लासिक - रद्दबातल केलेल्या पावत्या व व्हाउचर्सचा ऑडिट इतिहास' : 'Audited Cancelled Records History']).font = fontTitle;
  wsCancelled.addRow([
    isMr ? 'प्रकार (Type)' : 'Record Type',
    isMr ? 'दस्तऐवज क्र. (Doc No.)' : 'Document No.',
    isMr ? 'रक्कम (Amount ₹)' : 'Amount (₹)',
    isMr ? 'रद्द दिनांक' : 'Cancelled Date',
    isMr ? 'रद्द करण्याचे कारण (Reason)' : 'Cancellation Reason',
    isMr ? 'रद्द करणारे प्रशासक' : 'Cancelled By'
  ]);
  const cancHRow = wsCancelled.getRow(2);
  cancHRow.eachCell(c => {
    c.fill = subHeaderFill;
    c.font = fontBoldWhite;
  });

  expenseData.cancelledExpenses.vouchers.forEach(e => {
    const cDate = e.cancelledAt ? new Date(e.cancelledAt).toLocaleDateString('en-GB') : '-';
    const r = wsCancelled.addRow([
      isMr ? 'खर्च व्हाउचर' : 'Expense Voucher',
      e.voucherNumber,
      e.amount,
      cDate,
      e.cancellationReason || '-',
      'श्री ल.रा. कोळी'
    ]);
    r.getCell(3).numFmt = '₹#,##0.00';
    r.eachCell(c => c.border = borderThin);
  });

  return await workbook.xlsx.writeBuffer();
}
