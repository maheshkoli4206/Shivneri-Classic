import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
      setError(err.response?.data?.message || err.message || 'Error cancelling payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {t('cancelModalTitle')}
              </h3>
              <p className="text-xs font-mono text-red-400 mt-0.5">
                {payment.receiptNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-4 leading-relaxed bg-slate-850 p-3 rounded-xl border border-slate-750">
          {t('cancelModalDesc')}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('cancelReasonLabel')} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                lang === 'mr'
                  ? 'उदा. चुकीची रक्कम नोंदवली, धनादेश वठला नाही, किंवा चुकीच्या सभासदाच्या खात्यावर नोंद झाली...'
                  : 'E.g., Wrong amount entered, cheque bounced, or recorded under incorrect resident...'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/50 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-all"
            >
              {t('btnCancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'प्रक्रिया सुरू आहे...' : t('cancelPaymentBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelPaymentModal;
