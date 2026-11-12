import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const CancelPaymentModal = ({ isOpen, onClose, payment, onConfirm }) => {
  const { t, lang } = useLanguage();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError(
        lang === 'mr'
          ? 'कृपया किमान ५ अक्षरांचे वैध कारण प्रविष्ट करा.'
          : 'Please enter a valid reason with at least 5 characters.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onConfirm(payment._id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || (lang === 'mr' ? 'पेमेंट रद्द करताना त्रुटी आली' : 'Error cancelling payment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-900 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {t('cancelModalTitle')}
              </h3>
              <p className="text-xs font-mono font-semibold text-red-600 mt-0.5">
                {payment.receiptNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-3 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {t('cancelModalDesc')}
          </p>

          <form onSubmit={handleSubmit} id="cancel-payment-form" className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('cancelReasonLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  lang === 'mr'
                    ? 'उदा. चुकीची रक्कम नोंदवली, धनादेश वठला नाही, किंवा चुकीच्या खात्यावर नोंद झाली...'
                    : 'E.g., Wrong amount entered, cheque bounced, or recorded under incorrect resident...'
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
          >
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            form="cancel-payment-form"
            disabled={submitting}
            className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? (lang === 'mr' ? 'रद्द होत आहे...' : 'Cancelling...') : t('cancelPaymentBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelPaymentModal;
