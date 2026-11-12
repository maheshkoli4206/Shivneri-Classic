import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  Wallet,
  PlusCircle,
  FileText,
  Sliders,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import OpeningBalanceModal from './OpeningBalanceModal';
import CancelExpenseModal from './CancelExpenseModal';
import ExpenseDetailModal from './ExpenseDetailModal';

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

const CATEGORY_NAMES_MR = {
  ELECTRICITY: 'वीज बिल (Electricity)',
  Electricity: 'विद्युत देयक (Electricity)',
  WATER: 'पाणी पुरवठा (Water Supply)',
  Water: 'पाणी पुरवठा (Water Supply)',
  SECURITY: 'सुरक्षा रक्षक (Security)',
  Security: 'सुरक्षा रक्षक (Security)',
  CLEANING: 'साफसफाई (Cleaning)',
  Cleaning: 'स्वच्छता व कचरा (Cleaning)',
  LIFT: 'लिफ्ट देखभाल (Lift Maintenance)',
  Lift_Maintenance: 'लिफ्ट देखभाल (Lift Maintenance)',
  REPAIR_MAINTENANCE: 'दुरुस्ती व देखभाल (Repairs)',
  Repairs_Maintenance: 'दुरुस्ती व देखभाल (Repairs)',
  PLUMBING: 'प्लंबिंग कामे (Plumbing)',
  GARDEN: 'बागकाम व परिसर (Garden)',
  Generator_Diesel: 'जनरेटर व डिझेल (Generator)',
  Audit_Accounting: 'ऑडिट व लेखापरीक्षण (Audit & Legal)',
  Stationery_Admin: 'प्रशासकीय व स्टेशनरी (Stationery)',
  Festival_Celebration: 'उत्सव व सण (Festivals)',
  OTHER: 'इतर किरकोळ खर्च (Other Misc)',
  Other: 'इतर किरकोळ खर्च (Other Misc)'
};

const formatCurrency = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};

const getCategoryCode = (cat) => {
  if (!cat) return '';
  if (typeof cat === 'object') return cat.code || cat.nameEnglish || cat._id || '';
  return String(cat);
};

const getCategoryLabel = (cat, isMarathi) => {
  if (!cat) return '';
  if (typeof cat === 'object') {
    return isMarathi
      ? (cat.nameMarathi || cat.nameEnglish || cat.code)
      : (cat.nameEnglish || cat.nameMarathi || cat.code);
  }
  return isMarathi ? (CATEGORY_NAMES_MR[cat] || cat) : cat;
};

const ExpenseManagement = () => {
  const { lang, t } = useLanguage();
  const isMr = lang === 'mr';

  // Active Tab: 'cashbook' | 'register' | 'record'
  const [activeTab, setActiveTab] = useState('cashbook');

  // Cashbook Ledger Data
  const [cashbookData, setCashbookData] = useState({
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      totalClosingBalance: 0,
      openingConfigured: false,
      modeWise: {
        CASH: { opening: 0, income: 0, expense: 0, closing: 0 },
        BANK_TRANSFER: { opening: 0, income: 0, expense: 0, closing: 0 },
        UPI: { opening: 0, income: 0, expense: 0, closing: 0 },
        CHEQUE: { opening: 0, income: 0, expense: 0, closing: 0 }
      }
    },
    ledger: []
  });
  const [loadingCashbook, setLoadingCashbook] = useState(false);
  const [cbStartDate, setCbStartDate] = useState('');
  const [cbEndDate, setCbEndDate] = useState('');
  const [cbMethod, setCbMethod] = useState('');

  // Expenses Register State
  const [expenses, setExpenses] = useState([]);
  const [expPagination, setExpPagination] = useState({ totalCount: 0, currentPage: 1, totalPages: 1 });
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('2026');

  // Add Expense Form State
  const [formData, setFormData] = useState({
    titleMarathi: '',
    titleEnglish: '',
    category: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    payeeName: '',
    transactionRef: '',
    description: '',
    attachmentUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // Modals
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expenseToCancel, setExpenseToCancel] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Success / Alert Toast
  const [notification, setNotification] = useState(null);
  const [createdExpense, setCreatedExpense] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setCategoryError('');
      const res = await api.get('/expenses/categories');
      if (res.data?.success && Array.isArray(res.data.categories)) {
        const catList = res.data.categories;
        setCategories(catList);
        if (catList.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category: prev.category && prev.category !== 'Electricity'
              ? prev.category
              : (catList[0].code || catList[0].nameEnglish)
          }));
        }
      } else {
        setCategoryError(isMr ? 'खर्च वर्गवारी लोड करता आली नाही.' : 'Failed to load expense categories.');
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategoryError(
        err.response?.data?.message || (isMr ? 'खर्च वर्गवारी आणताना त्रुटी आली.' : 'Failed to load expense categories.')
      );
    } finally {
      setLoadingCategories(false);
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

      const res = await api.get('/cashbook', { params });
      if (res.data?.success) {
        setCashbookData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cashbook:', err);
      showNotification(err.response?.data?.message || err.message || (isMr ? 'कॅशबुक लोड करताना त्रुटी आली' : 'Failed to fetch cashbook'), 'error');
    } finally {
      setLoadingCashbook(false);
    }
  };

  // Fetch Expenses
  const fetchExpenses = async (page = 1) => {
    try {
      setLoadingExpenses(true);
      const params = {
        page,
        limit: 15,
        search: searchTerm || undefined,
        category: filterCategory || undefined,
        paymentMethod: filterMethod || undefined,
        status: filterStatus || undefined,
        year: filterYear || undefined
      };

      const res = await api.get('/expenses', { params });
      if (res.data?.success) {
        setExpenses(res.data.expenses || []);
        setExpPagination(res.data.pagination || { totalCount: 0, currentPage: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      showNotification(err.response?.data?.message || err.message || (isMr ? 'खर्च यादी लोड करताना त्रुटी आली' : 'Failed to fetch expenses'), 'error');
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCashbook();
    fetchExpenses(1);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!formData.titleMarathi.trim()) {
      showNotification(isMr ? 'कृपया खर्चाचे शीर्षक प्रविष्ट करा' : 'Please enter expense title', 'error');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showNotification(isMr ? 'कृपया वैध खर्च रक्कम प्रविष्ट करा (> 0)' : 'Please enter valid expense amount (> 0)', 'error');
      return;
    }
    if (!formData.payeeName.trim()) {
      showNotification(isMr ? 'कृपया पैसे स्वीकारणारे / विक्रेता नाव प्रविष्ट करा' : 'Please enter payee/vendor name', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

      const res = await api.post('/expenses', {
        ...formData,
        amount: Number(formData.amount),
        idempotencyKey
      });

      if (res.data?.success) {
        setCreatedExpense(res.data.expense);
        showNotification(
          isMr
            ? `खर्च व्हाउचर यशस्वीरीत्या नोंदवले गेले! (व्हाउचर क्र. ${res.data.expense.voucherNumber})`
            : `Expense recorded successfully! (Voucher #${res.data.expense.voucherNumber})`
        );
        const defaultCat = categories.length > 0 ? getCategoryCode(categories[0]) : 'ELECTRICITY';
        setFormData({
          titleMarathi: '',
          titleEnglish: '',
          category: defaultCat,
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
      showNotification(err.response?.data?.message || err.message || (isMr ? 'खर्च नोंदवताना त्रुटी आली' : 'Error recording expense'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancelExpense = async (expenseId, reason) => {
    try {
      const res = await api.put(`/expenses/${expenseId}/cancel`, { reason });

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
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('expensesTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              {isMr ? 'कॅशबुक ताळेबंद' : 'Cashbook Ledger'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('expensesSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
            <button
              onClick={() => setActiveTab('cashbook')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'cashbook'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 text-orange-600" />
              <span>{t('tabCashbook')}</span>
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-orange-600" />
              <span>{t('tabExpenseRegister')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] text-slate-700 font-bold">
                {expPagination.totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-orange-600" />
              <span>{t('tabAddExpense')}</span>
            </button>
          </div>

          <button
            onClick={() => setIsOpeningBalanceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-orange-600" />
            <span>{t('configureOpeningBalanceBtn')}</span>
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs shadow-xs ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-medium">{notification.msg}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-500 hover:text-slate-800 text-xs font-semibold"
          >
            {isMr ? 'बंद करा' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('totalIncomeLabel')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono mt-1">
              ₹{formatCurrency(cashbookData.summary?.totalIncome)}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" />
              <span>{isMr ? 'एकूण जमा पावत्या' : 'Total Inflows'}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('totalExpensesLabel')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-red-600 font-mono mt-1">
              ₹{formatCurrency(cashbookData.summary?.totalExpense)}
            </h3>
            <p className="text-[11px] text-red-700 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>{isMr ? 'एकूण मंजूर खर्च' : 'Total Outflows'}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Net Surplus / Deficit */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('netSurplusLabel')}</p>
            <h3 className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
              ((Number(cashbookData.summary?.totalIncome) || 0) - (Number(cashbookData.summary?.totalExpense) || 0)) >= 0 ? 'text-teal-600' : 'text-amber-600'
            }`}>
              ₹{formatCurrency((Number(cashbookData.summary?.totalIncome) || 0) - (Number(cashbookData.summary?.totalExpense) || 0))}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {isMr ? 'जमा वजा खर्च' : 'Income minus Expense'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Closing Balance */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{t('closingBalanceLabel')}</p>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1">
              ₹{formatCurrency(cashbookData.summary?.totalClosingBalance)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {isMr ? 'सर्व बँक व रोख मिळून' : 'All accounts combined'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Multi-Account Mode-Wise Segregated Balance Strip */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isMr ? 'साधननिहाय चालू शिल्लक' : 'Mode-Wise Segregated Balances'}
          </h3>
          <span className="text-[11px] text-slate-400">
            {isMr ? 'रोख व बँक स्वतंत्र ताळेबंद' : 'Separated cashbook ledgers'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Cash */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{t('cashBalanceLabel')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              ₹{formatCurrency(cashbookData.summary?.modeWise?.CASH?.closing)}
            </div>
          </div>

          {/* Bank */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{t('bankBalanceLabel')}</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="text-lg font-bold font-mono text-blue-600">
              ₹{formatCurrency(cashbookData.summary?.modeWise?.BANK_TRANSFER?.closing)}
            </div>
          </div>

          {/* UPI */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{t('upiBalanceLabel')}</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-600">
              ₹{formatCurrency(cashbookData.summary?.modeWise?.UPI?.closing)}
            </div>
          </div>

          {/* Cheque */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{t('chequeBalanceLabel')}</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-lg font-bold font-mono text-amber-600">
              ₹{formatCurrency(cashbookData.summary?.modeWise?.CHEQUE?.closing)}
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: CASHBOOK CHRONOLOGICAL LEDGER */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-500">{isMr ? 'दिनांक:' : 'From:'}</span>
                <input
                  type="date"
                  value={cbStartDate}
                  onChange={(e) => setCbStartDate(e.target.value)}
                  className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-500">{isMr ? 'ते:' : 'To:'}</span>
                <input
                  type="date"
                  value={cbEndDate}
                  onChange={(e) => setCbEndDate(e.target.value)}
                  className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-500">{isMr ? 'पद्धत:' : 'Mode:'}</span>
                <select
                  value={cbMethod}
                  onChange={(e) => setCbMethod(e.target.value)}
                  className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCashbook ? 'animate-spin text-orange-600' : ''}`} />
                <span>{isMr ? 'ताळेबंद रीफ्रेश' : 'Refresh Ledger'}</span>
              </button>
            </div>
          </div>

          {/* Cashbook Ledger Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isMr ? 'कालक्रमानुसार कॅशबुक नोंदवही' : 'Chronological Cashbook Ledger'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr
                    ? 'सर्व पावत्या (जमा) आणि मंजूर खर्च (नावे) यांची तारीखनिहाय नोंद व चालू शिल्लक'
                    : 'Date-wise inflows and outflows with mode-specific running balances'}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {isMr ? 'एकूण नोंदी:' : 'Total entries:'}{' '}
                <span className="font-bold text-slate-900 font-mono">{cashbookData.ledger.length}</span>
              </div>
            </div>

            {loadingCashbook ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
                <span>{isMr ? 'कॅशबुक लोड होत आहे...' : 'Loading cashbook ledger...'}</span>
              </div>
            ) : cashbookData.ledger.length === 0 ? (
              <div className="py-12 text-center text-slate-500 p-4">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">
                  {isMr ? 'कोणतेही व्यवहार आढळले नाहीत' : 'No cashbook entries found for this range.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isMr
                    ? 'पेमेंट पावत्या किंवा नवीन खर्च नोंदवून कॅशबुक सुरू करा.'
                    : 'Record receipts or expenses to build cashbook entries.'}
                </p>
              </div>
            ) : (
              <div>
                {/* MOBILE CARDS VIEW FOR CASHBOOK (block md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {cashbookData.ledger.map((entry, idx) => {
                    const isIncome = entry.type === 'INCOME';
                    const formattedDate = new Date(entry.date).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                    const methodKey = entry.paymentMethod || entry.method;
                    const modeLabel = METHOD_LABELS[lang]?.[methodKey] || methodKey || '-';
                    const amountVal = isIncome
                      ? (entry.amountIn ?? entry.amount ?? 0)
                      : (entry.amountOut ?? entry.amount ?? 0);
                    const refText = entry.reference || entry.refNumber || entry.voucherNumber || '';

                    return (
                      <div key={entry.id || idx} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {entry.title}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-600">{formattedDate}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-semibold text-slate-700">{modeLabel}</span>
                            </div>
                          </div>

                          <div>
                            {isIncome ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>{isMr ? 'जमा' : 'IN'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>{isMr ? 'खर्च' : 'OUT'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {entry.description && (
                          <p className="text-xs text-slate-600 leading-snug">
                            {entry.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'व्यवहार रक्कम:' : 'Amount:'}</span>
                            <span className={`font-mono font-bold text-sm ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isIncome ? `+₹${formatCurrency(amountVal)}` : `-₹${formatCurrency(amountVal)}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'चालू शिल्लक:' : 'Running Bal:'}</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ₹{formatCurrency(entry.runningBalance)}
                            </span>
                          </div>
                          {refText && (
                            <div className="col-span-2 text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/50">
                              Ref: {refText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs font-semibold space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{isMr ? 'एकूण जमा:' : 'Total Income:'}</span>
                      <span className="font-mono text-emerald-600 font-bold">₹{formatCurrency(cashbookData.summary?.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{isMr ? 'एकूण खर्च:' : 'Total Expense:'}</span>
                      <span className="font-mono text-red-600 font-bold">₹{formatCurrency(cashbookData.summary?.totalExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900">
                      <span>{isMr ? 'अंतिम शिल्लक:' : 'Closing Balance:'}</span>
                      <span className="font-mono font-bold">₹{formatCurrency(cashbookData.summary?.totalClosingBalance)}</span>
                    </div>
                  </div>
                </div>

                {/* DESKTOP TABLE VIEW FOR CASHBOOK (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">{isMr ? 'दिनांक' : 'Date'}</th>
                        <th className="px-3 py-3">{isMr ? 'प्रकार' : 'Type'}</th>
                        <th className="px-4 py-3">{isMr ? 'तपशील / शीर्षक' : 'Details / Description'}</th>
                        <th className="px-3 py-3">{isMr ? 'साधन' : 'Payment Mode'}</th>
                        <th className="px-3 py-3">{isMr ? 'संदर्भ / व्हाउचर क्र.' : 'Ref / Voucher / Receipt'}</th>
                        <th className="px-4 py-3 text-right text-emerald-700">{t('amountInLabel')}</th>
                        <th className="px-4 py-3 text-right text-red-700">{t('amountOutLabel')}</th>
                        <th className="px-4 py-3 text-right text-amber-700">{t('runningBalanceLabel')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashbookData.ledger.map((entry, idx) => {
                        const isIncome = entry.type === 'INCOME';
                        const formattedDate = new Date(entry.date).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                        const methodKey = entry.paymentMethod || entry.method;
                        const modeLabel = METHOD_LABELS[lang]?.[methodKey] || methodKey || '-';
                        const amountInVal = entry.amountIn ?? (isIncome ? entry.amount : 0);
                        const amountOutVal = entry.amountOut ?? (!isIncome ? entry.amount : 0);
                        const refText = entry.reference || entry.refNumber || entry.voucherNumber || '-';

                        return (
                          <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="px-3 py-3">
                              {isIncome ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <ArrowDownLeft className="w-3 h-3" />
                                  {isMr ? 'जमा (In)' : 'INCOME'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  <ArrowUpRight className="w-3 h-3" />
                                  {isMr ? 'खर्च (Out)' : 'EXPENSE'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 block">
                                {entry.title}
                              </span>
                              {entry.description && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                                  {entry.description}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              <span className="text-[11px] font-medium">{modeLabel}</span>
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-600 text-[11px]">
                              {refText}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {isIncome ? `+₹${formatCurrency(amountInVal)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                              {!isIncome ? `-₹${formatCurrency(amountOutVal)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              ₹{formatCurrency(entry.runningBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-xs">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-slate-700 font-bold text-right">
                          {isMr ? 'एकूण ताळेबंद योग:' : 'Ledger Totals:'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          ₹{formatCurrency(cashbookData.summary?.totalIncome)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                          ₹{formatCurrency(cashbookData.summary?.totalExpense)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          ₹{formatCurrency(cashbookData.summary?.totalClosingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">{isMr ? 'सर्व वर्गवारी' : 'All Categories'}</option>
                  {categories.map((c) => {
                    const code = getCategoryCode(c);
                    const label = getCategoryLabel(c, isMr);
                    return (
                      <option key={c._id || code} value={code}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Method */}
              <div>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">{isMr ? 'सर्व पद्धती' : 'All Modes'}</option>
                  <option value="CASH">{METHOD_LABELS[lang]?.CASH}</option>
                  <option value="BANK_TRANSFER">{METHOD_LABELS[lang]?.BANK_TRANSFER}</option>
                  <option value="UPI">{METHOD_LABELS[lang]?.UPI}</option>
                  <option value="CHEQUE">{METHOD_LABELS[lang]?.CHEQUE}</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">{isMr ? 'सर्व स्थिती' : 'All Status'}</option>
                  <option value="COMPLETED">{isMr ? 'मान्य व्हाउचर्स' : 'Valid Vouchers'}</option>
                  <option value="CANCELLED">{isMr ? 'रद्दबातल' : 'Cancelled'}</option>
                </select>

                <button
                  onClick={() => fetchExpenses(1)}
                  className="min-h-[44px] px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
                >
                  <Filter className="w-4 h-4" />
                  <span>{isMr ? 'शोधा' : 'Filter'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expenses Register Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            {loadingExpenses ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
                <span>{isMr ? 'खर्च यादी लोड होत आहे...' : 'Loading expense vouchers...'}</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 p-4">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">
                  {isMr ? 'कोणतेही खर्च व्हाउचर आढळले नाही' : 'No expense vouchers found.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isMr
                    ? 'नवीन खर्च नोंदवण्यासाठी "नवीन खर्च नोंदणी" टॅब वापरा.'
                    : 'Click "Record New Expense" to create your first voucher.'}
                </p>
              </div>
            ) : (
              <div>
                {/* MOBILE CARDS VIEW FOR EXPENSES (block md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {expenses.map((expense) => {
                    const isCancelled = expense.isCancelled || expense.status === 'CANCELLED';
                    const formattedDate = new Date(expense.expenseDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                    const methodLabel = METHOD_LABELS[lang]?.[expense.paymentMethod] || expense.paymentMethod;

                    return (
                      <div
                        key={expense._id}
                        className={`p-4 space-y-3 transition-colors ${
                          isCancelled ? 'bg-red-50/20 opacity-75' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {expense.titleMarathi || expense.titleEnglish}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                {getCategoryLabel(expense.category, isMr)}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="font-mono text-slate-600">{formattedDate}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                              {expense.voucherNumber}
                            </span>
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <XCircle className="w-3 h-3" />
                                <span>{isMr ? 'रद्दबातल' : 'Cancelled'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isMr ? 'मान्य' : 'Valid'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'खर्च रक्कम:' : 'Amount:'}</span>
                            <span className="font-mono font-bold text-red-600 text-sm">
                              ₹{Number(expense.amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'स्वीकारणारे:' : 'Payee:'}</span>
                            <span className="font-semibold text-slate-800 truncate block">
                              {expense.payeeName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">{isMr ? 'साधन:' : 'Mode:'}</span>
                            <span className="text-slate-700 font-medium">{methodLabel}</span>
                          </div>
                          {expense.transactionRef && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Ref: {expense.transactionRef}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExpenseForDetail(expense);
                              setIsDetailModalOpen(true);
                            }}
                            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isMr ? 'व्हाउचर पहा' : 'View Voucher'}</span>
                          </button>

                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpenseToCancel(expense);
                                setIsCancelModalOpen(true);
                              }}
                              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors flex items-center justify-center gap-1 text-xs cursor-pointer"
                              title={isMr ? 'व्हाउचर रद्द करा' : 'Cancel Voucher'}
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

                {/* DESKTOP TABLE VIEW FOR EXPENSES (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">{isMr ? 'व्हाउचर क्र.' : 'Voucher No.'}</th>
                        <th className="px-3 py-3">{isMr ? 'दिनांक' : 'Date'}</th>
                        <th className="px-3 py-3">{isMr ? 'वर्गवारी' : 'Category'}</th>
                        <th className="px-4 py-3">{isMr ? 'खर्चाचे शीर्षक' : 'Expense Title'}</th>
                        <th className="px-3 py-3">{isMr ? 'पैसे स्वीकारणारे' : 'Payee'}</th>
                        <th className="px-3 py-3">{isMr ? 'पद्धत' : 'Payment Mode'}</th>
                        <th className="px-4 py-3 text-right">{isMr ? 'रक्कम (₹)' : 'Amount (₹)'}</th>
                        <th className="px-3 py-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                        <th className="px-4 py-3 text-right">{isMr ? 'कृती' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((expense) => {
                        const isCancelled = expense.isCancelled || expense.status === 'CANCELLED';
                        const formattedDate = new Date(expense.expenseDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB');
                        const methodLabel = METHOD_LABELS[lang]?.[expense.paymentMethod] || expense.paymentMethod;

                        return (
                          <tr
                            key={expense._id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isCancelled ? 'bg-red-50/30 opacity-75' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-orange-700 whitespace-nowrap">
                              {expense.voucherNumber}
                            </td>
                            <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] border border-slate-200">
                                {getCategoryLabel(expense.category, isMr)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 block">
                                {expense.titleMarathi || expense.titleEnglish}
                              </span>
                              {expense.transactionRef && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Ref: {expense.transactionRef}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap">
                              {expense.payeeName}
                            </td>
                            <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                              {methodLabel}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              ₹{Number(expense.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {isCancelled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  <XCircle className="w-3 h-3" />
                                  {isMr ? 'रद्दबातल' : 'Cancelled'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isMr ? 'मान्य' : 'Valid'}
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
                                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title={isMr ? 'व्हाउचर पहा / प्रिंट करा' : 'View / Print Voucher'}
                                >
                                  <Eye className="w-4 h-4 text-orange-600" />
                                </button>
                                {!isCancelled && (
                                  <button
                                    onClick={() => {
                                      setExpenseToCancel(expense);
                                      setIsCancelModalOpen(true);
                                    }}
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    title={isMr ? 'खर्च व्हाउचर रद्द करा' : 'Cancel Voucher'}
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

            {/* Pagination */}
            {expPagination.totalPages > 1 && (
              <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {isMr ? 'पृष्ठ' : 'Page'} {expPagination.currentPage} of {expPagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={expPagination.currentPage <= 1}
                    onClick={() => fetchExpenses(expPagination.currentPage - 1)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
                  >
                    {isMr ? 'मागील' : 'Prev'}
                  </button>
                  <button
                    disabled={expPagination.currentPage >= expPagination.totalPages}
                    onClick={() => fetchExpenses(expPagination.currentPage + 1)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold cursor-pointer"
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
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {isMr ? 'खर्च व्हाउचर यशस्वीरीत्या नोंदवले गेले!' : 'Expense Voucher Recorded Successfully!'}
                  </h4>
                  <p className="text-emerald-700 font-mono mt-0.5">
                    {isMr ? 'व्हाउचर क्र.:' : 'Voucher No.:'} {createdExpense.voucherNumber} • {isMr ? 'रक्कम:' : 'Amount:'} ₹{Number(createdExpense.amount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedExpenseForDetail(createdExpense);
                    setIsDetailModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors text-xs"
                >
                  {isMr ? 'व्हाउचर पहा' : 'View Voucher'}
                </button>
                <button
                  onClick={() => setCreatedExpense(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 font-devanagari">
                {t('recordExpenseBtn')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isMr
                  ? 'सोसायटीचा अधिकृत खर्च नोंदवून ऑटोमॅटिक व्हाउचर क्रमांक जनरेट करा.'
                  : 'Record official society expense with atomic voucher generation.'}
              </p>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Titles: Marathi & English */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'खर्चाचे शीर्षक (मराठी)' : 'Expense Title (Marathi)'} <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="titleMarathi"
                    placeholder={lang === 'mr' ? 'उदा. लिफ्ट मासिक देखभाल, पंप दुरुस्ती, स्ट्रीट लाइट...' : 'e.g. Lift maintenance, motor repair, cleaning...'}
                    value={formData.titleMarathi}
                    onChange={handleFormChange}
                    required
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'खर्चाचे शीर्षक (इंग्रजी, पर्यायी)' : 'Expense Title (English, Optional)'}
                  </label>
                  <input
                    type="text"
                    name="titleEnglish"
                    placeholder="E.g., Lift monthly AMC, water motor repair..."
                    value={formData.titleEnglish}
                    onChange={handleFormChange}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {t('categoryLabel')} <span className="text-orange-600">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    disabled={loadingCategories}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:bg-slate-100"
                  >
                    {loadingCategories && (
                      <option value="">{isMr ? 'वर्गवारी लोड होत आहे...' : 'Loading categories...'}</option>
                    )}
                    {!loadingCategories && categories.length === 0 && (
                      <option value="">{isMr ? 'कोणतीही वर्गवारी उपलब्ध नाही' : 'No categories available'}</option>
                    )}
                    {categories.map((cat) => {
                      const code = getCategoryCode(cat);
                      const label = getCategoryLabel(cat, isMr);
                      return (
                        <option key={cat._id || code} value={code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {categoryError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{categoryError}</span>
                      <button
                        type="button"
                        onClick={fetchCategories}
                        className="underline hover:text-red-800 ml-1 font-semibold cursor-pointer"
                      >
                        {isMr ? 'पुन्हा प्रयत्न करा' : 'Retry'}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'खर्च रक्कम (₹)' : 'Expense Amount (₹)'} <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                    <input
                      type="number"
                      name="amount"
                      min="1"
                      step="any"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleFormChange}
                      required
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl pl-8 pr-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'खर्च दिनांक' : 'Expense Date'} <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleFormChange}
                    required
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'पेमेंट पद्धत' : 'Payment Mode'} <span className="text-orange-600">*</span>
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleFormChange}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {t('payeeNameLabel')} <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="payeeName"
                    placeholder={lang === 'mr' ? 'उदा. महावितरण, जॉन्सन लिफ्ट्स, रमेश जाधव...' : 'e.g. MSEDCL, Johnson Lifts, Ramesh Jadhav...'}
                    value={formData.payeeName}
                    onChange={handleFormChange}
                    required
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {lang === 'mr' ? 'व्यवहार संदर्भ / UTR / धनादेश क्र. (पर्यायी)' : 'Transaction Ref / UTR / Cheque No. (Optional)'}
                  </label>
                  <input
                    type="text"
                    name="transactionRef"
                    placeholder={lang === 'mr' ? 'उदा. UTR12345678, CHQ-987654...' : 'e.g. UTR12345678, CHQ-987654...'}
                    value={formData.transactionRef}
                    onChange={handleFormChange}
                    className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Description / Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {lang === 'mr' ? 'तपशील व शेरा (पर्यायी)' : 'Description & Remarks (Optional)'}
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder={lang === 'mr' ? 'खर्चाचा सविस्तर तपशील, कामाचे स्वरूप किंवा शेरा...' : 'Detailed description, work nature or audit remarks...'}
                  value={formData.description}
                  onChange={handleFormChange}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
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
                    })
                  }
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                >
                  {isMr ? 'रीसेट करा' : 'Reset'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isMr ? 'नोंद होत आहे...' : 'Recording...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('recordExpenseBtn')}</span>
                    </>
                  )}
                </button>
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
          showNotification(msg || (isMr ? 'आरंभी शिल्लक सुरक्षित जतन केली!' : 'Opening balance saved successfully!'));
          fetchCashbook();
        }}
      />

      {/* Expense Detail / Print Modal */}
      <ExpenseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedExpenseForDetail(null);
        }}
        expense={selectedExpenseForDetail}
      />

      {/* Audited Cancel Expense Modal */}
      <CancelExpenseModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setExpenseToCancel(null);
        }}
        expense={expenseToCancel}
        onConfirm={handleConfirmCancelExpense}
      />
    </div>
  );
};

export default ExpenseManagement;
