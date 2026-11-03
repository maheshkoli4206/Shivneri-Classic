import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Building2,
  Calendar,
  Settings,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  Globe,
  LogOut,
  Users,
  LayoutDashboard,
  IndianRupee,
  Layers,
  Check,
  Eye,
  X
} from 'lucide-react';

const MONTH_NAMES_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MaintenanceManagement = () => {
  const { logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Active Tab: 'dues' | 'generate' | 'config'
  const [activeTab, setActiveTab] = useState('dues');

  // Summary State
  const [summary, setSummary] = useState({
    totalBilledAmount: 0,
    totalPaidAmount: 0,
    totalOutstandingAmount: 0,
    totalBillsCount: 0,
    unpaidCount: 0
  });

  // Dues List State
  const [dues, setDues] = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Config State
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configForm, setConfigForm] = useState({
    defaultMonthlyAmount: '',
    dueDay: 10,
    lateFeeEnabled: false,
    lateFeeAmount: 0
  });
  const [configSaving, setConfigSaving] = useState(false);

  // Generation Workflow State
  const [genMonth, setGenMonth] = useState(currentMonth);
  const [genYear, setGenYear] = useState(currentYear);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Detail Modal State
  const [selectedDue, setSelectedDue] = useState(null);

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Maintenance Config
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await api.get('/maintenance/config');
      if (res.data.success && res.data.config) {
        setConfig(res.data.config);
        setConfigForm({
          defaultMonthlyAmount: res.data.config.defaultMonthlyAmount ?? '',
          dueDay: res.data.config.dueDay ?? 10,
          lateFeeEnabled: res.data.config.lateFeeEnabled ?? false,
          lateFeeAmount: res.data.config.lateFeeAmount ?? 0
        });
      }
    } catch (err) {
      console.warn('Error fetching config:', err.message);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // 2. Fetch Summary Metrics
  const fetchSummary = useCallback(async () => {
    try {
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      const res = await api.get('/maintenance/summary', { params });
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.warn('Error fetching summary:', err.message);
    }
  }, [filterMonth, filterYear]);

  // 3. Fetch Dues List
  const fetchDues = useCallback(async () => {
    setDuesLoading(true);
    try {
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/maintenance/dues', { params });
      if (res.data.success) {
        setDues(res.data.dues || []);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'देयकांची यादी लोड करताना त्रुटी आली.');
    } finally {
      setDuesLoading(false);
    }
  }, [filterMonth, filterYear, filterStatus, searchQuery]);

  useEffect(() => {
    fetchConfig();
    fetchSummary();
    fetchDues();
  }, [fetchConfig, fetchSummary, fetchDues]);

  // Handle Save Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (configForm.defaultMonthlyAmount === '' || Number(configForm.defaultMonthlyAmount) < 0) {
      setErrorMessage('कृपया वैध मासिक देखभाल शुल्क प्रविष्ट करा.');
      return;
    }

    setConfigSaving(true);
    try {
      const res = await api.put('/maintenance/config', configForm);
      if (res.data.success) {
        setConfig(res.data.config);
        setSuccessMessage('देखभाल सेटिंग्ज यशस्वीरीत्या जतन केल्या!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'सेटिंग्ज जतन करताना त्रुटी आली.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Handle Fetch Preview
  const handleFetchPreview = async () => {
    setPreviewLoading(true);
    setErrorMessage('');
    setPreviewData(null);
    try {
      const res = await api.get('/maintenance/preview', {
        params: { month: genMonth, year: genYear }
      });
      if (res.data.success) {
        setPreviewData(res.data.preview);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'पूर्वावलोकन आणताना त्रुटी आली.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Confirm Generate Bills
  const handleGenerateBills = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const res = await api.post('/maintenance/generate', {
        month: genMonth,
        year: genYear
      });
      if (res.data.success) {
        setSuccessMessage(
          `${genMonth}/${genYear} महिन्यासाठी ${res.data.summary.createdCount} नवीन देयके यशस्वीरीत्या तयार केली!`
        );
        setIsConfirmModalOpen(false);
        setPreviewData(null);
        fetchSummary();
        fetchDues();
        setActiveTab('dues');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'देयके तयार करताना त्रुटी आली.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getMonthName = (monthNumber) => {
    const idx = Number(monthNumber) - 1;
    return lang === 'mr' ? MONTH_NAMES_MR[idx] || monthNumber : MONTH_NAMES_EN[idx] || monthNumber;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header & Navigation */}
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

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('navMaintenance')}</span>
            </div>

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
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('maintenanceTitle')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                टप्पा ५ इंजिन
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t('maintenanceSubtitle')}
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('dues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'dues'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('tabDues')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('generate');
                if (!previewData) handleFetchPreview();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'generate'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('tabGenerate')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('tabSettings')}</span>
            </button>
          </div>
        </div>

        {/* Global Toast Messages */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('totalBilledLabel')}</span>
              <IndianRupee className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              ₹ {summary.totalBilledAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              एकूण {summary.totalBillsCount} देयकांची आकारणी
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-red-400 mb-1">
              <span>{t('totalOutstandingLabel')}</span>
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-400 font-mono">
              ₹ {summary.totalOutstandingAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              थकीत येणे रक्कम (Phase 5 मध्ये शून्य पेमेंट नोंदणी)
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{t('unpaidBillsLabel')}</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
              {summary.unpaidCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              प्रलंबित देयके संख्या
            </div>
          </div>
        </div>

        {/* TAB 1: DUES REGISTRY */}
        {activeTab === 'dues' && (
          <div>
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Month Filter */}
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">सर्व महिने (All Months)</option>
                  {MONTH_NAMES_MR.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1}. {lang === 'mr' ? m : MONTH_NAMES_EN[idx]}
                    </option>
                  ))}
                </select>

                {/* Year Filter */}
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                >
                  <option value="">सर्व वर्षे (All Years)</option>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl p-0.5">
                  {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        filterStatus === s
                          ? 'bg-orange-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s === 'ALL'
                        ? t('filterAll')
                        : s === 'UNPAID'
                        ? 'थकीत'
                        : s === 'PARTIAL'
                        ? 'अंशतः'
                        : 'भरलेले'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dues Table */}
            {duesLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">देयके लोड होत आहेत...</p>
              </div>
            ) : dues.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm">{t('emptyDues')}</p>
                {(!config || !config.isConfigured) && (
                  <button
                    onClick={() => setActiveTab('config')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold"
                  >
                    <span>प्रथम देखभाल सेटिंग्ज करा</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="py-3.5 px-4 w-12 text-center">{t('colSrNo')}</th>
                        <th className="py-3.5 px-4">{t('colName')}</th>
                        <th className="py-3.5 px-4">{t('colFlat')}</th>
                        <th className="py-3.5 px-4">{t('colMonthYear')}</th>
                        <th className="py-3.5 px-4 text-right">{t('colFeeAmount')}</th>
                        <th className="py-3.5 px-4 text-right">{t('colPaidAmount')}</th>
                        <th className="py-3.5 px-4 text-right">{t('colBalance')}</th>
                        <th className="py-3.5 px-4 text-center">{t('colStatus')}</th>
                        <th className="py-3.5 px-4 text-center">{t('colDueDate')}</th>
                        <th className="py-3.5 px-4 text-right">{t('colActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {dues.map((d, index) => (
                        <tr key={d._id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {d.residentNameSnapshot}
                          </td>
                          <td className="py-3 px-4">
                            {d.flatNumberSnapshot ? (
                              <span className="font-mono font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                {d.flatNumberSnapshot}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                {t('notAvailable')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {getMonthName(d.month)} {d.year}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-white">
                            ₹ {d.totalAmountDue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            ₹ {d.amountPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                            ₹ {d.outstandingBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                d.status === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : d.status === 'PARTIAL'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              <span>
                                {d.status === 'PAID'
                                  ? t('statusPaid')
                                  : d.status === 'PARTIAL'
                                  ? t('statusPartial')
                                  : t('statusUnpaid')}
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                            {new Date(d.dueDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedDue(d)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title={t('btnView')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GENERATE MONTHLY DUES WORKFLOW */}
        {activeTab === 'generate' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-1">
                {t('tabGenerate')}
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                निवडलेल्या महिन्यासाठी सोसायटीतील सर्व सक्रिय सभासदांसाठी देयकांची आकारणी करा.
              </p>

              {/* Month & Year Selection Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('selectMonthLabel')}
                  </label>
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {MONTH_NAMES_MR.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1}. {lang === 'mr' ? m : MONTH_NAMES_EN[idx]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('selectYearLabel')}
                  </label>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleFetchPreview}
                    disabled={previewLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
                  >
                    {previewLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-orange-400" />
                    )}
                    <span>{t('previewBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Preview Results Showcase */}
              {previewData && (
                <div className="border border-slate-800 bg-slate-950/70 rounded-xl p-5 mb-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                    <div className="text-xs font-semibold text-white">
                      पूर्वावलोकन: {getMonthName(previewData.month)} {previewData.year}
                    </div>
                    <div className="text-xs text-orange-400 font-mono font-semibold">
                      दर युनिट दर: ₹ {previewData.configuredAmount}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[11px]">सक्रिय सभासद</div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {previewData.totalActiveResidents}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[11px]">आधीच तयार देयके</div>
                      <div className="text-base font-bold text-slate-300 mt-0.5">
                        {previewData.alreadyBilledCount}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-emerald-400 text-[11px]">नवीन पात्र सभासद</div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {previewData.newEligibleCount}
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-orange-400 text-[11px]">अंदाजे संकलन</div>
                      <div className="text-base font-bold text-orange-400 mt-0.5 font-mono">
                        ₹ {previewData.estimatedCollection.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Residents Preview Table */}
                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-slate-400 text-[11px] sticky top-0">
                        <tr className="border-b border-slate-800">
                          <th className="p-2 w-10 text-center">#</th>
                          <th className="p-2">सभासद नाव</th>
                          <th className="p-2">सदनिका क्र.</th>
                          <th className="p-2 text-right">रक्कम</th>
                          <th className="p-2 text-center">स्थिती</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {previewData.previewList.map((p, idx) => (
                          <tr key={p.residentId} className="hover:bg-slate-900/40">
                            <td className="p-2 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="p-2 text-white font-medium">
                              {p.fullNameMarathi}
                            </td>
                            <td className="p-2 text-slate-400 font-mono">
                              {p.flatNumber || '-'}
                            </td>
                            <td className="p-2 text-right font-mono text-white">
                              ₹ {p.amountToBill}
                            </td>
                            <td className="p-2 text-center">
                              {p.alreadyBilled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                                  आधीच तयार (Existing)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                                  नवीन आकारणी (New)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Generate Button Action */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={previewData.newEligibleCount === 0}
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>{t('generateBtn')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('configCardTitle')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('configCardSubtitle')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('defaultMonthlyAmount')} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono">
                      ₹
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      step="50"
                      value={configForm.defaultMonthlyAmount}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, defaultMonthlyAmount: e.target.value })
                      }
                      placeholder="उदा. 1500"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    प्रत्येक सदनिकेसाठी मासिक देखभाल शुल्काचा निश्चित दर.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('dueDayLabel')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={configForm.dueDay}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, dueDay: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    देयक भरण्यासाठी महिन्याची अंतिम तारीख (उदा. दरमहा १० तारीख).
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-300 font-semibold block">
                        {t('lateFeeEnabledLabel')}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        देय तारखेनंतर दंड आकारणी लागू करावयाची असल्यास सक्रिय करा.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.lateFeeEnabled}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, lateFeeEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-orange-600 rounded bg-slate-900 border-slate-700 focus:ring-orange-500"
                    />
                  </div>

                  {configForm.lateFeeEnabled && (
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        {t('lateFeeAmountLabel')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={configForm.lateFeeAmount}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            lateFeeAmount: Number(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={configSaving}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {configSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{configSaving ? t('btnSaving') : t('saveConfigBtn')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION MODAL FOR GENERATING MONTHLY DUES */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Layers className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              {t('confirmGenerateTitle')}
            </h3>
            <p className="text-xs text-slate-300 font-medium mb-3">
              {getMonthName(genMonth)} {genYear}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              {t('confirmGenerateDesc')}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateBills}
                className="px-4 py-2 rounded-xl font-semibold text-xs text-white bg-orange-600 hover:bg-orange-500 flex items-center gap-1.5"
              >
                {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isGenerating ? t('generating') : t('generateBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DUE DETAILS MODAL */}
      {selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedDue(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedDue.residentNameSnapshot}
                </h3>
                <span className="text-xs text-orange-400 font-medium">
                  {getMonthName(selectedDue.month)} {selectedDue.year}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-5">
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">सदनिका क्र. (Flat):</span>
                <span className="font-mono text-white font-medium">
                  {selectedDue.flatNumberSnapshot || t('notAvailable')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">इमारत विंग:</span>
                <span className="text-white font-medium">{selectedDue.wing}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">आकारलेली रक्कम:</span>
                <span className="font-mono text-white font-medium">
                  ₹ {selectedDue.totalAmountDue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">भरलेली रक्कम:</span>
                <span className="font-mono text-slate-300 font-medium">
                  ₹ {selectedDue.amountPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">शिल्लक येणे (बाकी):</span>
                <span className="font-mono text-red-400 font-bold">
                  ₹ {selectedDue.outstandingBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">देयक स्थिती:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                  {selectedDue.status === 'PAID'
                    ? t('statusPaid')
                    : selectedDue.status === 'PARTIAL'
                    ? t('statusPartial')
                    : t('statusUnpaid')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">देय दिनांक:</span>
                <span className="font-mono text-slate-200">
                  {new Date(selectedDue.dueDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">निर्मिती दिनांक:</span>
                <span className="text-slate-400 text-[11px]">
                  {new Date(selectedDue.createdAt).toLocaleString('mr-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDue(null)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs"
            >
              बंद करा (Close)
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        शिवनेरी क्लासिक अपार्टमेंट (ए विंग) • औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र.
      </footer>
    </div>
  );
};

export default MaintenanceManagement;
