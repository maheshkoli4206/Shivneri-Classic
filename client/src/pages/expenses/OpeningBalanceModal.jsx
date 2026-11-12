import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const OpeningBalanceModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useLanguage();
  const isMr = lang === 'mr';

  const [cashAmount, setCashAmount] = useState('0');
  const [bankAmount, setBankAmount] = useState('0');
  const [upiAmount, setUpiAmount] = useState('0');
  const [chequeAmount, setChequeAmount] = useState('0');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/cashbook/opening-balance')
        .then(res => {
          if (res.data?.success && res.data.config) {
            const c = res.data.config;
            setCashAmount(String(c.cashAmount || 0));
            setBankAmount(String(c.bankAmount || 0));
            setUpiAmount(String(c.upiAmount || 0));
            setChequeAmount(String(c.chequeAmount || 0));
            if (c.effectiveDate) {
              setEffectiveDate(new Date(c.effectiveDate).toISOString().split('T')[0]);
            }
            setNotes(c.notes || '');
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const res = await api.put('/cashbook/opening-balance', {
        cashAmount: Number(cashAmount) || 0,
        bankAmount: Number(bankAmount) || 0,
        upiAmount: Number(upiAmount) || 0,
        chequeAmount: Number(chequeAmount) || 0,
        effectiveDate,
        notes
      });

      if (res.data?.success) {
        onSuccess(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isMr ? 'आरंभी शिल्लक जतन करताना त्रुटी आली' : 'Error updating opening balance'));
    } finally {
      setSubmitting(false);
    }
  };

  const total = (Number(cashAmount) || 0) + (Number(bankAmount) || 0) + (Number(upiAmount) || 0) + (Number(chequeAmount) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">{t('openingBalanceModalTitle')}</h3>
              <p className="text-xs text-slate-500">{t('openingBalanceModalDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2 my-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="opening-balance-form" className="flex-1 overflow-y-auto space-y-4 text-xs my-2 pr-1">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isMr ? 'रोख आरंभी शिल्लक (₹)' : 'Cash Balance (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isMr ? 'बँक खाते शिल्लक (₹)' : 'Bank Balance (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bankAmount}
                onChange={e => setBankAmount(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isMr ? 'यूपीआय शिल्लक (₹)' : 'UPI Balance (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={upiAmount}
                onChange={e => setUpiAmount(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isMr ? 'धनादेश शिल्लक (₹)' : 'Cheque In-Hand (₹)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={chequeAmount}
                onChange={e => setChequeAmount(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isMr ? 'प्रभावी दिनांक' : 'Effective Date'} <span className="text-orange-600">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isMr ? 'शेरा / ऑडिट कारण' : 'Audit Remarks / Reason'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={isMr ? 'उदा. आर्थिक वर्षाच्या सुरुवातीचा बँक व कॅश ताळेबंद...' : 'e.g. Fiscal opening balance for society accounts...'}
              className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
            {isMr ? (
              <>
                एकूण आरंभी शिल्लक: <span className="font-bold text-slate-900 font-mono">₹ {total.toLocaleString('en-IN')}</span>. ही माहिती कॅशबुकच्या सर्व पुढील गणनेसाठी वापरली जाईल.
              </>
            ) : (
              <>
                Total Opening Balance: <span className="font-bold text-slate-900 font-mono">₹ {total.toLocaleString('en-IN')}</span>. This amount sets the baseline for all cashbook calculations.
              </>
            )}
          </div>
        </form>

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
            form="opening-balance-form"
            disabled={submitting}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{submitting ? (isMr ? 'जतन होत आहे...' : 'Saving...') : t('saveConfigBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpeningBalanceModal;
