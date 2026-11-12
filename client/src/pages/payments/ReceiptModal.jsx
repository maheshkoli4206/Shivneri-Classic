import React, { useRef, useEffect } from 'react';
import { Printer, X, AlertTriangle, ShieldCheck } from 'lucide-react';
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payment) return null;

  const isMr = lang === 'mr';
  const isFullyAdv = Boolean(payment.isFullyAdvanceSettled || (payment.advanceAdjustedAmount > 0 && (!payment.amountReceived || payment.amountReceived === 0)));

  const totalDue = Number(payment.totalAmountDue || 0);
  const prevPaid = Number(payment.previousAmountPaid || 0);
  const advApplied = Number(payment.advanceAdjustedAmount || 0);
  const currentPaid = Number(payment.amountReceived || 0);
  const totalSettled = Math.round((prevPaid + advApplied + currentPaid) * 100) / 100;
  const remBalance = payment.remainingBalance !== undefined
    ? Number(payment.remainingBalance)
    : Math.max(0, Math.round((totalDue - totalSettled) * 100) / 100);

  const monthName = isMr
    ? MONTH_NAMES_MR[payment.month] || payment.month
    : MONTH_NAMES_EN[payment.month] || payment.month;

  const methodText = isFullyAdv
    ? (isMr ? 'अ‍ॅडव्हान्स समायोजन (Advance Adjustment)' : 'Advance Adjustment')
    : (METHOD_LABELS[lang]?.[payment.paymentMethod] || payment.paymentMethod);
  const formattedDate = new Date(payment.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in duration-150">
        {/* Sticky Modal Action Bar (Header) - always pinned, never shrinks */}
        <div className="shrink-0 bg-slate-900 px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 z-10 print:hidden">
          <div className="flex items-center gap-2 text-white min-w-0 pr-2">
            <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
            <h3 className="font-bold text-xs sm:text-base truncate">
              {payment.isAdvancePayment
                ? (isMr ? 'अधिकृत अ‍ॅडव्हान्स देखभाल पावती' : 'Official Advance Maintenance Receipt')
                : isFullyAdv
                ? (isMr ? 'अ‍ॅडव्हान्स रकमेतून वर्ग पावती' : 'Advance Adjustment Settlement Receipt')
                : (isMr ? 'अधिकृत देखभाल पावती' : 'Official Maintenance Receipt')}
            </h3>
            <span className="hidden xs:inline-block text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0">
              {payment.receiptNumber}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-sm cursor-pointer"
              title={t('printReceiptBtn')}
              aria-label="Print Receipt"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>{t('printReceiptBtn')}</span>
            </button>

            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5 sm:ml-1 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body Container - flex items-start prevents vertical stretching */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 pb-6 sm:pb-8 bg-slate-100 flex justify-center items-start print:overflow-visible print:p-0 print:bg-white print:max-h-none print:h-auto">
          <div
            ref={receiptRef}
            id="printable-receipt"
            className="w-full max-w-[560px] h-auto shrink-0 bg-white p-5 sm:p-8 rounded-xl border-2 border-orange-600 shadow-md text-slate-900 font-sans print:border-none print:shadow-none print:p-0 print:m-0 my-0"
          >
            {/* Header / Society Info */}
            <div className="pb-3 border-b-2 border-orange-500">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 text-center sm:text-left">
                <img
                  src="/building-logo.png"
                  alt="Shivneri Classic Logo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/80 shadow-md shrink-0 bg-white"
                />
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-orange-950 tracking-wide">
                    {isMr ? 'शिवनेरी क्लासिक अपार्टमेंट – ए विंग' : 'SHIVNERI CLASSIC APARTMENT – A WING'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {isMr ? 'कपालेश्वर नगर, औरंगाबाद रोड, पंचवटी, नाशिक' : 'Kapaleshwar Nagar, Aurangabad Road, Panchavati, Nashik'}
                  </p>
                </div>
              </div>

              {/* Official Receipt Title Box - Centered Rounded Rectangle with Orange Border & Light Orange Background */}
              <div className="mt-3 flex justify-center">
                <div className="w-full sm:w-auto text-center px-4 sm:px-6 py-1.5 rounded-lg bg-orange-50 border-2 border-orange-500 shadow-xs">
                  <span className="font-bold text-xs sm:text-sm text-orange-950 tracking-wide block">
                    {payment.isAdvancePayment
                      ? (isMr ? 'अधिकृत अ‍ॅडव्हान्स देखभाल पावती' : 'Official Advance Maintenance Payment Receipt')
                      : isFullyAdv
                      ? (isMr ? 'अ‍ॅडव्हान्स रकमेतून वर्ग अधिकृत पावती' : 'Official Advance Adjustment Settlement Receipt')
                      : (isMr ? 'मासिक देखभाल शुल्क अधिकृत पावती' : 'Official Monthly Maintenance Payment Receipt')}
                  </span>
                </div>
              </div>
              {isFullyAdv && (
                <div className="mt-2.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isMr
                      ? 'अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा (Paid Through Advance Adjustment)'
                      : 'Paid Through Advance Adjustment (अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा)'}
                  </span>
                </div>
              )}
            </div>

            {/* Receipt Meta (Receipt No & Date) */}
            <div className="grid grid-cols-2 py-3 px-3 text-xs border-b border-slate-200 font-semibold bg-slate-50 mt-3 rounded-lg">
              <div>
                <span className="text-slate-500">{isMr ? 'पावती क्र.: ' : 'Receipt No: '}</span>
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
                  <span>{isMr ? '*** ही पावती रद्द करण्यात आली आहे ***' : '*** THIS RECEIPT HAS BEEN CANCELLED ***'}</span>
                </div>
                {payment.cancellationReason && (
                  <p className="text-xs text-red-600 mt-1">
                    {isMr ? 'कारण:' : 'Reason:'} {payment.cancellationReason}
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
                    {(!isMr && payment.residentNameEnglish) ? payment.residentNameEnglish : (payment.residentNameMarathi || payment.residentName)}
                  </div>
                </div>

                <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                  <div className="col-span-5 text-slate-500 font-medium">
                    {isMr ? 'सदनिका व विंग' : 'Flat & Wing'}
                  </div>
                  <div className="col-span-7 font-semibold text-slate-800">
                    {payment.flatNumber ? `${payment.flatNumber} (${payment.wing || 'A Wing'})` : (isMr ? 'रिक्त' : 'Blank')}
                  </div>
                </div>

                {payment.isAdvancePayment ? (
                  <>
                    <div className="grid grid-cols-12 p-2.5 bg-white">
                      <div className="col-span-5 text-slate-500 font-medium">
                        {isMr ? 'पावती प्रकार' : 'Receipt Type'}
                      </div>
                      <div className="col-span-7 font-bold text-orange-950">
                        {isMr ? 'अ‍ॅडव्हान्स देखभाल भरणा' : 'Advance Maintenance Deposit'}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-2.5 bg-orange-50 font-bold">
                      <div className="col-span-5 text-orange-950">
                        {isMr ? 'जमा अ‍ॅडव्हान्स रक्कम' : 'Advance Amount Received'}
                      </div>
                      <div className="col-span-7 text-sm font-black text-orange-700">
                        ₹ {payment.amountReceived?.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 p-2.5 bg-white">
                      <div className="col-span-5 text-slate-500 font-medium">
                        {isMr ? 'शिल्लक अ‍ॅडव्हान्स जमा' : 'Available Advance Balance'}
                      </div>
                      <div className="col-span-7 font-bold text-emerald-700">
                        ₹ {(payment.availableBalance ?? payment.amountReceived)?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-12 p-2.5 bg-white">
                      <div className="col-span-5 text-slate-500 font-medium">
                        {isMr ? 'देखभाल महिना व वर्ष' : 'Maintenance Period'}
                      </div>
                      <div className="col-span-7 font-bold text-orange-950">
                        {monthName} {payment.year}
                      </div>
                    </div>

                    {/* Total Maintenance Due */}
                    <div className="grid grid-cols-12 p-2.5 bg-slate-50/50">
                      <div className="col-span-5 text-slate-500 font-medium">
                        {isMr ? 'एकूण देय आकार' : 'Total Maintenance Due'}
                      </div>
                      <div className="col-span-7 font-bold text-slate-900 font-mono">
                        ₹ {totalDue.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Previously Received Direct Payments (Render ONLY if > 0) */}
                    {prevPaid > 0 && (
                      <div className="grid grid-cols-12 p-2.5 bg-white">
                        <div className="col-span-5 text-slate-500 font-medium">
                          {isMr ? 'पूर्वी भरलेली थेट रक्कम' : 'Previously Paid Direct'}
                        </div>
                        <div className="col-span-7 font-semibold text-slate-700 font-mono">
                          ₹ {prevPaid.toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}

                    {/* Advance Amount Applied (Render ONLY when advance was genuinely applied) */}
                    {advApplied > 0 && (
                      <div className="grid grid-cols-12 p-2.5 bg-amber-50/50 border-y border-amber-200/60">
                        <div className="col-span-5 text-amber-900 font-medium">
                          {isMr ? 'वर्ग केलेली अ‍ॅडव्हान्स रक्कम' : 'Advance Amount Applied'}
                        </div>
                        <div className="col-span-7 font-bold text-amber-800 font-mono flex flex-col">
                          <span className="text-sm">₹ {advApplied.toLocaleString('en-IN')}</span>
                          {payment.advanceAdjustmentDetails && payment.advanceAdjustmentDetails.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {payment.advanceAdjustmentDetails.map((adj, idx) => (
                                <div key={idx} className="text-[10px] text-amber-700 font-sans font-normal">
                                  {isMr ? 'पावती क्र: ' : 'Advance Receipt: '}
                                  <span className="font-mono font-bold text-amber-900">{adj.receiptNumber}</span>
                                  {adj.adjustedAt && (
                                    <span className="ml-1 text-slate-500">
                                      ({new Date(adj.adjustedAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')})
                                    </span>
                                  )}
                                  <span className="ml-1 text-amber-800 font-semibold">— ₹{adj.amount?.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Current Direct Payment Received (shown if not 100% advance or if payment was received) */}
                    {(!isFullyAdv || currentPaid > 0) && (
                      <div className="grid grid-cols-12 p-2.5 bg-orange-50 font-bold">
                        <div className="col-span-5 text-orange-950">
                          {isMr ? 'सध्या जमा थेट रक्कम' : 'Current Direct Payment'}
                        </div>
                        <div className="col-span-7 text-sm font-black text-orange-700 font-mono">
                          ₹ {currentPaid.toLocaleString('en-IN')}
                        </div>
                      </div>
                    )}

                    {/* Total Amount Settled */}
                    <div className="grid grid-cols-12 p-2.5 bg-emerald-50/60 border-t border-b border-emerald-200">
                      <div className="col-span-5 text-emerald-950 font-semibold">
                        <div>{isMr ? 'एकूण समायोजित / भरलेली रक्कम' : 'Total Amount Settled'}</div>
                        {(advApplied > 0 || prevPaid > 0) && (
                          <div className="text-[10px] text-emerald-700 font-normal">
                            {isMr
                              ? `(${prevPaid > 0 ? `पूर्वी थेट ₹${prevPaid} + ` : ''}${advApplied > 0 ? `अ‍ॅडव्हान्स ₹${advApplied} + ` : ''}सध्या थेट ₹${currentPaid})`
                              : `(${prevPaid > 0 ? `Prev ₹${prevPaid} + ` : ''}${advApplied > 0 ? `Advance ₹${advApplied} + ` : ''}Current ₹${currentPaid})`}
                          </div>
                        )}
                      </div>
                      <div className="col-span-7 text-sm font-black text-emerald-800 font-mono self-center">
                        ₹ {totalSettled.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Remaining Balance Due */}
                    <div className="grid grid-cols-12 p-2.5 bg-white">
                      <div className="col-span-5 text-slate-500 font-medium">
                        {isMr ? 'शिल्लक येणे बाकी' : 'Remaining Balance'}
                      </div>
                      <div className="col-span-7 font-bold text-slate-900 font-mono">
                        ₹ {remBalance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </>
                )}

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
                  {isMr ? 'श्री ल.रा. कोळी' : 'Shri Laxman Koli'}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {isMr ? 'चेअरमन / सेक्रेटरी' : 'Chairman / Building Secretary'}
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
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-receipt {
                position: fixed !important;
                left: 50% !important;
                top: 10mm !important;
                transform: translateX(-50%) !important;
                width: 175mm !important;
                border: 2px solid #ea580c !important;
                border-radius: 12px !important;
                padding: 6mm 8mm !important;
                background: white !important;
                box-shadow: none !important;
              }
            }
          `
        }} />
      </div>
    </div>
  );
};

export default ReceiptModal;
