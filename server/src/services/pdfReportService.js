import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getDashboardOverview,
  getMaintenanceReport,
  getExpenseReport,
  getFinancialSummaryReport
} from './reportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANGAL_FONT_PATH = path.resolve(__dirname, '../assets/fonts/mangal.ttf');

export async function generateFinancialReportPDF(options = {}) {
  const { lang = 'mr', year, month, startDate, endDate } = options;
  const isMr = lang === 'mr';

  const [overviewData, maintenanceData, expenseData, financialData] = await Promise.all([
    getDashboardOverview({ year, month, startDate, endDate }),
    getMaintenanceReport({ year, month }),
    getExpenseReport({ year, month, startDate, endDate }),
    getFinancialSummaryReport({ year, month, startDate, endDate })
  ]);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 36,
        info: {
          Title: 'Shivneri-Classic-Financial-Report',
          Author: 'Shivneri Classic Apartment - A Wing'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Register bundled authentic Devanagari font
      if (fs.existsSync(MANGAL_FONT_PATH)) {
        doc.font(MANGAL_FONT_PATH);
      } else if (fs.existsSync('C:/Windows/Fonts/mangal.ttf')) {
        doc.font('C:/Windows/Fonts/mangal.ttf');
      }

      // Outer Decorative Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(1)
        .strokeColor('#ea580c')
        .stroke();

      // Header Banner
      doc.fontSize(16).fillColor('#1e293b')
        .text('शिवनेरी क्लासिक अपार्टमेंट (ए विंग)', { align: 'center' });
      doc.fontSize(9).fillColor('#ea580c')
        .text('Shivneri Classic Apartment – A Wing • औरंगाबाद रोड, पंचवटी, नाशिक - ४२२००३', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#334155')
        .text(isMr ? 'अधिकृत वार्षिक व मासिक वित्तीय अहवाल' : 'Official Financial & Audit Report', { align: 'center' });

      doc.moveDown(0.5);
      doc.strokeColor('#cbd5e1').lineWidth(0.5)
        .moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).stroke();
      doc.moveDown(0.6);

      // Report Meta Information
      const reportDateStr = new Date().toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
      const filterYearStr = year ? `${year}` : (isMr ? 'सर्व वर्षे' : 'All Years');
      doc.fontSize(8.5).fillColor('#475569');
      doc.text(`${isMr ? 'कालावधी / वर्ष' : 'Period / Year'}: ${filterYearStr}     |     ${isMr ? 'अहवाल निर्मिती दिनांक' : 'Generated On'}: ${reportDateStr}     |     ${isMr ? 'अधिकृत स्वाक्षरीकर्ता' : 'Authority'}: श्री ल.रा. कोळी`, { align: 'center' });
      doc.moveDown(0.8);

      // Section 1: Executive KPI Overview Table
      const ov = overviewData.overview;
      doc.fontSize(10).fillColor('#ea580c')
        .text(isMr ? '१. मुख्य आर्थिक निष्कर्ष (Executive Financial Summary)' : '1. Executive Financial Summary');
      doc.moveDown(0.4);

      const tableTop = doc.y;
      const leftColX = 40;
      const midColX = 300;
      const rowHeight = 16;

      const kpis = [
        [isMr ? 'एकूण देखभाल आकारणी (Total Billed):' : 'Total Billed:', `Rs. ${ov.totalBilled.toLocaleString('en-IN')}`],
        [isMr ? 'एकूण वसूल देखभाल (Total Collected):' : 'Total Collected:', `Rs. ${ov.totalCollected.toLocaleString('en-IN')}`],
        [isMr ? 'थकीत येणेबाकी (Outstanding Dues):' : 'Outstanding Dues:', `Rs. ${ov.totalOutstanding.toLocaleString('en-IN')}`],
        [isMr ? 'वसुली टक्केवारी (Collection Rate):' : 'Collection Rate:', `${ov.collectionPercentage}%`],
        [isMr ? 'एकूण मंजूर खर्च (Total Expenses):' : 'Total Expenses:', `Rs. ${ov.totalExpenses.toLocaleString('en-IN')}`],
        [isMr ? 'निव्वळ शिल्लक / तूट (Net Surplus/Deficit):' : 'Net Surplus/Deficit:', `Rs. ${ov.netSurplusDeficit.toLocaleString('en-IN')}`]
      ];

      kpis.forEach((item, idx) => {
        const y = tableTop + (idx * rowHeight);
        doc.rect(leftColX, y, 480, rowHeight)
          .fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff').fill();

        doc.fillColor('#334155').fontSize(8.5)
          .text(item[0], leftColX + 8, y + 3);
        doc.fillColor('#0f172a').fontSize(8.5)
          .text(item[1], midColX, y + 3, { align: 'right', width: 210 });
      });

      doc.y = tableTop + (kpis.length * rowHeight) + 12;

      // Section 2: Mode-Wise Segregated Balances
      doc.fontSize(10).fillColor('#ea580c')
        .text(isMr ? '२. साधननिहाय स्वतंत्र कॅशबुक ताळेबंद (Mode-Wise Cashbook Balances)' : '2. Segregated Cashbook Balances');
      doc.moveDown(0.4);

      const mw = financialData.modeWise;
      const modeTableTop = doc.y;
      const colWidths = [120, 90, 90, 90, 90];
      const colX = [40, 160, 250, 340, 430];

      // Header row
      doc.rect(40, modeTableTop, 480, 18).fillColor('#1e293b').fill();
      doc.fillColor('#ffffff').fontSize(8);
      doc.text(isMr ? 'साधन (Mode)' : 'Mode', colX[0] + 4, modeTableTop + 4);
      doc.text(isMr ? 'आरंभी शिल्लक' : 'Opening', colX[1], modeTableTop + 4, { align: 'right', width: colWidths[1] - 4 });
      doc.text(isMr ? 'जमा (In)' : 'Inflow', colX[2], modeTableTop + 4, { align: 'right', width: colWidths[2] - 4 });
      doc.text(isMr ? 'खर्च (Out)' : 'Outflow', colX[3], modeTableTop + 4, { align: 'right', width: colWidths[3] - 4 });
      doc.text(isMr ? 'अखेर शिल्लक' : 'Closing', colX[4], modeTableTop + 4, { align: 'right', width: colWidths[4] - 4 });

      const modeList = [
        [isMr ? 'रोख वही (Cash)' : 'Physical Cash', mw.CASH.opening, mw.CASH.income, mw.CASH.expense, mw.CASH.closing],
        [isMr ? 'बँक खाते (Bank)' : 'Bank Transfer', mw.BANK_TRANSFER.opening, mw.BANK_TRANSFER.income, mw.BANK_TRANSFER.expense, mw.BANK_TRANSFER.closing],
        [isMr ? 'यूपीआय (UPI)' : 'UPI', mw.UPI.opening, mw.UPI.income, mw.UPI.expense, mw.UPI.closing],
        [isMr ? 'धनादेश (Cheque)' : 'Cheque', mw.CHEQUE.opening, mw.CHEQUE.income, mw.CHEQUE.expense, mw.CHEQUE.closing]
      ];

      modeList.forEach((row, idx) => {
        const y = modeTableTop + 18 + (idx * 16);
        doc.rect(40, y, 480, 16)
          .fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff').fill();
        doc.fillColor('#334155').fontSize(8)
          .text(row[0], colX[0] + 4, y + 3);
        doc.text(`Rs. ${Number(row[1]).toLocaleString('en-IN')}`, colX[1], y + 3, { align: 'right', width: colWidths[1] - 4 });
        doc.text(`+${Number(row[2]).toLocaleString('en-IN')}`, colX[2], y + 3, { align: 'right', width: colWidths[2] - 4 });
        doc.text(`-${Number(row[3]).toLocaleString('en-IN')}`, colX[3], y + 3, { align: 'right', width: colWidths[3] - 4 });
        doc.text(`Rs. ${Number(row[4]).toLocaleString('en-IN')}`, colX[4], y + 3, { align: 'right', width: colWidths[4] - 4 });
      });

      // Total Row
      const totY = modeTableTop + 18 + (modeList.length * 16);
      doc.rect(40, totY, 480, 16).fillColor('#f1f5f9').fill();
      doc.fillColor('#0f172a').fontSize(8);
      doc.text(isMr ? 'एकूण योग (Total)' : 'Total', colX[0] + 4, totY + 3);
      doc.text(`Rs. ${financialData.totals.totalOpeningBalance.toLocaleString('en-IN')}`, colX[1], totY + 3, { align: 'right', width: colWidths[1] - 4 });
      doc.text(`+${financialData.totals.totalIncome.toLocaleString('en-IN')}`, colX[2], totY + 3, { align: 'right', width: colWidths[2] - 4 });
      doc.text(`-${financialData.totals.totalExpenses.toLocaleString('en-IN')}`, colX[3], totY + 3, { align: 'right', width: colWidths[3] - 4 });
      doc.text(`Rs. ${financialData.totals.totalClosingBalance.toLocaleString('en-IN')}`, colX[4], totY + 3, { align: 'right', width: colWidths[4] - 4 });

      doc.y = totY + 28;

      // Section 3: Expense Category Breakdown Summary
      doc.fontSize(10).fillColor('#ea580c')
        .text(isMr ? '३. खर्च वर्गवारी तपशील (Category-Wise Expenses)' : '3. Category-Wise Expenses');
      doc.moveDown(0.4);

      const catTableTop = doc.y;
      doc.rect(40, catTableTop, 480, 16).fillColor('#1e293b').fill();
      doc.fillColor('#ffffff').fontSize(8);
      doc.text(isMr ? 'वर्गवारी (Category)' : 'Category', 48, catTableTop + 4);
      doc.text(isMr ? 'व्हाउचर संख्या' : 'Vouchers', 280, catTableTop + 4, { align: 'right', width: 90 });
      doc.text(isMr ? 'रक्कम (Amount)' : 'Amount', 400, catTableTop + 4, { align: 'right', width: 110 });

      const topCategories = expenseData.categoryBreakdown.slice(0, 5);
      topCategories.forEach((c, idx) => {
        const y = catTableTop + 16 + (idx * 15);
        doc.rect(40, y, 480, 15)
          .fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff').fill();
        doc.fillColor('#334155').fontSize(8)
          .text(isMr ? c.categoryNameMarathi : c.category, 48, y + 3);
        doc.text(`${c.vouchersCount}`, 280, y + 3, { align: 'right', width: 90 });
        doc.text(`Rs. ${c.totalAmount.toLocaleString('en-IN')} (${c.percentage}%)`, 400, y + 3, { align: 'right', width: 110 });
      });

      // Signatures & Authorization Box
      doc.y = doc.page.height - 110;
      doc.strokeColor('#cbd5e1').lineWidth(0.5)
        .moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.6);

      const sigY = doc.y;
      doc.fontSize(8).fillColor('#64748B')
        .text(isMr ? 'टीप: हे अधिकृत सिस्टम जनरेटेड वित्तीय विवरण पत्रक आहे.' : 'Note: Official system-generated financial audit statement.', 40, sigY);

      doc.fontSize(8.5).fillColor('#0f172a')
        .text('श्री ल.रा. कोळी (Shri Laxman Koli)', doc.page.width - 240, sigY, { align: 'right', width: 200 });
      doc.fontSize(8).fillColor('#475569')
        .text(isMr ? 'अध्यक्ष / सचिव - शिवनेरी क्लासिक (ए विंग)' : 'Chairman / Building Secretary (A Wing)', doc.page.width - 240, sigY + 12, { align: 'right', width: 200 });
      doc.fontSize(7.5).fillColor('#94a3b8')
        .text('अधिकृत स्वाक्षरी व शिक्का (Authorized Signatory)', doc.page.width - 240, sigY + 24, { align: 'right', width: 200 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
