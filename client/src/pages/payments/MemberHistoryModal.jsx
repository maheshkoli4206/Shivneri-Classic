import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Home,
  Store,
  ShieldCheck,
  IndianRupee,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Eye,
  RefreshCw,
  ArrowRight,
  PlusCircle,
  Tag
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

const MONTH_NAMES_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const METHOD_LABELS_MR = {
  CASH: 'रोख (Cash)',
  UPI: 'यूपीआय (UPI)',
  BANK_TRANSFER: 'बँक ट्रान्सफर (Bank)',
  CHEQUE: 'धनादेश (Cheque)'
};

const METHOD_LABELS_EN = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque'
};

const MemberHistoryModal = ({
  isOpen,
  onClose,
  residentId,
  onSelectReceipt,
  onNavigateToPayBill
}) => {
  const { lang, t } = useLanguage();
  const isMr = lang === 'mr';

  const [activeTab, setActiveTab] = useState('dues'); // 'dues' | 'payments' | 'advance'
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !residentId) {
      setData(null);
      setError(null);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/payments/resident/${residentId}/history`);
        if (res.data?.success) {
          setData(res.data);
        } else {
          setError(res.data?.message || 'Failed to load member history');
        }
      } catch (err) {
        console.error('Failed to fetch member history:', err);
        setError(err.response?.data?.message || (isMr ? 'माहिती लोड करताना त्रुटी आली' : 'Failed to load member financial history'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, residentId, isMr]);

  if (!isOpen) return null;

  const resident = data?.resident;
  const summary = data?.summary || {
    totalBilled: 0,
    totalDirectPaid: 0,
    totalAdvanceAdjusted: 0,
    totalOutstanding: 0,
    pendingDuesCount: 0,
    paidDuesCount: 0,
    availableAdvanceBalance: 0,
    totalPaymentsCount: 0,
    totalAdvancesCount: 0
  };

  const dues = data?.dues || [];
  const payments = data?.payments || [];
  const advances = data?.advances || [];

  const getMonthName = (m) => {
    return isMr ? MONTH_NAMES_MR[m - 1] || m : MONTH_NAMES_EN[m - 1] || m;
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'RESIDENTIAL':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{isMr ? 'निवासी' : 'Residential'}</span>;
      case 'SHOP':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">{isMr ? 'दुकान' : 'Shop'}</span>;
      case 'CHAIRMAN':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">{isMr ? 'चेअरमन' : 'Chairman'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{isMr ? 'नियुक्त नाही' : 'Unassigned'}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 bg-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white truncate">
                  {resident?.fullNameMarathi || (isMr ? 'सभासद तपशील' : 'Member Financial History')}
                </h3>
                {resident?.flatNumber && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-orange-300 border border-slate-700">
                    {resident.flatNumber} ({resident.wing || 'A Wing'})
                  </span>
                )}
                {resident && getCategoryBadge(resident.maintenanceCategory)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isMr ? 'संपूर्ण आर्थिक इतिहास: देयके, पावत्या आणि अ‍ॅडव्हान्स खतावणी' : 'Complete financial profile, billing ledger, receipts and advance history'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-600" />
            <p className="text-sm font-medium">{isMr ? 'आर्थिक माहिती लोड होत आहे...' : 'Loading financial history...'}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : data && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">{isMr ? 'एकूण देयके आकारणी' : 'Total Billed'}</div>
                <div className="text-lg font-bold font-mono text-slate-900">₹ {(summary.totalBilled || 0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{dues.length} {isMr ? 'महिने देयक' : 'Monthly Bills'}</div>
              </div>

              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                <div className="text-[11px] font-semibold text-emerald-800 mb-1">{isMr ? 'एकूण जमा (थेट + अ‍ॅडव्हान्स)' : 'Total Paid / Settled'}</div>
                <div className="text-lg font-bold font-mono text-emerald-700">₹ {((summary.totalDirectPaid || 0) + (summary.totalAdvanceAdjusted || 0)).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {isMr ? `थेट: ₹${(summary.totalDirectPaid || 0).toLocaleString('en-IN')} | अ‍ॅड.: ₹${(summary.totalAdvanceAdjusted || 0).toLocaleString('en-IN')}` : `Direct: ₹${summary.totalDirectPaid} | Adv: ₹${summary.totalAdvanceAdjusted}`}
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border ${summary.totalOutstanding > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200/80'}`}>
                <div className={`text-[11px] font-semibold mb-1 ${summary.totalOutstanding > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
                  {isMr ? 'चालू शिल्लक बाकी' : 'Net Pending Dues'}
                </div>
                <div className={`text-lg font-bold font-mono ${summary.totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  ₹ {(summary.totalOutstanding || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {summary.pendingDuesCount > 0 ? (
                    <span className="text-rose-600 font-semibold">{summary.pendingDuesCount} {isMr ? 'थकीत महिने' : 'Pending Bills'}</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">{isMr ? 'सर्व देयके पूर्ण' : 'Fully Paid'}</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                <div className="text-[11px] font-semibold text-blue-800 mb-1">{isMr ? 'उपलब्ध अ‍ॅडव्हान्स शिल्लक' : 'Advance Credit Balance'}</div>
                <div className="text-lg font-bold font-mono text-blue-700">₹ {(summary.availableAdvanceBalance || 0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-blue-600 mt-0.5">
                  {isMr ? `जमा: ₹${(resident?.totalAdvanceReceived || 0).toLocaleString('en-IN')} | वापर: ₹${(resident?.totalAdvanceUtilized || 0).toLocaleString('en-IN')}` : `Recd: ₹${resident?.totalAdvanceReceived} | Used: ₹${resident?.totalAdvanceUtilized}`}
                </div>
              </div>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex flex-wrap border-b border-slate-200 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('dues')}
                className={`min-h-[44px] pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dues'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{isMr ? 'मासिक देयके' : 'Monthly Bills'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 font-mono">{dues.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`min-h-[44px] pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'payments'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isMr ? 'भरणा पावत्या' : 'Payment Receipts'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 font-mono">{payments.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('advance')}
                className={`min-h-[44px] pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'advance'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isMr ? 'अ‍ॅडव्हान्स खतावणी' : 'Advance Credit Ledger'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 font-mono">{advances.length}</span>
              </button>
            </div>

            {/* TAB 1: MONTHLY MAINTENANCE DUES */}
            {activeTab === 'dues' && (
              <div className="space-y-3">
                {dues.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {isMr ? 'कोणतीही देयके उपलब्ध नाहीत.' : 'No maintenance bills recorded for this member.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{isMr ? 'महिना / वर्ष' : 'Period'}</th>
                          <th className="p-3 text-right">{isMr ? 'आकारणी (₹)' : 'Billed (₹)'}</th>
                          <th className="p-3 text-right">{isMr ? 'थेट भरणा (₹)' : 'Direct Paid (₹)'}</th>
                          <th className="p-3 text-right">{isMr ? 'अ‍ॅडव्हान्स (₹)' : 'Advance (₹)'}</th>
                          <th className="p-3 text-right">{isMr ? 'शिल्लक बाकी (₹)' : 'Outstanding (₹)'}</th>
                          <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                          <th className="p-3 text-center">{isMr ? 'कृती' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dues.map((due) => (
                          <tr key={due._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-semibold text-slate-900">
                              {getMonthName(due.month)} {due.year}
                              {due.dueDate && (
                                <div className="text-[10px] font-normal text-slate-400">
                                  {isMr ? 'देय दिनांक' : 'Due'}: {new Date(due.dueDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              ₹ {(due.totalAmountDue || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-700">
                              ₹ {(due.amountPaid || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-right font-mono text-blue-700">
                              {due.advanceAdjustedAmount > 0 ? `₹ ${(due.advanceAdjustedAmount).toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className={`p-3 text-right font-mono font-bold ${due.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              ₹ {(due.outstandingBalance || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-center">
                              {due.status === 'PAID' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {isMr ? 'पूर्ण पेड' : 'PAID'}
                                </span>
                              ) : due.status === 'PARTIAL' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {isMr ? 'अंशतः भरणा' : 'PARTIAL'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {isMr ? 'थकीत' : 'UNPAID'}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {due.outstandingBalance > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onNavigateToPayBill) onNavigateToPayBill(due);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                                >
                                  {isMr ? 'पेमेंट भरा' : 'Pay Bill'}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">✓ {isMr ? 'पूर्ण' : 'Cleared'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OFFICIAL PAYMENT RECEIPTS */}
            {activeTab === 'payments' && (
              <div className="space-y-3">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {isMr ? 'कोणतीही पावती उपलब्ध नाही.' : 'No payment receipts found for this resident.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3">{isMr ? 'पावती क्रमांक' : 'Receipt No'}</th>
                          <th className="p-3">{isMr ? 'तारीख' : 'Date'}</th>
                          <th className="p-3">{isMr ? 'महिना / वर्ष' : 'Billing Month'}</th>
                          <th className="p-3 text-right">{isMr ? 'जमा रक्कम (₹)' : 'Amount (₹)'}</th>
                          <th className="p-3">{isMr ? 'पद्धत' : 'Method'}</th>
                          <th className="p-3">{isMr ? 'संदर्भ / UTR' : 'Ref / UTR'}</th>
                          <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                          <th className="p-3 text-center">{isMr ? 'पावती' : 'View'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-mono font-bold text-orange-600">
                              {p.receiptNumber}
                            </td>
                            <td className="p-3 text-slate-600 font-mono">
                              {new Date(p.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {getMonthName(p.month)} {p.year}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                              ₹ {(p.amountReceived || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-slate-700">
                              {isMr ? METHOD_LABELS_MR[p.paymentMethod] || p.paymentMethod : METHOD_LABELS_EN[p.paymentMethod] || p.paymentMethod}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {p.transactionRef || '-'}
                            </td>
                            <td className="p-3 text-center">
                              {p.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {isMr ? 'सक्रिय' : 'COMPLETED'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {isMr ? 'रद्द' : 'CANCELLED'}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectReceipt) onSelectReceipt(p);
                                }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                title={isMr ? 'पावती पहा व प्रिंट करा' : 'View & Print Receipt'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADVANCE CREDIT LEDGER */}
            {activeTab === 'advance' && (
              <div className="space-y-3">
                {advances.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {isMr ? 'कोणतीही अ‍ॅडव्हान्स ठेव नोंद आढळली नाही.' : 'No advance payment credits recorded for this resident.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {advances.map((adv) => (
                      <div key={adv._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-orange-600 text-sm">{adv.receiptNumber}</span>
                            <span className="text-xs text-slate-500 font-mono">
                              • {new Date(adv.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              adv.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : adv.status === 'FULLY_UTILIZED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {adv.status === 'ACTIVE' ? (isMr ? 'सक्रिय शिल्लक' : 'ACTIVE') : adv.status === 'FULLY_UTILIZED' ? (isMr ? 'पूर्ण वापर' : 'FULLY UTILIZED') : adv.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectReceipt) {
                                onSelectReceipt({
                                  ...adv,
                                  isAdvancePayment: true
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isMr ? 'अ‍ॅडव्हान्स पावती पहा' : 'View Advance Receipt'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">{isMr ? 'जमा केलेली रक्कम:' : 'Original Deposit:'}</span>
                            <span className="font-mono font-bold text-slate-900">₹ {(adv.amountReceived || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">{isMr ? 'वापरलेली रक्कम:' : 'Utilized:'}</span>
                            <span className="font-mono font-bold text-blue-700">₹ {(adv.usedAmount || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">{isMr ? 'उपलब्ध शिल्लक:' : 'Available Credit:'}</span>
                            <span className="font-mono font-bold text-emerald-700">₹ {(adv.availableBalance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Adjustments Sub-List */}
                        {adv.adjustments && adv.adjustments.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/70">
                            <span className="text-[11px] font-semibold text-slate-700 mb-1.5 block">
                              {isMr ? 'देयकांवर समायोजित केलेल्या नोंदी:' : 'Adjustments against Monthly Bills:'}
                            </span>
                            <div className="space-y-1">
                              {adv.adjustments.map((adj, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                                  <span className="font-medium text-slate-700">
                                    {getMonthName(adj.month)} {adj.year} {isMr ? 'देखभाल देयक' : 'Maintenance Bill'}
                                  </span>
                                  <span className="font-mono font-bold text-blue-700">
                                    - ₹ {(adj.amountApplied || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {resident?.mobileNumber ? `📞 ${resident.mobileNumber}` : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
          >
            {isMr ? 'बंद करा' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberHistoryModal;
