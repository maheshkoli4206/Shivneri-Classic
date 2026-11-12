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
        size: 'A4',
        layout: 'portrait',
        margin: 36,
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

      // Outer Decorative Border (A4 Portrait)
      doc
        .rect(32, 32, doc.page.width - 64, doc.page.height - 64)
        .lineWidth(2)
        .strokeColor('#ea580c') // Society brand orange
        .stroke();

      doc
        .rect(36, 36, doc.page.width - 72, doc.page.height - 72)
        .lineWidth(0.75)
        .strokeColor('#fed7aa') // Soft warm border
        .stroke();

      // Society Header Banner with Building Logo
      const LOGO_PATH = path.resolve(__dirname, '../assets/building-logo.png');
      if (fs.existsSync(LOGO_PATH)) {
        try {
          doc.image(LOGO_PATH, 50, 48, { width: 56 });
        } catch { }
      }

      doc
        .fontSize(16)
        .fillColor('#9a3412')
        .text('SHIVNERI CLASSIC APARTMENT – A WING', 120, 50);

      doc
        .fontSize(9.5)
        .fillColor('#475569')
        .text('Kapaleshwar Nagar, Aurangabad Road, Panchavati, Nashik', 120, 72);

      // Official Receipt Title Box - Centered Rounded Rectangle with Orange Border & Light Orange Background
      const isFullyAdv = Boolean(payment.isFullyAdvanceSettled || (payment.advanceAdjustedAmount > 0 && (!payment.amountReceived || payment.amountReceived === 0)));

      const subHeader = payment.isAdvancePayment
        ? (isMr ? 'अधिकृत अ‍ॅडव्हान्स देखभाल पावती' : 'Official Advance Maintenance Payment Receipt')
        : isFullyAdv
          ? (isMr ? 'अ‍ॅडव्हान्स रकमेतून वर्ग अधिकृत पावती (Paid Through Advance Adjustment)' : 'Official Advance Adjustment Settlement Receipt')
          : (isMr ? 'मासिक देखभाल शुल्क अधिकृत पावती' : 'Official Monthly Maintenance Payment Receipt');

      const titleBoxWidth = payment.isAdvancePayment ? 420 : (isFullyAdv ? 470 : 380);
      const titleBoxHeight = 25;
      const titleBoxX = (doc.page.width - titleBoxWidth) / 2;
      const titleBoxY = 94;

      doc
        .roundedRect(titleBoxX, titleBoxY, titleBoxWidth, titleBoxHeight, 5)
        .lineWidth(1.5)
        .strokeColor('#ea580c')
        .fillColor('#fff7ed') // Light orange background (orange-50)
        .fillAndStroke();

      doc
        .fontSize(10)
        .fillColor('#7c2d12') // Deep bold orange-950
        .text(subHeader, titleBoxX, titleBoxY + 6.5, {
          width: titleBoxWidth,
          align: 'center'
        });

      doc.y = 130;

      // Horizontal separator rule
      doc
        .moveTo(48, doc.y)
        .lineTo(doc.page.width - 48, doc.y)
        .lineWidth(1)
        .strokeColor('#ea580c')
        .stroke();

      doc.moveDown(0.8);

      // Top Metadata Bar: Receipt No & Payment Date
      const receiptY = doc.y;
      const formattedDate = new Date(payment.paymentDate).toLocaleDateString('en-GB');

      doc
        .fontSize(10.5)
        .fillColor('#1e293b')
        .text(
          `${isMr ? 'पावती क्रमांक (Receipt No): ' : 'Receipt No: '} ${payment.receiptNumber}`,
          50,
          receiptY
        );

      doc
        .fontSize(10.5)
        .fillColor('#1e293b')
        .text(
          `${isMr ? 'दिनांक (Date): ' : 'Date: '} ${formattedDate}`,
          doc.page.width - 240,
          receiptY,
          { width: 190, align: 'right' }
        );

      doc.y = receiptY + 26;

      // Table / Boxed Details - Calculate dynamic height so nothing overflows
      const boxTop = doc.y;
      const boxWidth = doc.page.width - 100;

      const rows = [];
      const monthName = isMr
        ? MONTH_NAMES_MR[payment.month] || payment.month
        : MONTH_NAMES_EN[payment.month] || payment.month;

      const flatText = payment.flatNumber ? `${payment.flatNumber} (${payment.wing || 'A Wing'})` : (isMr ? 'रिक्त (Blank)' : 'Blank');
      const methodText = PAYMENT_METHODS_MAP[lang]?.[payment.paymentMethod] || payment.paymentMethod;

      if (payment.isAdvancePayment) {
        rows.push({ label: isMr ? 'सभासदाचे नाव (Resident Name):' : 'Resident Name:', val: payment.residentNameMarathi });
        rows.push({ label: isMr ? 'सदनिका व विंग (Flat & Wing):' : 'Flat & Wing:', val: flatText });
        rows.push({ label: isMr ? 'पावती प्रकार (Receipt Type):' : 'Receipt Type:', val: isMr ? 'अ‍ॅडव्हान्स देखभाल भरणा (Advance Maintenance)' : 'Advance Maintenance Deposit' });
        rows.push({ label: isMr ? 'जमा अ‍ॅडव्हान्स रक्कम (Advance Paid):' : 'Advance Amount Received:', val: `₹ ${payment.amountReceived.toLocaleString('en-IN')}`, highlight: true });
        rows.push({ label: isMr ? 'शिल्लक अ‍ॅडव्हान्स (Available Balance):' : 'Available Advance Balance:', val: `₹ ${(payment.availableBalance ?? payment.amountReceived).toLocaleString('en-IN')}` });
        rows.push({ label: isMr ? 'भरणा पद्धत (Payment Mode):' : 'Payment Method:', val: methodText });
        if (payment.transactionRef) {
          rows.push({ label: isMr ? 'संदर्भ क्र. / UTR (Txn Ref):' : 'Transaction Ref / UTR:', val: payment.transactionRef });
        }
        if (payment.remarks) {
          rows.push({ label: isMr ? 'टीप (Remarks):' : 'Remarks:', val: payment.remarks });
        }
      } else {
        const totalDue = Number(payment.totalAmountDue || 0);
        const prevPaid = Number(payment.previousAmountPaid || 0);
        const advApplied = Number(payment.advanceAdjustedAmount || 0);
        const currentPaid = Number(payment.amountReceived || 0);
        const totalSettled = Math.round((prevPaid + advApplied + currentPaid) * 100) / 100;
        const remBalance = payment.remainingBalance !== undefined
          ? Number(payment.remainingBalance)
          : Math.max(0, Math.round((totalDue - totalSettled) * 100) / 100);

        rows.push({ label: isMr ? 'सभासदाचे नाव (Resident Name):' : 'Resident Name:', val: payment.residentNameMarathi });
        rows.push({ label: isMr ? 'सदनिका व विंग (Flat & Wing):' : 'Flat & Wing:', val: flatText });
        rows.push({ label: isMr ? 'देखभाल महिना / वर्ष (Period):' : 'Maintenance Period:', val: `${monthName} ${payment.year}` });

        if (isFullyAdv) {
          rows.push({
            label: isMr ? 'भरणा स्थिती (Settlement):' : 'Settlement Status:',
            val: isMr ? 'अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा (Paid Through Advance Adjustment)' : 'Paid Through Advance Adjustment',
            highlight: true
          });
        }

        // Total Maintenance Due
        rows.push({
          label: isMr ? 'एकूण देय आकार (Total Due):' : 'Total Maintenance Due:',
          val: `₹ ${totalDue.toLocaleString('en-IN')}`
        });

        // Previously Received Direct Payments (Render ONLY if > 0)
        if (prevPaid > 0) {
          rows.push({
            label: isMr ? 'पूर्वी भरलेली थेट रक्कम (Prev Paid):' : 'Previously Paid Direct Amount:',
            val: `₹ ${prevPaid.toLocaleString('en-IN')}`
          });
        }

        // Advance Amount Applied (Render ONLY when advance was genuinely applied)
        if (advApplied > 0) {
          rows.push({
            label: isMr ? 'वर्ग केलेली अ‍ॅडव्हान्स रक्कम (Adv Applied):' : 'Advance Amount Applied:',
            val: `₹ ${advApplied.toLocaleString('en-IN')}`,
            highlight: true
          });

          if (payment.advanceAdjustmentDetails && payment.advanceAdjustmentDetails.length > 0) {
            const advRefStrs = payment.advanceAdjustmentDetails.map(a => `${a.receiptNumber} (₹${a.amount})`).join(', ');
            rows.push({
              label: isMr ? '   - अ‍ॅडव्हान्स पावती संदर्भ (Adv Ref):' : '   - Advance Receipt Ref:',
              val: advRefStrs
            });
          }
        }

        // Current Direct Payment Received
        if (!isFullyAdv || currentPaid > 0) {
          rows.push({
            label: isMr ? 'सध्या जमा थेट रक्कम (Current Paid):' : 'Current Direct Payment Received:',
            val: `₹ ${currentPaid.toLocaleString('en-IN')}`,
            highlight: currentPaid > 0
          });
        }

        // Total Amount Settled
        rows.push({
          label: isMr ? 'एकूण समायोजित भरणा (Total Settled):' : 'Total Amount Settled:',
          val: `₹ ${totalSettled.toLocaleString('en-IN')}`,
          highlight: true
        });

        // Remaining Balance Due
        rows.push({
          label: isMr ? 'शिल्लक थकबाकी (Remaining Balance):' : 'Remaining Balance Due:',
          val: `₹ ${remBalance.toLocaleString('en-IN')}`
        });

        const methodVal = isFullyAdv
          ? (isMr ? 'अ‍ॅडव्हान्स समायोजन (Advance Adjustment)' : 'Advance Adjustment')
          : methodText;
        rows.push({ label: isMr ? 'भरणा पद्धत (Payment Mode):' : 'Payment Method:', val: methodVal });

        if (payment.transactionRef) {
          rows.push({ label: isMr ? 'संदर्भ क्र. / UTR (Txn Ref):' : 'Transaction Ref / UTR:', val: payment.transactionRef });
        }
        if (payment.remarks) {
          rows.push({ label: isMr ? 'टीप (Remarks):' : 'Remarks:', val: payment.remarks });
        }
      }

      const rowGap = 21;
      const boxPadding = 10;
      const boxHeight = boxPadding * 2 + (rows.length * rowGap);

      doc
        .rect(50, boxTop, boxWidth, boxHeight)
        .lineWidth(0.75)
        .strokeColor('#cbd5e1')
        .fillColor('#fafaf9')
        .fillAndStroke();

      let rowY = boxTop + boxPadding;
      const leftColX = 66;
      const rightColX = 230;

      rows.forEach((r, idx) => {
        doc
          .fontSize(9.5)
          .fillColor('#475569')
          .text(r.label, leftColX, rowY, { width: 160 });

        doc
          .fontSize(10)
          .fillColor(r.highlight ? '#c2410c' : '#0f172a')
          .text(String(r.val), rightColX, rowY, { width: boxWidth - 195 });

        // Divider line if not last row
        if (idx < rows.length - 1) {
          doc
            .moveTo(leftColX, rowY + 16)
            .lineTo(50 + boxWidth - 16, rowY + 16)
            .lineWidth(0.25)
            .strokeColor('#e2e8f0')
            .stroke();
        }

        rowY += rowGap;
      });

      // Cancellation Notice Watermark / Stamp if CANCELLED
      if (payment.status === 'CANCELLED') {
        doc.save();
        doc
          .fontSize(24)
          .fillColor('#dc2626')
          .text('*** रद्द करण्यात आली (CANCELLED) ***', 50, boxTop + (boxHeight / 2) - 15, {
            align: 'center',
            width: boxWidth
          });
        doc.restore();
      }

      // Signatory Section - placed comfortably within A4 page bounds
      doc.y = boxTop + boxHeight + 28;

      const sigY = doc.y;
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          isMr
            ? 'ही संगणकीय प्रणालीद्वारे तयार केलेली अधिकृत पावती आहे.'
            : 'This is an official system-generated payment receipt.',
          50,
          sigY,
          { width: 220 }
        );

      doc
        .fontSize(10)
        .fillColor('#0f172a')
        .text('अधिकृत स्वाक्षरी / Authorized Signatory', doc.page.width - 250, sigY, {
          width: 200,
          align: 'right'
        });

      doc.moveDown(0.3);
      doc
        .fontSize(11)
        .fillColor('#9a3412')
        .text('श्री ल.रा. कोळी (Shri Laxman Koli)', doc.page.width - 250, doc.y, {
          width: 200,
          align: 'right'
        });

      doc.moveDown(0.2);
      doc
        .fontSize(9)
        .fillColor('#475569')
        .text('Chairman / Building Secretary', doc.page.width - 250, doc.y, {
          width: 200,
          align: 'right'
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateReceiptPDF;
