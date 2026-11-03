import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Wallet,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Download,
  XCircle,
  Calendar,
  Building,
  Building2,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Eye,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  CreditCard,
  Landmark,
  Layers,
  ChevronRight,
  Check,
  Users,
  LayoutDashboard,
  BarChart3,
  Globe,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import OpeningBalanceModal from './OpeningBalanceModal';
import CancelExpenseModal from './CancelExpenseModal';
import ExpenseDetailModal from './ExpenseDetailModal';

const DEFAULT_CATEGORIES = [
  'Electricity',
  'Water',
  'Cleaning',
  'Security',
  'Repairs and Maintenance',
  'Plumbing',
  'Lift Maintenance',
  'Garden Maintenance',
  'Other'
];

const CATEGORY_NAMES_MR = {
  Electricity: 'विद्युत / वीज बिल (Electricity)',
  Water: 'पाणीपुरवठा बिल (Water)',
  Cleaning: 'स्वच्छता व कचरा व्यवस्थापन (Cleaning)',
  Security: 'सुरक्षा रक्षक मानधन (Security)',
  'Repairs and Maintenance': 'दुरुस्ती व देखभाल (Repairs)',
  Plumbing: 'प्लंबिंग व ड्रेनेज (Plumbing)',
  'Lift Maintenance': 'लिफ्ट मेंटेनन्स (Lift AMC)',
  'Garden Maintenance': 'बागकाम व बाग देखभाल (Garden)',
  Other: 'इतर किरकोळ खर्च (Other)'
};

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

const ExpenseManagement = () => {
  const { logout } = useAuth();
  const { lang, t, toggleLanguage } = useLanguage();
  const isMr = lang === 'mr';

  // Active Tab: 'cashbook' | 'register' | 'record'
  const [activeTab, setActiveTab] = useState('cashbook');

  // Loading States
  const [loadingCashbook, setLoadingCashbook] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Cashbook Data
  const [cashbookData, setCashbookData] = useState({
    openingBalances: { CASH: 0, BANK_TRANSFER: 0, UPI: 0, CHEQUE: 0, effectiveDate: null },
    byMode: {
      CASH: { opening: 0, income: 0, expense: 0, closing: 0 },
      BANK_TRANSFER: { opening: 0, income: 0, expense: 0, closing: 0 },
      UPI: { opening: 0, income: 0, expense: 0, closing: 0 },
      CHEQUE: { opening: 0, income: 0, expense: 0, closing: 0 }
    },
    summary: {
      totalOpeningBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      netSurplusDeficit: 0,
      totalClosingBalance: 0
    },
    ledger: []
  });

  // Cashbook Filter state
  const [cbStartDate, setCbStartDate] = useState('');
  const [cbEndDate, setCbEndDate] = useState('');
  const [cbMethod, setCbMethod] = useState('');

  // Expenses Register Data
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [expPagination, setExpPagination] = useState({ totalCount: 0, currentPage: 1, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');

  // Form State for Recording New Expense
  const [formData, setFormData] = useState({
    titleMarathi: '',
    titleEnglish: '',
    category: 'Electricity',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    payeeName: '',
    transactionRef: '',
    description: '',
    attachmentUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdExpense, setCreatedExpense] = useState(null);

  // Modals
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [expenseToCancel, setExpenseToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/v1/expenses/categories', { withCredentials: true });
      if (res.data?.success && res.data.categories) {
        setCategories(res.data.categories.map(c => c.name));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  // Fetch Cashbook
  const fetchCashbook = async () => {
    try {
      setLoadingCashbook(true);
      const params = {};
      if (cbStartDate) params.startDate = cbStartDate;
      if (cbEndDate) params.endDate = cbEndDate;
      if (cbMethod) params.paymentMethod = cbMethod;

      const res = await axios.get('/api/v1/cashbook', {
        params,
        withCredentials: true
      });

      if (res.data?.success) {
        setCashbookData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cashbook:', err);
      showNotification(isMr ? 'कॅशबुक लोड करताना त्रुटी आली' : 'Failed to load cashbook ledger', 'error');
    } finally {
      setLoadingCashbook(false);
    }
  };

  // Fetch Expenses
  const fetchExpenses = async (page = 1) => {
    try {
      setLoadingExpenses(true);
      const params = { page, limit: 15 };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterCategory) params.category = filterCategory;
      if (filterMethod) params.paymentMethod = filterMethod;
      if (filterStatus) params.status = filterStatus;
      if (expStartDate) params.startDate = expStartDate;
      if (expEndDate) params.endDate = expEndDate;

      const res = await axios.get('/api/v1/expenses', {
        params,
        withCredentials: true
      });

      if (res.data?.success) {
        setExpenses(res.data.expenses);
        setExpPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      showNotification(isMr ? 'खर्च यादी लोड करताना त्रुटी आली' : 'Failed to load expenses list', 'error');
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCashbook();
    fetchExpenses(1);
  }, []);

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit New Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!formData.titleMarathi.trim() && !formData.titleEnglish.trim()) {
      showNotification(isMr ? 'कृपया खर्चाचे शीर्षक प्रविष्ट करा' : 'Please provide expense title', 'error');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showNotification(isMr ? 'कृपया वैध खर्च रक्कम प्रविष्ट करा (₹ > ०)' : 'Amount must be greater than zero', 'error');
      return;
    }
    if (!formData.payeeName.trim()) {
      showNotification(isMr ? 'कृपया पैसे स्वीकारणाऱ्याचे नाव प्रविष्ट करा' : 'Please provide payee name', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

      const res = await axios.post(
        '/api/v1/expenses',
        {
          ...formData,
          amount: Number(formData.amount),
          idempotencyKey
        },
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          withCredentials: true
        }
      );

      if (res.data?.success) {
        setCreatedExpense(res.data.expense);
        showNotification(
          isMr
            ? `खर्च व्हाउचर यशस्वीरीत्या नोंदवले गेले! (व्हाउचर क्र. ${res.data.expense.voucherNumber})`
            : `Expense recorded successfully! (Voucher #${res.data.expense.voucherNumber})`
        );
        setFormData({
          titleMarathi: '',
          titleEnglish: '',
          category: 'Electricity',
          amount: '',
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'CASH',
          payeeName: '',
          transactionRef: '',
          description: '',
          attachmentUrl: ''
        });
        fetchCashbook();
        fetchExpenses(1);
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
      showNotification(err.response?.data?.message || err.message || 'Error recording expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Expense Action
  const handleConfirmCancelExpense = async (expenseId, reason) => {
    try {
      const res = await axios.put(
        `/api/v1/expenses/${expenseId}/cancel`,
        { reason },
        {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          withCredentials: true
        }
      );

      if (res.data?.success) {
        showNotification(
          isMr
            ? `व्हाउचर यशस्वीरीत्या रद्द केले गेले. कॅशबुक ताळेबंद पूर्ववत केला.`
            : `Voucher successfully cancelled. Cashbook adjusted.`
        );
        fetchCashbook();
        fetchExpenses(expPagination.currentPage);
      }
    } catch (err) {
      console.error('Failed to cancel expense:', err);
      throw err;
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

            <Link
              to="/payments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navPayments')}</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
              <Link to="/expenses" className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-orange-400" />
                <span>{t('navExpenses')}</span>
              </Link>
            </div>

            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navReports')}</span>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Top Notification Toast */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-xl transition-all ${
              notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="font-medium">{notification.msg}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-4 text-xs underline"
            >
              {isMr ? 'बंद करा' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {isMr ? 'खर्च व्यवस्थापन व ताळेबंद' : 'Society Accounts & Ledger'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {isMr ? 'रोख व बँक स्वतंत्र हिशोब' : 'Segregated Cash & Bank'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2 font-devanagari">
              {t('expensesTitle')}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t('expensesSubtitle')}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsOpeningBalanceOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all hover:border-slate-600 shadow-sm"
            >
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>{t('configureOpeningBalanceBtn')}</span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-600/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('recordExpenseBtn')}</span>
            </button>
          </div>
        </div>

        {/* KPI Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{t('totalIncomeLabel')}</p>
              <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1">
                ₹{Number(cashbookData.summary.totalIncome || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-emerald-500/80 mt-1 flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3" />
                <span>{isMr ? 'एकूण जमा पावत्या' : 'Total Receipts Collected'}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          {/* Total Expense */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{t('totalExpensesLabel')}</p>
              <h3 className="text-xl font-bold text-red-400 font-mono mt-1">
                ₹{Number(cashbookData.summary.totalExpense || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>{isMr ? 'एकूण मंजूर खर्च' : 'Total Approved Expenses'}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          {/* Net Surplus / Deficit */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{t('netSurplusLabel')}</p>
              <h3
                className={`text-xl font-bold font-mono mt-1 ${
                  cashbookData.summary.netSurplusDeficit >= 0 ? 'text-teal-400' : 'text-amber-400'
                }`}
              >
                ₹{Number(cashbookData.summary.netSurplusDeficit || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {isMr ? 'जमा वजा खर्च फरक' : 'Income minus Expense'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          {/* Total Closing Balance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">{t('closingBalanceLabel')}</p>
              <h3 className="text-xl font-bold text-amber-400 font-mono mt-1">
                ₹{Number(cashbookData.summary.totalClosingBalance || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-amber-500/80 mt-1">
                {isMr ? 'एकूण शिल्लक (सर्व साधने)' : 'Combined All Modes'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Mode-Wise Segregated Balance Strips */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-200">
                {isMr ? 'साधननिहाय स्वतंत्र शिल्लक (Mode-Wise Balances)' : 'Mode-Wise Balances (Strictly Non-Mingled)'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isMr
                  ? 'महत्त्वाचे: रोख रक्कम (Physical Cash) आणि बँक/डिजिटल खाती स्वतंत्र मोजली जातात.'
                  : 'Note: Physical cash is maintained independently from bank and digital accounts.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-mono">
                {cashbookData.openingBalances.effectiveDate && (
                  <span>
                    {isMr ? 'आरंभी तारीख: ' : 'From: '}
                    {new Date(cashbookData.openingBalances.effectiveDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
            {/* Physical Cash */}
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  {t('cashBalanceLabel')}
                </span>
                <span className="text-[10px] text-slate-500">रोख वही</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300">
                ₹{Number(cashbookData.byMode.CASH?.closing || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>आरंभी: ₹{Number(cashbookData.byMode.CASH?.opening || 0).toLocaleString('en-IN')}</span>
                <span>जमा: +₹{Number(cashbookData.byMode.CASH?.income || 0).toLocaleString('en-IN')}</span>
                <span>खर्च: -₹{Number(cashbookData.byMode.CASH?.expense || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  {t('bankBalanceLabel')}
                </span>
                <span className="text-[10px] text-slate-500">बँक खाते</span>
              </div>
              <div className="text-lg font-bold font-mono text-blue-300">
                ₹{Number(cashbookData.byMode.BANK_TRANSFER?.closing || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>आरंभी: ₹{Number(cashbookData.byMode.BANK_TRANSFER?.opening || 0).toLocaleString('en-IN')}</span>
                <span>जमा: +₹{Number(cashbookData.byMode.BANK_TRANSFER?.income || 0).toLocaleString('en-IN')}</span>
                <span>खर्च: -₹{Number(cashbookData.byMode.BANK_TRANSFER?.expense || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* UPI */}
            <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  {t('upiBalanceLabel')}
                </span>
                <span className="text-[10px] text-slate-500">PhonePe/GPay</span>
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">
                ₹{Number(cashbookData.byMode.UPI?.closing || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>आरंभी: ₹{Number(cashbookData.byMode.UPI?.opening || 0).toLocaleString('en-IN')}</span>
                <span>जमा: +₹{Number(cashbookData.byMode.UPI?.income || 0).toLocaleString('en-IN')}</span>
                <span>खर्च: -₹{Number(cashbookData.byMode.UPI?.expense || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Cheque */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  {t('chequeBalanceLabel')}
                </span>
                <span className="text-[10px] text-slate-500">धनादेश</span>
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                ₹{Number(cashbookData.byMode.CHEQUE?.closing || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>आरंभी: ₹{Number(cashbookData.byMode.CHEQUE?.opening || 0).toLocaleString('en-IN')}</span>
                <span>जमा: +₹{Number(cashbookData.byMode.CHEQUE?.income || 0).toLocaleString('en-IN')}</span>
                <span>खर्च: -₹{Number(cashbookData.byMode.CHEQUE?.expense || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'cashbook'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{t('tabCashbook')}</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('tabExpenseRegister')}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-slate-300 border border-slate-700">
              {expPagination.totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'record'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('tabAddExpense')}</span>
          </button>
        </div>

        {/* TAB 1: CASHBOOK LEDGER */}
        {activeTab === 'cashbook' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{isMr ? 'दिनांक:' : 'From:'}</span>
                  <input
                    type="date"
                    value={cbStartDate}
                    onChange={(e) => setCbStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{isMr ? 'ते:' : 'To:'}</span>
                  <input
                    type="date"
                    value={cbEndDate}
                    onChange={(e) => setCbEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{isMr ? 'पद्धत:' : 'Mode:'}</span>
                  <select
                    value={cbMethod}
                    onChange={(e) => setCbMethod(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">{isMr ? 'सर्व पद्धती' : 'All Modes'}</option>
                    <option value="CASH">{METHOD_LABELS[lang]?.CASH}</option>
                    <option value="BANK_TRANSFER">{METHOD_LABELS[lang]?.BANK_TRANSFER}</option>
                    <option value="UPI">{METHOD_LABELS[lang]?.UPI}</option>
                    <option value="CHEQUE">{METHOD_LABELS[lang]?.CHEQUE}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCashbook}
                  disabled={loadingCashbook}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCashbook ? 'animate-spin' : ''}`} />
                  <span>{isMr ? 'ताळेबंद रीफ्रेश' : 'Refresh Ledger'}</span>
                </button>
              </div>
            </div>

            {/* Cashbook Ledger Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isMr ? 'कालक्रमानुसार कॅशबुक नोंदवही (Chronological Cashbook Ledger)' : 'Chronological Cashbook Ledger'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isMr
                      ? 'सर्व पावत्या (जमा) आणि मंजूर खर्च (नावे) यांची तारीखनिहाय नोंद व चालू शिल्लक'
                      : 'Date-wise inflows and outflows with mode-specific running balances'}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {isMr ? 'एकूण व्यवहार नोंदी:' : 'Total entries:'}{' '}
                  <span className="font-bold text-white font-mono">{cashbookData.ledger.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">दिनांक (Date)</th>
                      <th className="px-3 py-3">प्रकार (Type)</th>
                      <th className="px-4 py-3">तपशील / शीर्षक (Details)</th>
                      <th className="px-3 py-3">साधन (Mode)</th>
                      <th className="px-3 py-3">संदर्भ / व्हा./पावती क्र.</th>
                      <th className="px-4 py-3 text-right text-emerald-400">{t('amountInLabel')}</th>
                      <th className="px-4 py-3 text-right text-red-400">{t('amountOutLabel')}</th>
                      <th className="px-4 py-3 text-right text-amber-400">{t('runningBalanceLabel')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loadingCashbook ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-400" />
                          <span>{isMr ? 'कॅशबुक लोड होत आहे...' : 'Loading cashbook ledger...'}</span>
                        </td>
                      </tr>
                    ) : cashbookData.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          <p className="font-medium text-slate-300">
                            {isMr ? 'कोणतेही व्यवहार आढळले नाहीत.' : 'No cashbook entries found for this range.'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isMr
                              ? 'पेमेंट पावत्या किंवा नवीन खर्च नोंदवून कॅशबुक सुरू करा.'
                              : 'Record receipts or expenses to build cashbook entries.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      cashbookData.ledger.map((entry, idx) => {
                        const isIncome = entry.type === 'INCOME';
                        const formattedDate = new Date(entry.date).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                        const modeLabel = METHOD_LABELS[lang]?.[entry.paymentMethod] || entry.paymentMethod;

                        return (
                          <tr key={entry.id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="px-3 py-3">
                              {isIncome ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <ArrowDownLeft className="w-3 h-3" />
                                  {isMr ? 'जमा (In)' : 'INCOME'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                  <ArrowUpRight className="w-3 h-3" />
                                  {isMr ? 'खर्च (Out)' : 'EXPENSE'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-100 block">
                                {entry.title}
                              </span>
                              {entry.description && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                  {entry.description}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-300">
                              <span className="text-[11px]">{modeLabel}</span>
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-300 text-[11px]">
                              {entry.reference || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {isIncome ? `+₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                              {!isIncome ? `-₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                              ₹{Number(entry.runningBalance || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950 font-semibold border-t-2 border-slate-800 text-xs">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-slate-300 font-bold text-right">
                        {isMr ? 'एकूण ताळेबंद योग (Totals):' : 'Ledger Totals:'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        ₹{Number(cashbookData.summary.totalIncome || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                        ₹{Number(cashbookData.summary.totalExpense || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                        ₹{Number(cashbookData.summary.totalClosingBalance || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXPENSE REGISTER */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* Search */}
                <div className="lg:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder={
                      isMr
                        ? 'व्हाउचर क्र., शीर्षक, विक्रेता किंवा UTR शोधा...'
                        : 'Search voucher, title, payee or UTR...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchExpenses(1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">{isMr ? 'सर्व वर्गवारी (All Categories)' : 'All Categories'}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_NAMES_MR[cat] || cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">{isMr ? 'सर्व पद्धती (All Methods)' : 'All Payment Methods'}</option>
                    <option value="CASH">{METHOD_LABELS[lang]?.CASH}</option>
                    <option value="BANK_TRANSFER">{METHOD_LABELS[lang]?.BANK_TRANSFER}</option>
                    <option value="UPI">{METHOD_LABELS[lang]?.UPI}</option>
                    <option value="CHEQUE">{METHOD_LABELS[lang]?.CHEQUE}</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">{isMr ? 'सर्व स्थिती (All Status)' : 'All Status'}</option>
                    <option value="COMPLETED">{isMr ? 'मान्य (Completed)' : 'Completed'}</option>
                    <option value="CANCELLED">{isMr ? 'रद्दबातल (Cancelled)' : 'Cancelled'}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{isMr ? 'दिनांक:' : 'From:'}</span>
                    <input
                      type="date"
                      value={expStartDate}
                      onChange={(e) => setExpStartDate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{isMr ? 'ते:' : 'To:'}</span>
                    <input
                      type="date"
                      value={expEndDate}
                      onChange={(e) => setExpEndDate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterCategory('');
                      setFilterMethod('');
                      setFilterStatus('');
                      setExpStartDate('');
                      setExpEndDate('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs"
                  >
                    {isMr ? 'फिल्टर साफ करा' : 'Clear Filters'}
                  </button>
                  <button
                    onClick={() => fetchExpenses(1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium shadow-md shadow-orange-600/30 transition-all text-xs"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{isMr ? 'शोधा' : 'Apply Filter'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expenses Register Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">व्हाउचर क्र. (Voucher)</th>
                      <th className="px-3 py-3">दिनांक (Date)</th>
                      <th className="px-3 py-3">वर्गवारी (Category)</th>
                      <th className="px-4 py-3">खर्चाचे शीर्षक (Title)</th>
                      <th className="px-3 py-3">पैसे स्वीकारणारे (Payee)</th>
                      <th className="px-3 py-3">पद्धत (Method)</th>
                      <th className="px-4 py-3 text-right">रक्कम (Amount)</th>
                      <th className="px-3 py-3 text-center">स्थिती (Status)</th>
                      <th className="px-4 py-3 text-right">कृती (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loadingExpenses ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-400" />
                          <span>{isMr ? 'खर्च यादी लोड होत आहे...' : 'Loading expense vouchers...'}</span>
                        </td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          <p className="font-medium text-slate-300">
                            {isMr ? 'कोणतेही खर्च व्हाउचर आढळले नाही.' : 'No expense vouchers found.'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isMr
                              ? 'नवीन खर्च नोंदवण्यासाठी "नवीन खर्च नोंदणी" टॅब वापरा.'
                              : 'Click "Record New Expense" to create your first voucher.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => {
                        const isCancelled = expense.isCancelled || expense.status === 'CANCELLED';
                        const formattedDate = new Date(expense.expenseDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                        const methodLabel = METHOD_LABELS[lang]?.[expense.paymentMethod] || expense.paymentMethod;

                        return (
                          <tr
                            key={expense._id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isCancelled ? 'bg-red-950/10 opacity-75' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-orange-400 whitespace-nowrap">
                              {expense.voucherNumber}
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-300 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="px-3 py-3 text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-slate-700">
                                {expense.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-100 block">
                                {expense.titleMarathi || expense.titleEnglish}
                              </span>
                              {expense.transactionRef && (
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  Ref: {expense.transactionRef}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-300 font-medium whitespace-nowrap">
                              {expense.payeeName}
                            </td>
                            <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                              {methodLabel}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                              ₹{Number(expense.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {isCancelled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                  <XCircle className="w-3 h-3" />
                                  {isMr ? 'रद्दबातल' : 'Cancelled'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isMr ? 'मान्य' : 'Completed'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedExpenseForDetail(expense);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                                  title={isMr ? 'व्हाउचर पहा / प्रिंट करा' : 'View / Print Voucher'}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!isCancelled && (
                                  <button
                                    onClick={() => {
                                      setExpenseToCancel(expense);
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-all"
                                    title={isMr ? 'खर्च व्हाउचर रद्द करा' : 'Cancel Voucher'}
                                  >
                                    <XCircle className="w-4 h-4" />
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
              {expPagination.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {isMr ? 'पृष्ठ' : 'Page'} {expPagination.currentPage} of {expPagination.totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={expPagination.currentPage <= 1}
                      onClick={() => fetchExpenses(expPagination.currentPage - 1)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                    >
                      {isMr ? 'मागील' : 'Prev'}
                    </button>
                    <button
                      disabled={expPagination.currentPage >= expPagination.totalPages}
                      onClick={() => fetchExpenses(expPagination.currentPage + 1)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200"
                    >
                      {isMr ? 'पुढील' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RECORD NEW EXPENSE */}
        {activeTab === 'record' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {createdExpense && (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">
                      {isMr ? 'खर्च व्हाउचर यशस्वीरीत्या नोंदवले गेले!' : 'Expense Voucher Recorded Successfully!'}
                    </h4>
                    <p className="text-emerald-300 font-mono mt-0.5">
                      व्हाउचर क्र.: {createdExpense.voucherNumber} • रक्कम: ₹{Number(createdExpense.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedExpenseForDetail(createdExpense);
                      setIsDetailModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium shadow-sm transition-all text-xs"
                  >
                    {isMr ? 'व्हाउचर पहा' : 'View Voucher'}
                  </button>
                  <button
                    onClick={() => setCreatedExpense(null)}
                    className="p-1 rounded text-emerald-400 hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white font-devanagari">
                  {t('recordExpenseBtn')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isMr
                    ? 'सोसायटीचा अधिकृत खर्च नोंदवून ऑटोमॅटिक व्हाउचर क्रमांक जनरेट करा.'
                    : 'Record official society expense with atomic voucher generation.'}
                </p>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
                {/* Titles: Marathi & English */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      {t('expenseTitleLabel')} (मराठी) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="titleMarathi"
                      placeholder="उदा. लिफ्ट मासिक देखभाल, पंप दुरुस्ती, स्ट्रीट लाइट..."
                      value={formData.titleMarathi}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Expense Title (English) <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="titleEnglish"
                      placeholder="E.g., Lift monthly AMC, water motor repair..."
                      value={formData.titleEnglish}
                      onChange={handleFormChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Category & Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      {t('categoryLabel')} <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_NAMES_MR[cat] || cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      खर्च रक्कम (Amount in ₹) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        name="amount"
                        min="1"
                        step="any"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={handleFormChange}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Date & Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      खर्च दिनांक (Expense Date) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      name="expenseDate"
                      value={formData.expenseDate}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      पेमेंट पद्धत (Payment Method) <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleFormChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="CASH">{METHOD_LABELS[lang]?.CASH}</option>
                      <option value="BANK_TRANSFER">{METHOD_LABELS[lang]?.BANK_TRANSFER}</option>
                      <option value="UPI">{METHOD_LABELS[lang]?.UPI}</option>
                      <option value="CHEQUE">{METHOD_LABELS[lang]?.CHEQUE}</option>
                    </select>
                  </div>
                </div>

                {/* Payee Name & Transaction Ref */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      {t('payeeNameLabel')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="payeeName"
                      placeholder="उदा. महावितरण (MSEDCL), जॉन्सन लिफ्ट्स, रमेश जाधव..."
                      value={formData.payeeName}
                      onChange={handleFormChange}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      व्यवहार संदर्भ / UTR / धनादेश क्र. <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="transactionRef"
                      placeholder="उदा. UTR12345678, CHQ-987654..."
                      value={formData.transactionRef}
                      onChange={handleFormChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                {/* Description / Remarks */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    तपशील व शेरा (Description / Remarks) <span className="text-slate-500">(Optional)</span>
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="खर्चाबाबत अधिक माहिती किंवा कामाचा तपशील..."
                    value={formData.description}
                    onChange={handleFormChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {isMr ? 'व्हाउचर ऑटोमॅटिक EXP-YYYYMM-XXXX स्वरूपात तयार होईल.' : 'Atomic sequential voucher EXP-YYYYMM-XXXX'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cashbook')}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                    >
                      {t('btnCancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? (isMr ? 'नोंदणी सुरू आहे...' : 'Recording...')
                          : (isMr ? 'खर्च व्हाउचर बनवा' : 'Create Voucher')}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Opening Balance Modal */}
        <OpeningBalanceModal
          isOpen={isOpeningBalanceOpen}
          onClose={() => setIsOpeningBalanceOpen(false)}
          onSuccess={(msg) => {
            showNotification(msg);
            fetchCashbook();
          }}
        />

        {/* Cancel Expense Modal */}
        <CancelExpenseModal
          isOpen={isCancelModalOpen}
          expense={expenseToCancel}
          onClose={() => {
            setIsCancelModalOpen(false);
            setExpenseToCancel(null);
          }}
          onConfirm={handleConfirmCancelExpense}
        />

        {/* Expense Detail / Print Modal */}
        <ExpenseDetailModal
          isOpen={isDetailModalOpen}
          expense={selectedExpenseForDetail}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedExpenseForDetail(null);
          }}
        />
      </main>
    </div>
  );
};

export default ExpenseManagement;
