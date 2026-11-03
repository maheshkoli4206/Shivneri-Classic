import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Download,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  Building,
  Building2,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Eye,
  Check,
  LayoutDashboard,
  Users,
  Wallet,
  Globe,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ReceiptModal from './ReceiptModal';
import CancelPaymentModal from './CancelPaymentModal';

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

const PaymentManagement = () => {
  const { logout } = useAuth();
  const { lang, t, toggleLanguage } = useLanguage();
  const isMr = lang === 'mr';

  // Active Tab: 'history' or 'record'
  const [activeTab, setActiveTab] = useState('history');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Dashboard Metrics
  const [summary, setSummary] = useState({
    totalBilledAmount: 0,
    totalCollectedAmount: 0,
    totalOutstandingAmount: 0,
    fullPaymentsCount: 0,
    partialPaymentsCount: 0,
    unpaidDuesCount: 0,
    completedPaymentsCount: 0,
    cancelledPaymentsCount: 0
  });

  // Payments History List
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, totalPages: 1 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('2026');

  // Record Payment Workflow Form State
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [residentDues, setResidentDues] = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [selectedDueId, setSelectedDueId] = useState('');
  const [selectedDue, setSelectedDue] = useState(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Review & Confirmation Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null); // holds created payment

  // View Receipt Modal
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Cancellation Modal
  const [paymentToCancel, setPaymentToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Notifications
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 6000);
  };

  // Fetch Summary Metrics
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await axios.get('/api/v1/payments/dashboard/summary', { withCredentials: true });
      if (res.data?.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch payment summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Payments History
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        paymentMethod: filterMethod || undefined,
        status: filterStatus || undefined,
        year: filterYear || undefined,
        page: pagination.currentPage,
        limit: 15
      };
      const res = await axios.get('/api/v1/payments', {
        params,
        withCredentials: true
      });
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      showAlert(err.response?.data?.message || 'पेमेंट इतिहास मिळवताना त्रुटी आली', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Residents Master
  const fetchResidents = async () => {
    try {
      const res = await axios.get('/api/v1/residents?status=ACTIVE', { withCredentials: true });
      if (res.data?.success) {
        setResidents(res.data.residents || []);
      }
    } catch (err) {
      console.error('Failed to fetch residents:', err);
    }
  };

  // Fetch Dues for Selected Resident
  const fetchResidentDues = async (resId) => {
    if (!resId) {
      setResidentDues([]);
      setSelectedDueId('');
      setSelectedDue(null);
      return;
    }
    try {
      setDuesLoading(true);
      const res = await axios.get('/api/v1/maintenance/dues', {
        params: { residentId: resId, status: 'ALL' },
        withCredentials: true
      });
      if (res.data?.success) {
        // Filter out fully paid bills, show unpaid and partial first
        const dues = res.data.dues || [];
        setResidentDues(dues);

        // Auto-select first unpaid or partial due
        const firstPending = dues.find(d => d.status !== 'PAID') || dues[0];
        if (firstPending) {
          setSelectedDueId(firstPending._id);
          setSelectedDue(firstPending);
          setPaymentAmount(firstPending.outstandingBalance > 0 ? String(firstPending.outstandingBalance) : '');
        } else {
          setSelectedDueId('');
          setSelectedDue(null);
          setPaymentAmount('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch dues for resident:', err);
    } finally {
      setDuesLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchResidents();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filterMethod, filterStatus, filterYear, pagination.currentPage]);

  // Handle Resident Selection in Form
  const handleResidentChange = (resId) => {
    setSelectedResidentId(resId);
    fetchResidentDues(resId);
  };

  // Handle Due Selection in Form
  const handleDueChange = (dueId) => {
    setSelectedDueId(dueId);
    const due = residentDues.find(d => d._id === dueId);
    setSelectedDue(due || null);
    if (due) {
      setPaymentAmount(due.outstandingBalance > 0 ? String(due.outstandingBalance) : '');
    }
  };

  // Review Payment Before Submit
  const handleOpenReview = (e) => {
    e.preventDefault();
    if (!selectedResidentId) {
      showAlert(isMr ? 'कृपया सभासद निवडा' : 'Please select resident', 'error');
      return;
    }
    if (!selectedDueId || !selectedDue) {
      showAlert(isMr ? 'कृपया मासिक देयक निवडा' : 'Please select maintenance due', 'error');
      return;
    }
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert(isMr ? 'कृपया वैध रक्कम भरा (शून्यापेक्षा जास्त)' : 'Enter valid amount (> 0)', 'error');
      return;
    }
    if (amt > selectedDue.outstandingBalance) {
      showAlert(
        isMr
          ? `जमा रक्कम (₹${amt}) ही शिल्लक थकबाकीपेक्षा (₹${selectedDue.outstandingBalance}) जास्त असू शकत नाही`
          : `Amount exceeds outstanding balance (₹${selectedDue.outstandingBalance})`,
        'error'
      );
      return;
    }

    setIsReviewOpen(true);
  };

  // Final Submit Payment
  const handleConfirmPayment = async () => {
    try {
      setSubmittingPayment(true);
      // Generate client-side unique idempotency key
      const idempotencyKey = `pay_${selectedDueId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        maintenanceDueId: selectedDueId,
        amountReceived: Number(paymentAmount),
        paymentDate,
        paymentMethod,
        transactionRef,
        remarks,
        idempotencyKey
      };

      const res = await axios.post('/api/v1/payments/record', payload, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      });

      if (res.data?.success) {
        setIsReviewOpen(false);
        setPaymentSuccess(res.data.payment);
        showAlert(res.data.message || 'पेमेंट यशस्वीरीत्या नोंदवले गेले!', 'success');

        // Reset Form
        setPaymentAmount('');
        setTransactionRef('');
        setRemarks('');
        fetchResidentDues(selectedResidentId);
        fetchSummary();
        fetchPayments();
      }
    } catch (err) {
      console.error('Payment submission failed:', err);
      showAlert(err.response?.data?.message || 'पेमेंट नोंदवताना त्रुटी आली', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Cancel Payment
  const handleCancelPaymentConfirm = async (paymentId, reason) => {
    try {
      const res = await axios.patch(
        `/api/v1/payments/${paymentId}/cancel`,
        { cancellationReason: reason },
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          withCredentials: true
        }
      );
      if (res.data?.success) {
        showAlert(res.data.message || 'पेमेंट पावती यशस्वीरीत्या रद्द केली', 'success');
        fetchSummary();
        fetchPayments();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      showAlert(err.response?.data?.message || 'पेमेंट रद्द करताना त्रुटी आली', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('appName')}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {t('wing')}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t('location')}</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navDashboard')}</span>
            </Link>

            <Link
              to="/residents"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navResidents')}</span>
            </Link>

            <Link
              to="/maintenance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navMaintenance')}</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t('navPayments')}</span>
            </div>

            <Link
              to="/expenses"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navExpenses')}</span>
            </Link>

            <button
              onClick={toggleLanguage}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('langSwitch')}</span>
            </button>

            <button
              onClick={logout}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('logoutButton')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-orange-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  SHIVNERI CLASSIC APARTMENT – A WING
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Phase 6: Receipts & Payments
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {t('paymentsTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                {t('paymentsSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  fetchSummary();
                  fetchPayments();
                }}
                disabled={loading || summaryLoading}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-all hover:text-white"
                title="Refresh Records"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || summaryLoading) ? 'animate-spin text-orange-400' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('record')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('recordPaymentBtn')}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('tabPaymentHistory')}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300">
                {summary.completedPaymentsCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'record'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t('tabRecordPayment')}</span>
            </button>
          </div>
        </div>

        {/* Global Notifications Alert */}
        {alert && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 border shadow-lg text-xs sm:text-sm transition-all ${
              alert.type === 'error'
                ? 'bg-red-950/60 border-red-500/50 text-red-200'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {alert.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        {/* Dashboard Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>{t('totalBilledLabel')}</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-black text-white">
              ₹ {summary.totalBilledAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              १६ सभासद × ₹१,००० प्रतिमहिना
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>{t('totalCollectedLabel')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-black text-emerald-400">
              ₹ {summary.totalCollectedAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1">
              {summary.completedPaymentsCount} अधिकृत पावत्या तयार
            </div>
          </div>

          <div className="bg-slate-900/80 border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between text-orange-400 text-xs font-semibold">
              <span>{t('totalOutstandingLabel')}</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-2 text-lg sm:text-2xl font-black text-orange-400">
              ₹ {summary.totalOutstandingAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-orange-400/80 mt-1">
              {summary.unpaidDuesCount} थकीत + {summary.partialPaymentsCount} अंशता शिल्लक
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>भरणा स्थिती वर्गीकरण</span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-emerald-400">पूर्ण भरलेले:</span>
                <span className="font-bold">{summary.fullPaymentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">अंशतः भरलेले:</span>
                <span className="font-bold">{summary.partialPaymentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">थकीत देयके:</span>
                <span className="font-bold">{summary.unpaidDuesCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: RECORD MANUAL PAYMENT */}
        {activeTab === 'record' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-400" />
                  <span>{t('tabRecordPayment')}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  सभासदाने रोख, यूपीआय किंवा बँकेद्वारे जमा केलेले शुल्क नोंदवून तात्काळ अधिकृत पावती (SCA-YYYYMM-XXXX) तयार करा.
                </p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                Single Super Admin Protected
              </span>
            </div>

            {/* Step 1 & 2: Select Resident & Select Due */}
            <form onSubmit={handleOpenReview} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Resident Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    १. सभासद निवडा (Select Resident) <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={selectedResidentId}
                    onChange={(e) => handleResidentChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  >
                    <option value="">-- सभासदाचे नाव निवडा --</option>
                    {residents.map((r, idx) => (
                      <option key={r._id} value={r._id}>
                        {idx + 1}. {r.fullNameMarathi} {r.flatNumber ? `(सदनिका: ${r.flatNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    २. मासिक देयक निवडा (Select Maintenance Due) <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={selectedDueId}
                    onChange={(e) => handleDueChange(e.target.value)}
                    disabled={!selectedResidentId || duesLoading}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    required
                  >
                    {duesLoading ? (
                      <option>देयके लोड होत आहेत...</option>
                    ) : residentDues.length === 0 ? (
                      <option value="">-- या सभासदासाठी कोणतीही देयके उपलब्ध नाहीत --</option>
                    ) : (
                      residentDues.map((d) => (
                        <option key={d._id} value={d._id}>
                          {MONTH_NAMES_MR[d.month]} {d.year} — देय: ₹{d.totalAmountDue} | भरले: ₹{d.amountPaid} | बाकी: ₹{d.outstandingBalance} ({d.status})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Selected Due Summary Card */}
              {selectedDue && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">महिना व वर्ष:</span>
                    <p className="font-bold text-white text-sm mt-0.5">
                      {MONTH_NAMES_MR[selectedDue.month]} {selectedDue.year}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">एकूण देय रक्कम:</span>
                    <p className="font-bold text-slate-200 text-sm mt-0.5">
                      ₹ {selectedDue.totalAmountDue?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">आधी भरलेली रक्कम:</span>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5">
                      ₹ {selectedDue.amountPaid?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">चालू शिल्लक थकबाकी:</span>
                    <p className="font-bold text-orange-400 text-sm mt-0.5">
                      ₹ {selectedDue.outstandingBalance?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      जमा रक्कम (₹) <span className="text-orange-400">*</span>
                    </label>
                    {selectedDue && selectedDue.outstandingBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(selectedDue.outstandingBalance))}
                        className="text-[10px] text-orange-400 hover:underline font-semibold"
                      >
                        पूर्ण बाकी भरा (₹{selectedDue.outstandingBalance})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedDue ? selectedDue.outstandingBalance : undefined}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="उदा. 1000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    भरणा तारीख (Payment Date) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    भरणा पद्धत (Payment Method) <span className="text-orange-400">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    required
                  >
                    <option value="UPI">{t('methodUPI')}</option>
                    <option value="CASH">{t('methodCash')}</option>
                    <option value="BANK_TRANSFER">{t('methodBank')}</option>
                    <option value="CHEQUE">{t('methodCheque')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    संदर्भ / UTR / धनादेश क्र.
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="उदा. 431289123891 किंवा Cheque #102938"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  शेरा / टीप (Optional Remarks)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="उदा. PhonePe द्वारे जमा, किंवा रोख पावती हस्ते श्री कोळी..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResidentId('');
                    setSelectedDueId('');
                    setSelectedDue(null);
                    setPaymentAmount('');
                    setTransactionRef('');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700"
                >
                  रीसेट करा (Reset)
                </button>

                <button
                  type="submit"
                  disabled={!selectedDue || !paymentAmount}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50"
                >
                  <span>तपशील तपासा व पुढे जा (Review & Confirm)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: PAYMENTS HISTORY & RECEIPTS REGISTER */}
        {activeTab === 'history' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
                  placeholder={
                    isMr
                      ? 'पावती क्र. (SCA-...), सभासद नाव, किंवा UTR शोधा...'
                      : 'Search receipt no, resident, or UTR...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Method Filter */}
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="">सर्व पद्धती (All Modes)</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">CASH</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="">सर्व पावत्या (All Status)</option>
                  <option value="COMPLETED">वैध पावत्या (COMPLETED)</option>
                  <option value="CANCELLED">रद्द केलेल्या (CANCELLED)</option>
                </select>

                {/* Year Filter */}
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                >
                  <option value="">सर्व वर्षे (All Years)</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>

                <button
                  onClick={fetchPayments}
                  className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-all"
                >
                  शोधा
                </button>
              </div>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">पावती क्रमांक (Receipt No)</th>
                    <th className="py-3 px-4">सभासदाचे नाव</th>
                    <th className="py-3 px-3">कालावधी</th>
                    <th className="py-3 px-3">जमा रक्कम (₹)</th>
                    <th className="py-3 px-3">शिल्लक थकबाकी</th>
                    <th className="py-3 px-3">पेमेंट दिनांक</th>
                    <th className="py-3 px-3">पद्धत</th>
                    <th className="py-3 px-3">स्थिती</th>
                    <th className="py-3 px-4 text-right">कृती (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-400" />
                        <span>पावती नोंदवही लोड होत आहे...</span>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        कोणतीही पेमेंट पावती आढळली नाही. नवीन पेमेंट नोंदवण्यासाठी 'नवीन पेमेंट नोंदणी' टॅब वापरा.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const isCancelled = p.status === 'CANCELLED';
                      return (
                        <tr
                          key={p._id}
                          className={`hover:bg-slate-850/50 transition-colors ${
                            isCancelled ? 'opacity-60 bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-orange-300">
                            {p.receiptNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{p.residentNameMarathi}</div>
                            {p.flatNumber && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                सदनिका: {p.flatNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            {MONTH_NAMES_MR[p.month]} {p.year}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400 text-sm whitespace-nowrap">
                            ₹ {p.amountReceived?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-300 whitespace-nowrap">
                            ₹ {p.remainingBalance?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isCancelled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/40">
                                रद्द (CANCELLED)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                                वैध (VALID)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View / Print Receipt */}
                              <button
                                onClick={() => {
                                  setSelectedPaymentForReceipt(p);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all"
                                title="पावती पहा / प्रिंट करा"
                              >
                                <Eye className="w-3.5 h-3.5 text-orange-400" />
                              </button>

                              {/* Download PDF directly from server */}
                              <a
                                href={`/api/v1/payments/${p._id}/receipt-pdf?lang=${lang}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-all"
                                title="पीडीएफ डाउनलोड करा"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                              </a>

                              {/* Audited Cancellation (Only if COMPLETED) */}
                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    setPaymentToCancel(p);
                                    setIsCancelModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-all"
                                  title="पावती रद्द करा (Audited Cancellation)"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  एकूण {pagination.totalCount} पावत्या (पान {pagination.currentPage} / {pagination.totalPages})
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.currentPage <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-40"
                  >
                    मागील
                  </button>
                  <button
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-40"
                  >
                    पुढील
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: PRE-SUBMISSION PAYMENT REVIEW */}
        {isReviewOpen && selectedDue && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-orange-500/40 rounded-2xl shadow-2xl p-6 text-white space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{t('paymentReviewTitle')}</h3>
                  <p className="text-xs text-slate-400">{t('paymentReviewDesc')}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">सभासदाचे नाव:</span>
                  <span className="font-bold text-white">
                    {residents.find(r => r._id === selectedResidentId)?.fullNameMarathi}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">कालावधी (महिना/वर्ष):</span>
                  <span className="font-semibold text-orange-300">
                    {MONTH_NAMES_MR[selectedDue.month]} {selectedDue.year}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">एकूण देय रक्कम:</span>
                  <span className="font-semibold text-slate-200">
                    ₹ {selectedDue.totalAmountDue?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">सध्या जमा होणारी रक्कम:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹ {Number(paymentAmount)?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">या पेमेंटनंतर शिल्लक थकबाकी:</span>
                  <span className="font-bold text-orange-400 text-sm">
                    ₹ {(selectedDue.outstandingBalance - Number(paymentAmount))?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">भरणा पद्धत:</span>
                  <span className="font-semibold text-slate-200">{paymentMethod}</span>
                </div>
                {transactionRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">संदर्भ / UTR:</span>
                    <span className="font-mono text-slate-200">{transactionRef}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">पेमेंट दिनांक:</span>
                  <span className="font-semibold text-slate-200">{paymentDate}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  पुष्टी केल्यानंतर तात्काळ अधिकृत पावती क्रमांक (SCA-YYYYMM-XXXX) वाटप केला जाईल आणि देयकातील शिल्लक अपडेट केली जाईल.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700"
                >
                  बदल करा (Edit)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{submittingPayment ? 'जतन होत आहे...' : 'होय, पेमेंट नोंदवून पावती बनवा'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: SUCCESS CONFIRMATION WITH RECEIPT ACTION */}
        {paymentSuccess && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 text-white text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-bold text-lg text-emerald-300">
                  {t('paymentSuccessTitle')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  अधिकृत पावती क्रमांक यशस्वीरीत्या तयार झाला आहे:
                </p>
                <div className="mt-2 inline-block px-4 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 font-mono text-base font-black border border-orange-500/40">
                  {paymentSuccess.receiptNumber}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl text-xs text-left space-y-1.5 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">सभासद:</span>
                  <span className="font-bold text-white">{paymentSuccess.residentNameMarathi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">जमा रक्कम:</span>
                  <span className="font-bold text-emerald-400">
                    ₹ {paymentSuccess.amountReceived?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">शिल्लक येणे बाकी:</span>
                  <span className="font-bold text-orange-400">
                    ₹ {paymentSuccess.remainingBalance?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedPaymentForReceipt(paymentSuccess);
                    setIsReceiptModalOpen(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/30 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('viewReceiptBtn')}</span>
                </button>

                <button
                  onClick={() => setPaymentSuccess(null)}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition-all"
                >
                  बंद करा (Close)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PRINTABLE RECEIPT DIALOG */}
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          payment={selectedPaymentForReceipt}
        />

        {/* MODAL: AUDITED PAYMENT CANCELLATION */}
        <CancelPaymentModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          payment={paymentToCancel}
          onConfirm={handleCancelPaymentConfirm}
        />
      </main>
    </div>
  );
};

export default PaymentManagement;

