import React, { useRef, useState } from 'react';
import { Printer, Download, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLanguage } from '../../context/LanguageContext';

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

const ExpenseDetailModal = ({ isOpen, onClose, expense }) => {
  const { lang, t } = useLanguage();
  const voucherRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !expense) return null;

  const isMr = lang === 'mr';
  const methodText = METHOD_LABELS[lang]?.[expense.paymentMethod] || expense.paymentMethod;
  const formattedDate = new Date(expense.expenseDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
  const recordedAtDate = expense.createdAt
    ? new Date(expense.createdAt).toLocaleString(isMr ? 'mr-IN' : 'en-GB')
    : formattedDate;

  // Client-Side PDF Generation using html2canvas + jsPDF
  const handleDownloadPDF = async () => {
    if (!voucherRef.current) return;
    try {
      setDownloading(true);
      const element = voucherRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Voucher-${expense.voucherNumber}.pdf`);
    } catch (err) {
      console.error('Failed to download voucher PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isCancelled = expense.isCancelled || expense.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-300">
              {isMr ? 'अधिकृत खर्च व्हाउचर' : 'Official Expense Voucher'}
            </span>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
              {expense.voucherNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{isMr ? 'प्रिंट करा' : 'Print'}</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? (isMr ? 'तयार होत आहे...' : 'Generating...') : 'PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Card Container */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] bg-slate-950">
          <div
            ref={voucherRef}
            className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 text-sm max-w-xl mx-auto printable-voucher"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-orange-600 pb-4">
              <h2 className="text-xl font-bold text-slate-900 tracking-wide font-devanagari">
                शिवनेरी क्लासिक अपार्टमेंट (Shivneri Classic Apartment)
              </h2>
              <p className="text-xs font-semibold text-orange-700 mt-0.5">
                ए विंग (A Wing) • औरंगाबाद रोड, पंचवटी, नाशिक - ४२२००३
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                अधिकृत खर्च व्हाउचर / Payment Expense Voucher
              </p>
            </div>

            {/* Voucher Meta Strip */}
            <div className="flex justify-between items-center py-3 border-b border-dashed border-slate-300 text-xs">
              <div>
                <span className="text-slate-500">{isMr ? 'व्हाउचर क्र.' : 'Voucher No.'}: </span>
                <span className="font-bold font-mono text-slate-800">{expense.voucherNumber}</span>
              </div>
              <div>
                <span className="text-slate-500">{isMr ? 'दिनांक' : 'Date'}: </span>
                <span className="font-semibold text-slate-800">{formattedDate}</span>
              </div>
              <div>
                {isCancelled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                    <AlertTriangle className="w-3 h-3" />
                    {isMr ? 'रद्दबातल (CANCELLED)' : 'CANCELLED'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    <CheckCircle className="w-3 h-3" />
                    {isMr ? 'मान्य (COMPLETED)' : 'COMPLETED'}
                  </span>
                )}
              </div>
            </div>

            {/* Cancellation Notice if applicable */}
            {isCancelled && (
              <div className="my-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <span className="font-bold">{isMr ? 'रद्द करण्याचे कारण: ' : 'Cancellation Reason: '}</span>
                <span>{expense.cancellationReason}</span>
                {expense.cancelledAt && (
                  <span className="block text-[10px] text-red-600 mt-1">
                    {isMr ? 'रद्द केले: ' : 'Cancelled on: '}
                    {new Date(expense.cancelledAt).toLocaleString(isMr ? 'mr-IN' : 'en-GB')}
                  </span>
                )}
              </div>
            )}

            {/* Voucher Body Details */}
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">{isMr ? 'खर्चाचे शीर्षक (Title)' : 'Expense Title'}:</span>
                <span className="font-semibold text-slate-900 text-right">
                  {expense.titleMarathi || expense.titleEnglish}
                  {expense.titleEnglish && expense.titleMarathi && (
                    <span className="block text-[11px] font-normal text-slate-500">({expense.titleEnglish})</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">{isMr ? 'खर्च वर्गवारी (Category)' : 'Category'}:</span>
                <span className="font-medium text-slate-800">{expense.category}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">{isMr ? 'पैसे स्वीकारणारे / विक्रेता (Payee)' : 'Payee / Vendor'}:</span>
                <span className="font-semibold text-slate-900">{expense.payeeName}</span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">{isMr ? 'पेमेंट पद्धत (Payment Method)' : 'Payment Method'}:</span>
                <span className="font-medium text-slate-800">{methodText}</span>
              </div>

              {expense.transactionRef && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">{isMr ? 'व्यवहार संदर्भ / UTR / धनादेश क्र.' : 'Transaction Ref / UTR / Cheque No.'}:</span>
                  <span className="font-mono text-slate-800">{expense.transactionRef}</span>
                </div>
              )}

              {expense.description && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">{isMr ? 'तपशील / शेरा (Description)' : 'Description'}:</span>
                  <span className="text-slate-700 text-right max-w-[280px]">{expense.description}</span>
                </div>
              )}

              {/* Total Amount Box */}
              <div className="mt-4 p-3.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-orange-950 uppercase tracking-wider">
                    {isMr ? 'खर्च झालेली एकूण रक्कम' : 'Total Expense Amount'}
                  </span>
                  <p className="text-[11px] text-orange-800">
                    {isMr ? 'सोसायटी फंडातून अदा' : 'Disbursed from Society Account'}
                  </p>
                </div>
                <div className="text-2xl font-black text-orange-900 font-mono">
                  ₹{Number(expense.amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Signatures & Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 text-xs">
              <div>
                <p className="text-[11px] text-slate-500">{isMr ? 'पैसे स्वीकारणाऱ्याची स्वाक्षरी' : "Payee's Signature"}:</p>
                <div className="h-10"></div>
                <p className="text-xs font-medium text-slate-700">({expense.payeeName})</p>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isMr ? 'अधिकृत स्वाक्षरी' : 'Authorized Signatory'}</span>
                </div>
                <div className="h-6"></div>
                <p className="text-xs font-bold text-slate-900 font-devanagari">
                  श्री ल.रा. कोळी (Shri Laxman Koli)
                </p>
                <p className="text-[11px] text-slate-600">
                  {isMr ? 'अध्यक्ष / सचिव - शिवनेरी क्लासिक' : 'Chairman / Secretary - Shivneri Classic'}
                </p>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-6 pt-3 border-t border-slate-100">
              {isMr
                ? `हे व्हाउचर सिस्टम जनरेटेड असून अधिकृत नोंदीनुसार तयार करण्यात आले आहे. • नोंदणी वेळ: ${recordedAtDate}`
                : `System-generated official society voucher. • Recorded at: ${recordedAtDate}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;
