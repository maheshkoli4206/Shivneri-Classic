import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolved path to bundled authentic Devanagari font (Mangal works natively with PDFKit fontkit)
const MANGAL_FONT_PATH = path.resolve(__dirname, '../assets/fonts/mangal.ttf');
const NOTO_FONT_PATH = path.resolve(__dirname, '../assets/fonts/NotoSansDevanagari.ttf');

const MONTH_NAMES_MR = [
  '',
  'जानेवारी',
  'फेब्रुवारी',
  'मार्च',
  'एप्रिल',
  'मे',
  'जून',
  'जुलै',
  'ऑगस्ट',
  'सप्टेंबर',
  'ऑक्टोबर',
  'नोव्हेंबर',
  'डिसेंबर'
];

const MONTH_NAMES_EN = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const PAYMENT_METHODS_MAP = {
  mr: {
    CASH: 'रोख (Cash)',
    UPI: 'यूपीआय (UPI)',
    BANK_TRANSFER: 'बँक ट्रान्सफर (Bank Transfer)',
    CHEQUE: 'धनादेश (Cheque)'
  },
  en: {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque'
  }
};

/**
 * Generate official PDF receipt buffer for a payment
 *
 * @param {Object} payment - Payment document with populated/snapshot details
 * @param {string} [lang='mr'] - Language: 'mr' for Marathi, 'en' for English
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generateReceiptPDF(payment, lang = 'mr') {
  return new Promise((resolve, reject) => {
    try {
      const isMr = lang !== 'en';
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'portrait',
        margin: 28,
        info: {
          Title: `Receipt-${payment.receiptNumber}`,
          Author: 'Shivneri Classic Apartment - A Wing'
        }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // Register bundled authentic Devanagari font
      let hasCustomFont = false;
      if (fs.existsSync(MANGAL_FONT_PATH)) {
        doc.font(MANGAL_FONT_PATH);
        hasCustomFont = true;
      } else if (fs.existsSync('C:/Windows/Fonts/mangal.ttf')) {
        doc.font('C:/Windows/Fonts/mangal.ttf');
        hasCustomFont = true;
      } else if (fs.existsSync(NOTO_FONT_PATH)) {
        doc.font(NOTO_FONT_PATH);
        hasCustomFont = true;
      }

      // Outer Decorative Border
      doc
        .rect(15, 15, doc.page.width - 30, doc.page.height - 30)
        .lineWidth(1.5)
        .strokeColor('#ea580c') // Society brand orange
        .stroke();

      doc
        .rect(18, 18, doc.page.width - 36, doc.page.height - 36)
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .stroke();

      // Society Header Banner
      doc.y = 26;
      doc
        .fontSize(15)
        .fillColor('#9a3412')
        .text('SHIVNERI CLASSIC APARTMENT – A WING', { align: 'center' });

      doc.moveDown(0.2);
      doc
        .fontSize(8.5)
        .fillColor('#475569')
        .text('Aurangabad Road, Panchavati, Nashik, Maharashtra, India', { align: 'center' });

      doc.moveDown(0.2);
      const subHeader = isMr
        ? 'मासिक देखभाल शुल्क अधिकृत पावती (Official Maintenance Payment Receipt)'
        : 'Official Monthly Maintenance Payment Receipt';
      doc
        .fontSize(9.5)
        .fillColor('#c2410c')
        .text(subHeader, { align: 'center' });

      // Horizontal separator rule
      doc.moveDown(0.4);
      doc
        .moveTo(25, doc.y)
        .lineTo(doc.page.width - 25, doc.y)
        .lineWidth(1)
        .strokeColor('#fdba74')
        .stroke();

      doc.moveDown(0.6);

      // Top Metadata Bar: Receipt No & Payment Date
      const receiptY = doc.y;
      const formattedDate = new Date(payment.paymentDate).toLocaleDateString('en-GB');

      doc
        .fontSize(9.5)
        .fillColor('#1e293b')
        .text(
          `${isMr ? 'पावती क्रमांक (Receipt No): ' : 'Receipt No: '} ${payment.receiptNumber}`,
          28,
          receiptY
        );

      doc
        .fontSize(9.5)
        .fillColor('#1e293b')
        .text(
          `${isMr ? 'दिनांक (Date): ' : 'Date: '} ${formattedDate}`,
          doc.page.width - 170,
          receiptY,
          { width: 142, align: 'right' }
        );

      doc.y = receiptY + 18;

      // Table / Boxed Details
      const boxTop = doc.y;
      const boxWidth = doc.page.width - 56;
      const boxHeight = 220;

      doc
        .rect(28, boxTop, boxWidth, boxHeight)
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .fillColor('#fafaf9')
        .fillAndStroke();

      let rowY = boxTop + 10;
      const leftColX = 38;
      const rightColX = 180;
      const rowGap = 19;

      const addRow = (label, value, highlight = false) => {
        doc
          .fontSize(9)
          .fillColor('#64748b')
          .text(label, leftColX, rowY, { width: 135 });

        doc
          .fontSize(9.5)
          .fillColor(highlight ? '#c2410c' : '#0f172a')
          .text(String(value), rightColX, rowY, { width: boxWidth - 160 });

        // Light divider line
        doc
          .moveTo(leftColX, rowY + 14)
          .lineTo(28 + boxWidth - 10, rowY + 14)
          .lineWidth(0.25)
          .strokeColor('#e2e8f0')
          .stroke();

        rowY += rowGap;
      };

      const monthName = isMr
        ? MONTH_NAMES_MR[payment.month] || payment.month
        : MONTH_NAMES_EN[payment.month] || payment.month;

      const flatText = payment.flatNumber ? `${payment.flatNumber} (${payment.wing || 'A Wing'})` : (isMr ? 'रिक्त (Blank)' : 'Blank');
      const methodText = PAYMENT_METHODS_MAP[lang]?.[payment.paymentMethod] || payment.paymentMethod;

      addRow(isMr ? 'सभासदाचे नाव (Resident Name):' : 'Resident Name:', payment.residentNameMarathi);
      addRow(isMr ? 'सदनिका व विंग (Flat & Wing):' : 'Flat & Wing:', flatText);
      addRow(isMr ? 'देखभाल महिना / वर्ष (Period):' : 'Maintenance Period:', `${monthName} ${payment.year}`);
      addRow(isMr ? 'एकूण देय रक्कम (Total Due):' : 'Total Maintenance Amount:', `₹ ${payment.totalAmountDue.toLocaleString('en-IN')}`);
      addRow(isMr ? 'पूर्वी भरलेली रक्कम (Previously Paid):' : 'Previously Paid Amount:', `₹ ${payment.previousAmountPaid.toLocaleString('en-IN')}`);
      addRow(isMr ? 'सध्या जमा रक्कम (Current Paid):' : 'Current Payment Amount:', `₹ ${payment.amountReceived.toLocaleString('en-IN')}`, true);
      addRow(isMr ? 'शिल्लक थकबाकी (Remaining Balance):' : 'Remaining Balance:', `₹ ${payment.remainingBalance.toLocaleString('en-IN')}`);
      addRow(isMr ? 'भरणा पद्धत (Payment Mode):' : 'Payment Method:', methodText);

      if (payment.transactionRef) {
        addRow(isMr ? 'संदर्भ क्र. / UTR (Txn Ref):' : 'Transaction Ref / UTR:', payment.transactionRef);
      }
      if (payment.remarks) {
        addRow(isMr ? 'टीप (Remarks):' : 'Remarks:', payment.remarks);
      }

      // Cancellation Notice Watermark / Stamp if CANCELLED
      if (payment.status === 'CANCELLED') {
        doc.save();
        doc
          .fontSize(22)
          .fillColor('#dc2626')
          .text('*** रद्द करण्यात आली (CANCELLED) ***', 30, boxTop + 90, {
            align: 'center',
            width: boxWidth
          });
        doc.restore();
      }

      // Signatory Section
      doc.y = boxTop + boxHeight + 14;

      const sigY = doc.y;
      doc
        .fontSize(8)
        .fillColor('#64748b')
        .text(
          isMr
            ? 'ही संगणकीय प्रणालीद्वारे तयार केलेली अधिकृत पावती आहे.'
            : 'This is an official system-generated payment receipt.',
          28,
          sigY,
          { width: 170 }
        );

      doc
        .fontSize(9)
        .fillColor('#0f172a')
        .text('अधिकृत स्वाक्षरी / Authorized Signatory', doc.page.width - 200, sigY, {
          width: 172,
          align: 'right'
        });

      doc.moveDown(0.2);
      doc
        .fontSize(10)
        .fillColor('#9a3412')
        .text('श्री ल.रा. कोळी (Shri Laxman Koli)', doc.page.width - 200, doc.y, {
          width: 172,
          align: 'right'
        });

      doc.moveDown(0.1);
      doc
        .fontSize(8)
        .fillColor('#475569')
        .text('Chairman / Building Secretary', doc.page.width - 200, doc.y, {
          width: 172,
          align: 'right'
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateReceiptPDF;
