import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, X, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const OpeningBalanceModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useLanguage();
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
      axios.get('/api/v1/cashbook/opening-balance', { withCredentials: true })
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
      const res = await axios.put(
        '/api/v1/cashbook/opening-balance',
        {
          cashAmount: Number(cashAmount) || 0,
          bankAmount: Number(bankAmount) || 0,
          upiAmount: Number(upiAmount) || 0,
          chequeAmount: Number(chequeAmount) || 0,
          effectiveDate,
          notes
        },
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          withCredentials: true
        }
      );

      if (res.data?.success) {
        onSuccess(res.data.message);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error updating opening balance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">{t('openingBalanceModalTitle')}</h3>
              <p className="text-xs text-slate-400">{t('openingBalanceModalDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                रोख आरंभी शिल्लक (Cash) (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                बँक खाते शिल्लक (Bank) (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bankAmount}
                onChange={e => setBankAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                यूपीआय खात्यात शिल्लक (UPI) (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={upiAmount}
                onChange={e => setUpiAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                धनादेश शिल्लक (Cheque) (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={chequeAmount}
                onChange={e => setChequeAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              प्रभावी दिनांक (Effective Date) <span className="text-orange-400">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              शेरा / ऑडिट कारण (Audit Notes)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="उदा. आर्थिक वर्षाच्या सुरुवातीचा बँक व कॅश ताळेबंद..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-[11px]">
            एकूण आरंभी शिल्लक: <span className="font-bold text-white">₹ {(Number(cashAmount) + Number(bankAmount) + Number(upiAmount) + Number(chequeAmount)).toLocaleString('en-IN')}</span>. ही माहिती कॅशबुकच्या सर्व पुढील गणनेसाठी वापरली जाईल.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
            >
              {t('btnCancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/30 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'जतन होत आहे...' : t('saveConfigBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpeningBalanceModal;
