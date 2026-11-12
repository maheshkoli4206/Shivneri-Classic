import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  XCircle,
  ChevronRight,
  Building,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import ReceiptModal from './ReceiptModal';
import CancelPaymentModal from './CancelPaymentModal';
import FinancialDrilldownModal from './FinancialDrilldownModal';
import MemberHistoryModal from './MemberHistoryModal';

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
  const { lang, t } = useLanguage();
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

  const isFullyPaid = Boolean(selectedDue && ((selectedDue.outstandingBalance ?? 0) <= 0 || selectedDue.status === 'PAID'));
  const currentOutstanding = selectedDue ? Math.max(0, Number(selectedDue.outstandingBalance ?? 0)) : 0;

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Review & Confirmation Modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // View Receipt Modal
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    window.__openReceiptPreview = (paymentData) => {
      setSelectedPaymentForReceipt(paymentData);
      setIsReceiptModalOpen(true);
    };
    return () => {
      delete window.__openReceiptPreview;
    };
  }, []);

  // Cancellation Modal
  const [paymentToCancel, setPaymentToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Financial Summary Drill-down Modals State
  const [drilldownType, setDrilldownType] = useState(null); // 'billed' | 'collected' | 'outstanding' | 'advance'
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [historyResidentId, setHistoryResidentId] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const handleOpenDrilldown = (type) => {
    setDrilldownType(type);
    setIsDrilldownOpen(true);
  };

  const handleOpenResidentHistory = (resId) => {
    setHistoryResidentId(resId);
    setIsHistoryModalOpen(true);
  };

  const handleNavigateToPayBill = (due) => {
    setIsDrilldownOpen(false);
    setIsHistoryModalOpen(false);
    setActiveTab('record');
    const rId = due.residentId?._id || due.residentId;
    setSelectedResidentId(rId);
    setSelectedDueId(due._id);
    setSelectedDue(due);
    setPaymentAmount(String(due.outstandingBalance ?? ''));
    if (rId) {
      fetchResidentDues(rId);
    }
  };

  // Advance Payment State
  const [advancePayments, setAdvancePayments] = useState([]);
  const [advanceSummary, setAdvanceSummary] = useState({ totalAdvanceReceived: 0, totalAdvanceUtilized: 0, totalAdvanceBalance: 0 });
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [advanceResidentId, setAdvanceResidentId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceMethod, setAdvanceMethod] = useState('UPI');
  const [advanceRef, setAdvanceRef] = useState('');
  const [advanceRemarks, setAdvanceRemarks] = useState('');
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [advanceSearch, setAdvanceSearch] = useState('');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState('');
  const [advanceToCancel, setAdvanceToCancel] = useState(null);
  const [isCancelAdvanceModalOpen, setIsCancelAdvanceModalOpen] = useState(false);

  // Notifications
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 6000);
  };

  const getMonthName = (mNum) => {
    const idx = Number(mNum);
    return isMr ? (MONTH_NAMES_MR[idx] || mNum) : (MONTH_NAMES_EN[idx] || mNum);
  };

  // Fetch Summary Metrics
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await api.get('/payments/dashboard/summary');
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
      const res = await api.get('/payments', { params });
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        setPagination(res.data.pagination || { totalCount: 0, currentPage: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      showAlert(err.response?.data?.message || (isMr ? 'पेमेंट इतिहास मिळवताना त्रुटी आली' : 'Failed to fetch payment history'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Residents Master
  const fetchResidents = async () => {
    try {
      const res = await api.get('/residents', { params: { status: 'ACTIVE' } });
      if (res.data?.success) {
        setResidents(res.data.residents || []);
      }
    } catch (err) {
      console.error('Failed to fetch residents:', err);
    }
  };

  // Fetch Dues for Selected Resident
  const fetchResidentDues = async (residentId) => {
    if (!residentId) {
      setResidentDues([]);
      setSelectedDueId('');
      setSelectedDue(null);
      return;
    }
    try {
      setDuesLoading(true);
      // Calls the dedicated resident dues endpoint (which delegates cleanly to getMaintenanceDues)
      const res = await api.get(`/payments/resident/${residentId}/dues`);
      if (res.data?.success) {
        const duesList = res.data.dues || [];
        setResidentDues(duesList);
        if (duesList.length > 0) {
          // Pre-select first pending/unpaid due if available, otherwise first due
          const firstPending = duesList.find(d => (d.outstandingBalance ?? 0) > 0) || duesList[0];
          setSelectedDueId(firstPending._id);
          setSelectedDue(firstPending);
          if ((firstPending.outstandingBalance ?? 0) > 0) {
            setPaymentAmount(String(firstPending.outstandingBalance));
          } else {
            setPaymentAmount('');
          }
        } else {
          setSelectedDueId('');
          setSelectedDue(null);
          setPaymentAmount('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch resident dues:', err);
      showAlert(err.response?.data?.message || (isMr ? 'सभासदाची देयके मिळवताना त्रुटी आली' : 'Failed to fetch resident dues'), 'error');
    } finally {
      setDuesLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchResidents();
    fetchPayments();
  }, [filterYear, pagination.currentPage]);

  const handleResidentChange = (rId) => {
    setSelectedResidentId(rId);
    fetchResidentDues(rId);
  };

  const handleDueChange = (dId) => {
    setSelectedDueId(dId);
    const due = residentDues.find(d => d._id === dId);
    setSelectedDue(due || null);
    if (due && (due.outstandingBalance ?? 0) > 0) {
      setPaymentAmount(String(due.outstandingBalance));
    } else {
      setPaymentAmount('');
    }
  };

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
    const balance = selectedDue.outstandingBalance ?? 0;
    if (balance <= 0 || selectedDue.status === 'PAID') {
      showAlert(
        isMr
          ? 'हे मासिक देयक आधीच पूर्ण भरलेले आहे. आगाऊ भरण्यासाठी कृपया अ‍ॅडव्हान्स पेमेंट टॅब वापरा.'
          : 'This maintenance bill is already fully paid. To record advance for future months, please use the Advance Payment tab.',
        'error'
      );
      return;
    }
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt < 0.01) {
      showAlert(isMr ? 'कृपया वैध रक्कम भरा (किमान ₹०.०१)' : 'Enter valid amount (min ₹0.01)', 'error');
      return;
    }
    if (amt > balance) {
      showAlert(
        isMr
          ? `जमा रक्कम (₹${amt}) ही शिल्लक थकबाकीपेक्षा (₹${balance}) जास्त असू शकत नाही`
          : `Amount exceeds outstanding balance (₹${balance})`,
        'error'
      );
      return;
    }

    setIsReviewOpen(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setSubmittingPayment(true);
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

      const res = await api.post('/payments/record', payload);

      if (res.data?.success) {
        setIsReviewOpen(false);
        setPaymentSuccess(res.data.payment);
        showAlert(res.data.message || (isMr ? 'पेमेंट यशस्वीरीत्या नोंदवले गेले!' : 'Payment recorded successfully!'), 'success');

        setPaymentAmount('');
        setTransactionRef('');
        setRemarks('');
        fetchResidentDues(selectedResidentId);
        fetchSummary();
        fetchPayments();
      }
    } catch (err) {
      console.error('Payment submission failed:', err);
      showAlert(err.response?.data?.message || (isMr ? 'पेमेंट नोंदवताना त्रुटी आली' : 'Failed to record payment'), 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCancelPaymentConfirm = async (paymentId, reason) => {
    try {
      const res = await api.patch(`/payments/${paymentId}/cancel`, { cancellationReason: reason });
      if (res.data?.success) {
        showAlert(res.data.message || (isMr ? 'पेमेंट पावती यशस्वीरीत्या रद्द केली' : 'Payment receipt cancelled successfully'), 'success');
        fetchSummary();
        fetchPayments();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      showAlert(err.response?.data?.message || (isMr ? 'पेमेंट रद्द करताना त्रुटी आली' : 'Failed to cancel receipt'), 'error');
    }
  };

  // Fetch Advance Payments
  const fetchAdvancePayments = async () => {
    try {
      setAdvanceLoading(true);
      const res = await api.get('/payments/advance', {
        params: {
          search: advanceSearch || undefined,
          status: advanceStatusFilter || undefined
        }
      });
      if (res.data?.success) {
        setAdvancePayments(res.data.advancePayments || []);
        if (res.data.summary) setAdvanceSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch advance payments:', err);
    } finally {
      setAdvanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'advance') {
      fetchAdvancePayments();
    }
  }, [activeTab, advanceSearch, advanceStatusFilter]);

  // Handle Record Advance Payment
  const handleRecordAdvance = async (e) => {
    e.preventDefault();
    if (!advanceResidentId) {
      showAlert(isMr ? 'कृपया सभासद निवडा' : 'Please select resident', 'error');
      return;
    }
    const amt = Number(advanceAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert(isMr ? 'कृपया वैध रक्कम भरा (शून्यापेक्षा जास्त)' : 'Enter valid advance amount (> 0)', 'error');
      return;
    }

    try {
      setSubmittingAdvance(true);
      const res = await api.post('/payments/advance', {
        residentId: advanceResidentId,
        amountReceived: amt,
        paymentDate: advanceDate,
        paymentMethod: advanceMethod,
        transactionRef: advanceRef,
        remarks: advanceRemarks
      });

      if (res.data?.success) {
        showAlert(res.data.message || (isMr ? 'अ‍ॅडव्हान्स रक्कम यशस्वीरीत्या जमा केली!' : 'Advance payment recorded successfully!'), 'success');
        setAdvanceAmount('');
        setAdvanceRef('');
        setAdvanceRemarks('');
        fetchSummary();
        fetchAdvancePayments();
        fetchResidents();
        setSelectedPaymentForReceipt({
          ...res.data.advancePayment,
          isAdvancePayment: true
        });
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to record advance:', err);
      showAlert(err.response?.data?.message || (isMr ? 'अ‍ॅडव्हान्स नोंदवताना त्रुटी आली' : 'Failed to record advance'), 'error');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Handle Cancel Advance
  const handleCancelAdvanceConfirm = async (advId, reason) => {
    try {
      const res = await api.patch(`/payments/advance/${advId}/cancel`, {
        cancellationReason: reason
      });
      if (res.data?.success) {
        showAlert(res.data.message || (isMr ? 'अ‍ॅडव्हान्स पावती यशस्वीरीत्या रद्द केली' : 'Advance receipt cancelled successfully'), 'success');
        fetchSummary();
        fetchAdvancePayments();
        fetchResidents();
      }
    } catch (err) {
      console.error('Cancel advance failed:', err);
      showAlert(err.response?.data?.message || (isMr ? 'अ‍ॅडव्हान्स रद्द करताना त्रुटी आली' : 'Failed to cancel advance receipt'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('paymentsTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isMr ? 'अधिकृत पावत्या' : 'Receipts Engine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('paymentsSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-orange-600" />
              <span>{t('tabPaymentHistory')}</span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-orange-600" />
              <span>{t('tabRecordPayment')}</span>
            </button>

            <button
              onClick={() => setActiveTab('advance')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'advance'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-orange-600" />
              <span>{isMr ? 'अ‍ॅडव्हान्स भरणा' : 'Advance Payment'}</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchSummary();
              fetchPayments();
            }}
            disabled={loading || summaryLoading}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || summaryLoading) ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2.5 border text-xs shadow-xs ${
            alert.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {alert.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <p className="font-medium">{alert.message}</p>
        </div>
      )}

      {/* Financial KPI Summary Cards - Interactive with Member Drill-down Views */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: TOTAL BILLED */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenDrilldown('billed')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenDrilldown('billed')}
          className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          title={isMr ? 'तपशील पाहण्यासाठी क्लिक करा' : 'Click to view detailed billed breakdown'}
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span className="group-hover:text-slate-900 transition-colors">{t('totalBilledLabel')}</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              ₹ {summary.totalBilledAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.totalDuesCount || 0} {isMr ? 'देयके' : 'Bills'} • {summary.billedResidentsCount || 0} {isMr ? 'सभासद' : 'Members'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-slate-900 font-medium transition-colors">
            <span>{isMr ? 'तपशील पहा' : 'View Breakdown'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 2: TOTAL COLLECTED */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenDrilldown('collected')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenDrilldown('collected')}
          className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          title={isMr ? 'पावत्या पाहण्यासाठी क्लिक करा' : 'Click to view collections & receipts'}
        >
          <div>
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
              <span className="group-hover:text-emerald-900 transition-colors">{t('totalCollectedLabel')}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">
              ₹ {summary.totalCollectedAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.completedPaymentsCount || 0} {isMr ? 'अधिकृत पावत्या' : 'Receipts'} • {summary.payingResidentsCount || 0} {isMr ? 'सभासद' : 'Members'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 group-hover:text-emerald-800 font-medium transition-colors">
            <span>{isMr ? 'पावत्या व भरणा पहा' : 'View Receipts'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 3: TOTAL OUTSTANDING */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenDrilldown('outstanding')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenDrilldown('outstanding')}
          className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          title={isMr ? 'थकीत यादी पाहण्यासाठी क्लिक करा' : 'Click to view pending dues'}
        >
          <div>
            <div className="flex items-center justify-between text-orange-700 text-xs font-semibold mb-1">
              <span className="group-hover:text-orange-900 transition-colors">{t('totalOutstandingLabel')}</span>
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-800 transition-colors">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 font-mono">
              ₹ {summary.totalOutstandingAmount?.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.unpaidDuesCount || 0} {isMr ? 'थकीत देयके' : 'Pending Bills'} • {summary.pendingResidentsCount || 0} {isMr ? 'सभासद' : 'Members'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-orange-600 group-hover:text-orange-800 font-medium transition-colors">
            <span>{isMr ? 'थकीत यादी पहा' : 'View Outstanding'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 4: AVAILABLE ADVANCE BALANCE */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenDrilldown('advance')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenDrilldown('advance')}
          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          title={isMr ? 'अ‍ॅडव्हान्स खतावणी पाहण्यासाठी क्लिक करा' : 'Click to view advance ledger'}
        >
          <div>
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
              <span className="group-hover:text-blue-900 transition-colors">{isMr ? 'उपलब्ध अ‍ॅडव्हान्स शिल्लक' : 'Available Advance Balance'}</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700 font-mono">
              ₹ {(summary.totalAdvanceBalance || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {isMr
                ? `जमा: ₹${(summary.totalAdvanceReceived || 0).toLocaleString('en-IN')} | वापर: ₹${(summary.totalAdvanceUtilized || 0).toLocaleString('en-IN')}`
                : `Recd: ₹${(summary.totalAdvanceReceived || 0).toLocaleString('en-IN')} | Used: ₹${(summary.totalAdvanceUtilized || 0).toLocaleString('en-IN')}`}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 group-hover:text-blue-800 font-medium transition-colors">
            <span>{isMr ? 'अ‍ॅडव्हान्स खतावणी पहा' : 'View Advance Ledger'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* TAB 1: RECORD MANUAL PAYMENT */}
      {activeTab === 'record' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span>{t('tabRecordPayment')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isMr
                ? 'सभासदाने रोख, यूपीआय किंवा बँकेद्वारे जमा केलेले शुल्क नोंदवून तात्काळ अधिकृत पावती (SCA-YYYYMM-XXXX) तयार करा.'
                : 'Record member dues received via Cash, UPI or Bank and instantly generate official SCA receipts.'}
            </p>
          </div>

          <form onSubmit={handleOpenReview} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Resident Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isMr ? '१. सभासद निवडा' : '1. Select Resident'} <span className="text-orange-600">*</span>
                </label>
                <select
                  value={selectedResidentId}
                  onChange={(e) => handleResidentChange(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                >
                  <option value="">
                    {isMr ? '-- सभासदाचे नाव निवडा --' : '-- Select Resident Name --'}
                  </option>
                  {residents.map((r, idx) => (
                    <option key={r._id} value={r._id}>
                      {idx + 1}. {r.fullNameMarathi} {r.flatNumber ? `(${isMr ? 'सदनिका' : 'Flat'}: ${r.flatNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isMr ? '२. मासिक देयक निवडा' : '2. Select Maintenance Due'} <span className="text-orange-600">*</span>
                </label>
                <select
                  value={selectedDueId}
                  onChange={(e) => handleDueChange(e.target.value)}
                  disabled={!selectedResidentId || duesLoading}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-50"
                  required
                >
                  {duesLoading ? (
                    <option>{isMr ? 'देयके लोड होत आहेत...' : 'Loading dues...'}</option>
                  ) : residentDues.length === 0 ? (
                    <option value="">
                      {isMr ? '-- या सभासदासाठी कोणतीही देयके उपलब्ध नाहीत --' : '-- No dues available for this resident --'}
                    </option>
                  ) : (
                    residentDues.map((d) => (
                      <option key={d._id} value={d._id}>
                        {getMonthName(d.month)} {d.year} — {isMr ? 'देय' : 'Due'}: ₹{d.totalAmountDue} | {isMr ? 'भरले' : 'Paid'}: ₹{d.amountPaid} | {isMr ? 'बाकी' : 'Balance'}: ₹{d.outstandingBalance} ({d.status})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Selected Due Summary Card */}
            {selectedDue && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">{isMr ? 'महिना व वर्ष:' : 'Month & Year:'}</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {getMonthName(selectedDue.month)} {selectedDue.year}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{isMr ? 'एकूण देय रक्कम:' : 'Total Due Amount:'}</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5 font-mono">
                    ₹ {selectedDue.totalAmountDue?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{isMr ? 'आधी भरलेली रक्कम:' : 'Previously Paid:'}</span>
                  <p className="font-bold text-emerald-600 text-sm mt-0.5 font-mono">
                    ₹ {selectedDue.amountPaid?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">{isMr ? 'चालू शिल्लक थकबाकी:' : 'Current Balance Due:'}</span>
                  <p className={`font-bold text-sm mt-0.5 font-mono ${isFullyPaid ? 'text-emerald-600' : 'text-orange-600'}`}>
                    ₹ {selectedDue.outstandingBalance?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}

            {/* Already-Paid Bill Banner with Shortcut to Advance Payment */}
            {isFullyPaid && (
              <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <span>{t('billAlreadyPaid')}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-800">
                        {isMr ? 'बाकी: ₹०' : 'Balance: ₹0'}
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {t('billAlreadyPaidDesc')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('advance');
                    if (selectedResidentId) {
                      setAdvanceResidentId(selectedResidentId);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('recordAdvanceShortcut')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Payment Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {isMr ? 'जमा रक्कम (₹)' : 'Amount Received (₹)'} <span className="text-orange-600">*</span>
                  </label>
                  {selectedDue && currentOutstanding > 0 && !isFullyPaid && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(currentOutstanding))}
                      className="text-[10px] text-orange-600 hover:underline font-semibold"
                    >
                      {isMr ? `पूर्ण बाकी भरा (₹${currentOutstanding.toLocaleString('en-IN')})` : `Pay Full Balance (₹${currentOutstanding.toLocaleString('en-IN')})`}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min={isFullyPaid ? undefined : "0.01"}
                  max={isFullyPaid ? undefined : currentOutstanding}
                  disabled={!selectedDue || isFullyPaid}
                  value={isFullyPaid ? '' : paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={
                    isFullyPaid
                      ? (isMr ? 'देयक आधीच पूर्ण भरलेले आहे (₹० बाकी)' : 'Bill already fully paid (₹0 due)')
                      : (isMr ? 'उदा. १०००' : 'e.g. 1000')
                  }
                  className={`w-full min-h-[44px] border rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold font-mono transition-all ${
                    isFullyPaid
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                      : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                  }`}
                  required={!isFullyPaid}
                />
                {!isFullyPaid && Number(paymentAmount) > currentOutstanding && currentOutstanding > 0 && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {isMr
                      ? `जमा रक्कम ही शिल्लक थकबाकीपेक्षा (₹${currentOutstanding.toLocaleString('en-IN')}) जास्त असू शकत नाही`
                      : `Amount cannot exceed outstanding balance (₹${currentOutstanding.toLocaleString('en-IN')})`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isMr ? 'भरणा तारीख' : 'Payment Date'} <span className="text-orange-600">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isMr ? 'भरणा पद्धत' : 'Payment Mode'} <span className="text-orange-600">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                >
                  <option value="UPI">{t('methodUPI')}</option>
                  <option value="CASH">{t('methodCash')}</option>
                  <option value="BANK_TRANSFER">{t('methodBank')}</option>
                  <option value="CHEQUE">{t('methodCheque')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isMr ? 'संदर्भ / UTR / धनादेश क्र.' : 'Ref / UTR / Cheque No.'}
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder={isMr ? 'उदा. ४३१२८९१२३८९१' : 'e.g. 431289123891'}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isMr ? 'शेरा / टीप (पर्यायी)' : 'Remarks / Notes (Optional)'}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  isMr
                    ? 'उदा. PhonePe द्वारे जमा, किंवा रोख पावती हस्ते श्री कोळी...'
                    : 'e.g. Received via PhonePe, or cash handover...'
                }
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedResidentId('');
                  setSelectedDueId('');
                  setSelectedDue(null);
                  setPaymentAmount('');
                  setTransactionRef('');
                  setRemarks('');
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 cursor-pointer"
              >
                {isMr ? 'रीसेट करा' : 'Reset'}
              </button>

              <button
                type="submit"
                disabled={
                  !selectedDue ||
                  isFullyPaid ||
                  !paymentAmount ||
                  Number(paymentAmount) < 0.01 ||
                  Number(paymentAmount) > currentOutstanding ||
                  submittingPayment
                }
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isFullyPaid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{isMr ? 'देयक आधीच पूर्ण भरलेले आहे' : 'Bill Already Fully Paid'}</span>
                  </>
                ) : (
                  <>
                    <span>{isMr ? 'तपशील तपासा व पुढे जा' : 'Review & Confirm'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PAYMENTS HISTORY & RECEIPTS REGISTER */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
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
                className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Method Filter */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">{isMr ? 'सर्व पद्धती' : 'All Modes'}</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">{isMr ? 'सर्व पावत्या' : 'All Status'}</option>
                <option value="COMPLETED">{isMr ? 'वैध पावत्या' : 'Valid Receipts'}</option>
                <option value="CANCELLED">{isMr ? 'रद्द केलेल्या' : 'Cancelled Receipts'}</option>
              </select>

              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
              >
                <option value="">{isMr ? 'सर्व वर्षे' : 'All Years'}</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              <button
                onClick={fetchPayments}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {isMr ? 'शोधा' : 'Filter'}
              </button>
            </div>
          </div>

          {/* Payments Table / Empty State */}
          {loading ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">
                {isMr ? 'पावती नोंदवही लोड होत आहे...' : 'Loading receipt register...'}
              </p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3 border border-orange-200/60">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {isMr ? 'कोणतीही पेमेंट पावती आढळली नाही' : 'No payment receipts found'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {isMr
                  ? "सभासदाने देखभाल शुल्क जमा केल्यानंतर 'नवीन पेमेंट नोंदणी' टॅबमधून तात्काळ अधिकृत पावती तयार करा."
                  : "Click 'Record New Payment' to issue official receipts once members pay maintenance fees."}
              </p>
              <button
                onClick={() => setActiveTab('record')}
                className="mt-4 min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('tabRecordPayment')}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              {/* MOBILE CARDS VIEW (block md:hidden) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {payments.map((p) => {
                  const isCancelled = p.status === 'CANCELLED';
                  return (
                    <div
                      key={p._id}
                      className={`p-4 space-y-3 transition-colors ${
                        isCancelled ? 'opacity-65 bg-red-50/20' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {p.residentNameMarathi}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {p.flatNumber && (
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                                {isMr ? 'सदनिका:' : 'Flat:'} {p.flatNumber}
                              </span>
                            )}
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-700">
                              {getMonthName(p.month)} {p.year}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                            {p.receiptNumber}
                          </span>
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              {isMr ? 'रद्द' : 'CANCELLED'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {isMr ? 'वैध' : 'VALID'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isMr ? 'जमा रक्कम:' : 'Amount Paid:'}</span>
                          <span className="font-mono font-bold text-emerald-600 text-sm">
                            ₹ {p.amountReceived?.toLocaleString('en-IN')}
                          </span>
                          {p.advanceAdjustedAmount > 0 && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              + ₹{p.advanceAdjustedAmount?.toLocaleString('en-IN')} Adv
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isMr ? 'शिल्लक बाकी:' : 'Balance Due:'}</span>
                          <span className="font-mono font-bold text-slate-700 text-sm">
                            ₹ {p.remainingBalance?.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isMr ? 'पेमेंट दिनांक:' : 'Date:'}</span>
                          <span className="text-slate-700 font-medium">
                            {new Date(p.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isMr ? 'पद्धत:' : 'Mode:'}</span>
                          <span className="font-semibold text-slate-700">
                            {p.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentForReceipt(p);
                            setIsReceiptModalOpen(true);
                          }}
                          className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{isMr ? 'पावती पहा' : 'View Receipt'}</span>
                        </button>

                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentToCancel(p);
                              setIsCancelModalOpen(true);
                            }}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors flex items-center justify-center gap-1 text-xs cursor-pointer"
                            title={isMr ? 'पावती रद्द करा' : 'Cancel Receipt'}
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden xs:inline">{isMr ? 'रद्द' : 'Cancel'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                      <th className="py-3 px-4">{isMr ? 'पावती क्रमांक' : 'Receipt Number'}</th>
                      <th className="py-3 px-4">{isMr ? 'सभासदाचे नाव' : 'Resident Name'}</th>
                      <th className="py-3 px-3">{isMr ? 'कालावधी' : 'Period'}</th>
                      <th className="py-3 px-3">{isMr ? 'जमा रक्कम (₹)' : 'Amount Paid (₹)'}</th>
                      <th className="py-3 px-3">{isMr ? 'शिल्लक थकबाकी' : 'Balance Due'}</th>
                      <th className="py-3 px-3">{isMr ? 'पेमेंट दिनांक' : 'Payment Date'}</th>
                      <th className="py-3 px-3">{isMr ? 'पद्धत' : 'Mode'}</th>
                      <th className="py-3 px-3">{isMr ? 'स्थिती' : 'Status'}</th>
                      <th className="py-3 px-4 text-right">{isMr ? 'कृती' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payments.map((p) => {
                      const isCancelled = p.status === 'CANCELLED';
                      return (
                        <tr
                          key={p._id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCancelled ? 'opacity-60 bg-red-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-orange-700">
                            {p.receiptNumber}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{p.residentNameMarathi}</div>
                            {p.flatNumber && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                {isMr ? 'सदनिका:' : 'Flat:'} {p.flatNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {getMonthName(p.month)} {p.year}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono">
                            <div className="font-bold text-emerald-600 text-sm">
                              ₹ {p.amountReceived?.toLocaleString('en-IN')}
                            </div>
                            {p.advanceAdjustedAmount > 0 && (
                              <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                <span>+ ₹{p.advanceAdjustedAmount?.toLocaleString('en-IN')}</span>
                                <span className="text-[9px] px-1 py-0.2 bg-amber-100 rounded text-amber-800">Adv</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap font-mono">
                            ₹ {p.remainingBalance?.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(p.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isCancelled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                {isMr ? 'रद्द' : 'CANCELLED'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isMr ? 'वैध' : 'VALID'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPaymentForReceipt(p);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title={isMr ? 'पावती पहा / प्रिंट करा' : 'View / Print Receipt'}
                              >
                                <Eye className="w-4 h-4 text-orange-600" />
                              </button>

                              {!isCancelled && (
                                <button
                                  onClick={() => {
                                    setPaymentToCancel(p);
                                    setIsCancelModalOpen(true);
                                  }}
                                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                                  title={isMr ? 'पावती रद्द करा' : 'Cancel Receipt'}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    {isMr
                      ? `एकूण ${pagination.totalCount} पावत्या (पान ${pagination.currentPage} / ${pagination.totalPages})`
                      : `Total ${pagination.totalCount} receipts (Page ${pagination.currentPage} of ${pagination.totalPages})`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.currentPage <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      {isMr ? 'मागील' : 'Prev'}
                    </button>
                    <button
                      disabled={pagination.currentPage >= pagination.totalPages}
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      {isMr ? 'पुढील' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADVANCE PAYMENTS & CREDIT LEDGER */}
      {activeTab === 'advance' && (
        <div className="space-y-6">
          {/* Record Advance Payment Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-orange-600" />
                  <span>{isMr ? 'अ‍ॅडव्हान्स देखभाल भरणा नोंदवा' : 'Record Advance Maintenance Payment'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isMr
                    ? 'सभासदाकडून भविष्यातील देखभाल शुल्कापोटी आगाऊ रक्कम जमा करून अधिकृत पावती (SCA-YYYYMM-XXXX) जारी करा.'
                    : 'Record advance payment from residents and issue official advance receipts with automatic credit balance.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordAdvance} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Select Resident */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'सभासद / सदनिका निवडा' : 'Select Resident / Flat'} <span className="text-orange-600">*</span>
                  </label>
                  <select
                    value={advanceResidentId}
                    onChange={(e) => setAdvanceResidentId(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  >
                    <option value="">{isMr ? '-- सभासद निवडा --' : '-- Select Resident --'}</option>
                    {residents.map((r, idx) => (
                      <option key={r._id} value={r._id}>
                        {idx + 1}. {r.fullNameMarathi} {r.flatNumber ? `(${r.flatNumber})` : ''} — {isMr ? 'शिल्लक' : 'Bal'}: ₹{r.advanceBalance || 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advance Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'अ‍ॅडव्हान्स रक्कम (₹)' : 'Advance Amount (₹)'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      placeholder="उदा. 2000"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="w-full min-h-[44px] pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'भरणा दिनांक' : 'Payment Date'} <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'भरणा पद्धत' : 'Payment Mode'} <span className="text-orange-600">*</span>
                  </label>
                  <select
                    value={advanceMethod}
                    onChange={(e) => setAdvanceMethod(e.target.value)}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  >
                    <option value="UPI">{t('methodUPI')}</option>
                    <option value="CASH">{t('methodCash')}</option>
                    <option value="BANK_TRANSFER">{t('methodBank')}</option>
                    <option value="CHEQUE">{t('methodCheque')}</option>
                  </select>
                </div>

                {/* Ref / UTR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'संदर्भ क्र. / UTR' : 'Txn Ref / UTR'}
                  </label>
                  <input
                    type="text"
                    value={advanceRef}
                    onChange={(e) => setAdvanceRef(e.target.value)}
                    placeholder={isMr ? 'उदा. UTR92837482' : 'e.g. UTR92837482'}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isMr ? 'शेरा / टीप' : 'Remarks'}
                  </label>
                  <input
                    type="text"
                    value={advanceRemarks}
                    onChange={(e) => setAdvanceRemarks(e.target.value)}
                    placeholder={isMr ? 'उदा. आगाऊ देखभाल रक्कम' : 'e.g. Advance maintenance deposit'}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submittingAdvance ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  <span>{isMr ? 'अ‍ॅडव्हान्स जमा करा व पावती तयार करा' : 'Record Advance & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Advance Payments Ledger Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>{isMr ? 'अ‍ॅडव्हान्स पावत्या व खातेवही (Advance Ledger)' : 'Advance Receipts & Credit Ledger'}</span>
              </h4>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={advanceSearch}
                    onChange={(e) => setAdvanceSearch(e.target.value)}
                    placeholder={isMr ? 'नाव, सदनिका किंवा पावती क्र. शोधा...' : 'Search by name, flat or receipt...'}
                    className="w-full sm:w-auto min-h-[44px] pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <select
                  value={advanceStatusFilter}
                  onChange={(e) => setAdvanceStatusFilter(e.target.value)}
                  className="min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">{isMr ? 'सर्व स्थिती' : 'All Status'}</option>
                  <option value="ACTIVE">{isMr ? 'सक्रिय (शिल्लक बाकी)' : 'Active (Available)'}</option>
                  <option value="FULLY_UTILIZED">{isMr ? 'पूर्ण वापरलेला' : 'Fully Utilized'}</option>
                  <option value="CANCELLED">{isMr ? 'रद्द' : 'Cancelled'}</option>
                </select>
              </div>
            </div>

            {advanceLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
                <span>{isMr ? 'अ‍ॅडव्हान्स खातेवही लोड होत आहे...' : 'Loading advance ledger...'}</span>
              </div>
            ) : advancePayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {isMr ? 'कोणतीही अ‍ॅडव्हान्स नोंद आढळली नाही.' : 'No advance payment records found.'}
              </div>
            ) : (
              <div>
                {/* MOBILE CARDS VIEW FOR ADVANCE (block md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {advancePayments.map((adv) => {
                    const isCancelled = adv.status === 'CANCELLED';
                    return (
                      <div
                        key={adv._id}
                        className={`p-3.5 space-y-2.5 transition-colors ${
                          isCancelled ? 'opacity-60 bg-red-50/20' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {adv.residentNameMarathi}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {adv.flatNumber && (
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                                  {isMr ? 'सदनिका:' : 'Flat:'} {adv.flatNumber}
                                </span>
                              )}
                              <span className="text-slate-400">•</span>
                              <span className="font-mono text-slate-600">
                                {new Date(adv.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                              {adv.receiptNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                adv.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : adv.status === 'FULLY_UTILIZED'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {adv.status === 'ACTIVE'
                                ? (isMr ? 'सक्रिय' : 'ACTIVE')
                                : adv.status === 'FULLY_UTILIZED'
                                ? (isMr ? 'पूर्ण वापरलेला' : 'UTILIZED')
                                : (isMr ? 'रद्द' : 'CANCELLED')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'जमा:' : 'Received:'}</span>
                            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                              ₹ {adv.amountReceived.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'वापर:' : 'Utilized:'}</span>
                            <span className="font-mono font-semibold text-amber-700 text-xs sm:text-sm">
                              ₹ {adv.usedAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'शिल्लक:' : 'Balance:'}</span>
                            <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                              ₹ {adv.availableBalance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {adv.adjustments && adv.adjustments.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {adv.adjustments.map((adj, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono"
                              >
                                {adj.month}/{adj.year}: ₹{adj.amountApplied}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentForReceipt({
                                ...adv,
                                isAdvancePayment: true
                              });
                              setIsReceiptModalOpen(true);
                            }}
                            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isMr ? 'पावती पहा' : 'View Receipt'}</span>
                          </button>

                          {!isCancelled && adv.usedAmount === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdvanceToCancel(adv);
                                setIsCancelAdvanceModalOpen(true);
                              }}
                              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors flex items-center justify-center gap-1 text-xs cursor-pointer"
                              title={isMr ? 'पावती रद्द करा' : 'Cancel Receipt'}
                            >
                              <XCircle className="w-4 h-4" />
                              <span className="hidden xs:inline">{isMr ? 'रद्द' : 'Cancel'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP TABLE VIEW FOR ADVANCE (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                        <th className="py-2.5 px-3">{isMr ? 'पावती क्रमांक' : 'Receipt No'}</th>
                        <th className="py-2.5 px-3">{isMr ? 'सभासद व सदनिका' : 'Member & Flat'}</th>
                        <th className="py-2.5 px-3">{isMr ? 'तारीख' : 'Date'}</th>
                        <th className="py-2.5 px-3 text-right">{isMr ? 'जमा रक्कम (₹)' : 'Received (₹)'}</th>
                        <th className="py-2.5 px-3 text-right">{isMr ? 'वापरलेली रक्कम (₹)' : 'Utilized (₹)'}</th>
                        <th className="py-2.5 px-3 text-right">{isMr ? 'उपलब्ध शिल्लक (₹)' : 'Balance (₹)'}</th>
                        <th className="py-2.5 px-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-right">{isMr ? 'कृती' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {advancePayments.map((adv) => {
                        const isCancelled = adv.status === 'CANCELLED';
                        return (
                          <tr key={adv._id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'opacity-50 bg-red-50/20' : ''}`}>
                            <td className="py-2.5 px-3 font-mono font-bold text-orange-700">{adv.receiptNumber}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div>{adv.residentNameMarathi}</div>
                              <span className="text-[10px] text-slate-500 font-mono">{adv.flatNumber || '-'}</span>
                              {adv.adjustments && adv.adjustments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {adv.adjustments.map((adj, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono"
                                      title={adj.remarks || 'Adjusted towards monthly bill'}
                                    >
                                      {adj.month}/{adj.year}: ₹{adj.amountApplied}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {new Date(adv.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹ {adv.amountReceived.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                              ₹ {adv.usedAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              ₹ {adv.availableBalance.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                adv.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : adv.status === 'FULLY_UTILIZED'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {adv.status === 'ACTIVE'
                                  ? (isMr ? 'सक्रिय' : 'ACTIVE')
                                  : adv.status === 'FULLY_UTILIZED'
                                  ? (isMr ? 'पूर्ण वापरलेला' : 'UTILIZED')
                                  : (isMr ? 'रद्द' : 'CANCELLED')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaymentForReceipt({
                                      ...adv,
                                      isAdvancePayment: true
                                    });
                                    setIsReceiptModalOpen(true);
                                  }}
                                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 cursor-pointer"
                                  title={t('viewReceiptBtn')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!isCancelled && adv.usedAmount === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdvanceToCancel(adv);
                                      setIsCancelAdvanceModalOpen(true);
                                    }}
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                                    title={isMr ? 'पावती रद्द करा' : 'Cancel Receipt'}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PRE-SUBMISSION PAYMENT REVIEW */}
      {isReviewOpen && selectedDue && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-900 overflow-hidden">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 truncate">{t('paymentReviewTitle')}</h3>
                <p className="text-xs text-slate-500 truncate">{t('paymentReviewDesc')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto my-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'सभासदाचे नाव:' : 'Resident Name:'}</span>
                <span className="font-bold text-slate-900">
                  {residents.find(r => r._id === selectedResidentId)?.fullNameMarathi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'कालावधी:' : 'Period:'}</span>
                <span className="font-semibold text-orange-700">
                  {getMonthName(selectedDue.month)} {selectedDue.year}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'एकूण देय रक्कम:' : 'Total Due Amount:'}</span>
                <span className="font-semibold text-slate-900 font-mono">
                  ₹ {selectedDue.totalAmountDue?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'सध्या जमा होणारी रक्कम:' : 'Current Payment Amount:'}</span>
                <span className="font-bold text-emerald-600 text-sm font-mono">
                  ₹ {Number(paymentAmount)?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'या पेमेंटनंतर शिल्लक थकबाकी:' : 'Remaining Balance After Payment:'}</span>
                <span className="font-bold text-orange-600 text-sm font-mono">
                  ₹ {(selectedDue.outstandingBalance - Number(paymentAmount))?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'भरणा पद्धत:' : 'Payment Mode:'}</span>
                <span className="font-semibold text-slate-900">{paymentMethod}</span>
              </div>
              {transactionRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isMr ? 'संदर्भ / UTR:' : 'Ref / UTR:'}</span>
                  <span className="font-mono text-slate-800">{transactionRef}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">{isMr ? 'पेमेंट दिनांक:' : 'Payment Date:'}</span>
                <span className="font-semibold text-slate-900">
                  {new Date(paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                </span>
              </div>
              {remarks && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isMr ? 'शेरा:' : 'Remarks:'}</span>
                  <span className="text-slate-700 italic">{remarks}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={submittingPayment}
                onClick={() => setIsReviewOpen(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                disabled={submittingPayment}
                onClick={handleConfirmPayment}
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isMr ? 'नोंद होत आहे...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{isMr ? 'पावती पुष्टी करा व जतन करा' : 'Confirm & Save Receipt'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POST-SUBMISSION PAYMENT SUCCESS */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-900 text-center overflow-hidden">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200 shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="mt-2">
              <h3 className="text-lg font-bold text-slate-900">{t('paymentSuccessTitle')}</h3>
              <p className="text-xs text-slate-500 mt-1">{t('paymentSuccessDesc')}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-1.5 font-mono my-4">
              <div className="text-slate-500 text-[11px] uppercase tracking-wider">{isMr ? 'पावती क्रमांक' : 'Receipt Number'}</div>
              <div className="text-xl font-bold text-orange-600">{paymentSuccess.receiptNumber}</div>
              <div className="text-slate-700 font-semibold pt-1">
                {paymentSuccess.residentNameMarathi} • ₹ {paymentSuccess.amountReceived?.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentForReceipt(paymentSuccess);
                  setPaymentSuccess(null);
                  setIsReceiptModalOpen(true);
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{t('viewReceiptBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentSuccess(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {isMr ? 'बंद करा' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / PRINT RECEIPT */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedPaymentForReceipt(null);
        }}
        payment={selectedPaymentForReceipt}
      />

      {/* MODAL: AUDITED CANCELLATION */}
      <CancelPaymentModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setPaymentToCancel(null);
        }}
        payment={paymentToCancel}
        onConfirm={handleCancelPaymentConfirm}
      />

      {/* MODAL: ADVANCE CANCELLATION */}
      <CancelPaymentModal
        isOpen={isCancelAdvanceModalOpen}
        onClose={() => {
          setIsCancelAdvanceModalOpen(false);
          setAdvanceToCancel(null);
        }}
        payment={advanceToCancel}
        onConfirm={handleCancelAdvanceConfirm}
      />

      {/* MODAL: FINANCIAL SUMMARY DRILLDOWN */}
      <FinancialDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        viewType={drilldownType}
        summary={summary}
        onSelectResidentForHistory={handleOpenResidentHistory}
        onSelectReceipt={(p) => {
          setSelectedPaymentForReceipt(p);
          setIsReceiptModalOpen(true);
        }}
        onNavigateToPayBill={handleNavigateToPayBill}
      />

      {/* MODAL: MEMBER FINANCIAL HISTORY */}
      <MemberHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        residentId={historyResidentId}
        onSelectReceipt={(p) => {
          setSelectedPaymentForReceipt(p);
          setIsReceiptModalOpen(true);
        }}
        onNavigateToPayBill={handleNavigateToPayBill}
      />
    </div>
  );
};

export default PaymentManagement;
