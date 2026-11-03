import React, { useRef, useState } from 'react';
import { Printer, Download, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLanguage } from '../../context/LanguageContext';

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

const METHOD_LABELS = {
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

const ReceiptModal = ({ isOpen, onClose, payment }) => {
  const { lang, t } = useLanguage();
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !payment) return null;

  const isMr = lang === 'mr';
  const monthName = isMr
    ? MONTH_NAMES_MR[payment.month] || payment.month
    : MONTH_NAMES_EN[payment.month] || payment.month;

  const methodText = METHOD_LABELS[lang]?.[payment.paymentMethod] || payment.paymentMethod;
  const formattedDate = new Date(payment.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');

  // Client-Side PDF Generation using html2canvas + jsPDF
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setDownloading(true);
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      // Create A5 or letter PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${payment.receiptNumber}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Fallback: direct server endpoint download
      window.open(`/api/v1/payments/${payment._id}/receipt-pdf?lang=${lang}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="print:hidden bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {isMr ? 'अधिकृत देखभाल पावती' : 'Official Maintenance Receipt'}
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {payment.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
              title="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('printReceiptBtn')}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm disabled:opacity-50"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'डाउनलोड...' : t('downloadPdfBtn')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas Container */}
        <div className="p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            id="printable-receipt"
            className="w-full max-w-[560px] bg-white p-6 sm:p-8 rounded-xl border-2 border-orange-600 shadow-md text-slate-900 font-sans print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Header / Society Info */}
            <div className="text-center pb-4 border-b-2 border-orange-500">
              <h1 className="text-lg sm:text-xl font-black text-orange-900 tracking-wide">
                SHIVNERI CLASSIC APARTMENT – A WING
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Aurangabad Road, Panchavati, Nashik, Maharashtra, India
              </p>
              <div className="inline-block mt-2 px-3 py-1 rounded bg-orange-100 text-orange-950 font-bold text-xs border border-orange-300">
                {isMr
                  ? 'मासिक देखभाल शुल्क अधिकृत पावती'
                  : 'Official Monthly Maintenance Payment Receipt'}
              </div>
            </div>

            {/* Receipt Meta (Receipt No & Date) */}
            <div className="grid grid-cols-2 py-3 px-2 text-xs border-b border-slate-200 font-semibold bg-slate-50/75 mt-3 rounded-md">
              <div>
                <span className="text-slate-500">{isMr ? 'पावती क्र: ' : 'Receipt No: '}</span>
                <span className="font-mono text-slate-900 font-bold">{payment.receiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">{isMr ? 'दिनांक: ' : 'Date: '}</span>
                <span className="text-slate-900 font-bold">{formattedDate}</span>
              </div>
            </div>

            {/* Cancellation Watermark if Cancelled */}
            {payment.status === 'CANCELLED' && (
              <div className="my-3 p-3 bg-red-50 border-2 border-dashed border-red-500 rounded-lg text-center">
                <div className="inline-flex items-center gap-1.5 text-red-700 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>*** ही पावती रद्द करण्यात आली आहे (CANCELLED) ***</span>
                </div>
                {payment.cancellationReason && (
                  <p className="text-xs text-red-600 mt-1">
                    कारण (Reason): {payment.cancellationReason}
                  </p>
                )}
              </div>
            )}

            {/* Financial Details Table */}
            <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-12 p-2.5 bg-white">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'सभासदाचे नाव' : 'Resident Name'}
                  </div>
                  <div className="col-span-7 font-bold text-slate-900 text-sm">
                    {payment.residentNameMarathi}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'सदनिका व विंग' : 'Flat & Wing'}
                  </div>
                  <div className="col-span-7 font-semibold text-slate-800">
                    {payment.flatNumber ? `${payment.flatNumber} (${payment.wing || 'A Wing'})` : (isMr ? 'रिक्त (Blank)' : 'Blank')}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-white">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'देखभाल महिना व वर्ष' : 'Maintenance Period'}
                  </div>
                  <div className="col-span-7 font-bold text-orange-950">
                    {monthName} {payment.year}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'एकूण देय आकार' : 'Total Maintenance Due'}
                  </div>
                  <div className="col-span-7 font-semibold text-slate-900">
                    ₹ {payment.totalAmountDue?.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-white">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'पूर्वी भरलेली रक्कम' : 'Previously Paid'}
                  </div>
                  <div className="col-span-7 font-semibold text-slate-700">
                    ₹ {payment.previousAmountPaid?.toLocaleString('en-IN') || 0}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-orange-50 font-bold">
                  <div className="col-span-5 text-orange-950">
                    {isMr ? 'सध्या जमा रक्कम' : 'Current Amount Paid'}
                  </div>
                  <div className="col-span-7 text-sm font-black text-orange-700">
                    ₹ {payment.amountReceived?.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-white">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'शिल्लक येणे बाकी' : 'Remaining Balance'}
                  </div>
                  <div className="col-span-7 font-bold text-slate-900">
                    ₹ {payment.remainingBalance?.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'भरणा पद्धत' : 'Payment Mode'}
                  </div>
                  <div className="col-span-7 font-semibold text-slate-900">
                    {methodText}
                  </div>
                </div>

                {payment.transactionRef && (
                  <div className="grid grid-cols-12 p-2.5 bg-white">
                    <div className="col-span-5 text-slate-500 font-medium">
                      {isMr ? 'संदर्भ क्र. / UTR' : 'Txn Ref / UTR'}
                    </div>
                    <div className="col-span-7 font-mono font-semibold text-slate-800">
                      {payment.transactionRef}
                    </div>
                  </div>
                )}

                {payment.remarks && (
                  <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                    <div className="col-span-5 text-slate-500 font-medium">
                      {isMr ? 'शेरा / टीप' : 'Remarks'}
                    </div>
                    <div className="col-span-7 text-slate-700 italic">
                      {payment.remarks}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Signatory */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs">
              <div className="text-[10px] text-slate-500 max-w-[200px]">
                {isMr
                  ? 'ही संगणकीय पावती असून सोसायटीच्या अधिकृत बँक/रोख नोंदीशी सुसंगत आहे.'
                  : 'Official computer-generated receipt issued by Shivneri Classic Apartment.'}
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500 mb-1">
                  {isMr ? 'अधिकृत स्वाक्षरी' : 'Authorized Signatory'}
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  श्री ल.रा. कोळी (Shri Laxman Koli)
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Chairman / Building Secretary
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Stylesheet */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible;
              }
              #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10mm !important;
              }
            }
          `
        }} />
      </div>
    </div>
  );
};

export default ReceiptModal;
