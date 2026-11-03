import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Users,
  CreditCard,
  Wallet,
  Building2,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Landmark,
  Layers,
  ShieldCheck,
  RefreshCw,
  LayoutDashboard,
  Globe,
  LogOut,
  Filter,
  PieChart as PieIcon,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import DonutChart from '../../components/charts/DonutChart';

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

const ReportsManagement = () => {
  const { logout } = useAuth();
  const { lang, t, toggleLanguage } = useLanguage();
  const isMr = lang === 'mr';

  // Active Tab: 'overview' | 'maintenance' | 'expenses' | 'financials' | 'charts'
  const [activeTab, setActiveTab] = useState('overview');

  // Filters State
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');

  // Report Data States
  const [overview, setOverview] = useState(null);
  const [maintenanceReport, setMaintenanceReport] = useState(null);
  const [expenseReport, setExpenseReport] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [chartsData, setChartsData] = useState(null);

  // Fetch all reports data
  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;

      const [ovRes, maintRes, expRes, finRes, chartRes] = await Promise.all([
        axios.get('/api/v1/reports/overview', { params, withCredentials: true }),
        axios.get('/api/v1/reports/maintenance', { params, withCredentials: true }),
        axios.get('/api/v1/reports/expenses', { params, withCredentials: true }),
        axios.get('/api/v1/reports/financial-summary', { params, withCredentials: true }),
        axios.get('/api/v1/reports/charts', { params: { year: selectedYear || 2026 }, withCredentials: true })
      ]);

      if (ovRes.data?.success) setOverview(ovRes.data.data.overview);
      if (maintRes.data?.success) setMaintenanceReport(maintRes.data.data);
      if (expRes.data?.success) setExpenseReport(expRes.data.data);
      if (finRes.data?.success) setFinancialSummary(finRes.data.data);
      if (chartRes.data?.success) setChartsData(chartRes.data.data);
    } catch (err) {
      console.error('Failed to fetch reports data:', err);
      setError(err.response?.data?.message || err.message || 'अहवाल लोड करताना त्रुटी आली.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [selectedYear, selectedMonth]);

  // Export Excel Report Handler
  const handleExportExcel = async () => {
    try {
      setDownloadingExcel(true);
      const params = { lang };
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;

      const response = await axios.get('/api/v1/reports/export/excel', {
        params,
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Shivneri-Financial-Report-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert(isMr ? 'एक्सेल अहवाल डाउनलोड करताना त्रुटी आली' : 'Failed to export Excel report');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Export PDF Report Handler
  const handleExportPdf = async () => {
    try {
      setDownloadingPdf(true);
      const params = { lang };
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;

      const response = await axios.get('/api/v1/reports/export/pdf', {
        params,
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Shivneri-Financial-Report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export PDF report:', err);
      alert(isMr ? 'पीडीएफ अहवाल तयार करताना त्रुटी आली' : 'Failed to export PDF report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col printable-report">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3 print:hidden">
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

            <Link
              to="/expenses"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navExpenses')}</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('navReports')}</span>
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
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-500/40 rounded-2xl flex items-center gap-3 text-xs text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Page Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {isMr ? 'वित्तीय अहवाल व सांख्यिकी' : 'Financial Reports & Analytics'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {isMr ? 'अधिकृत लेखापरीक्षण' : 'Official Society Audit'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2 font-devanagari">
              {t('reportsTitle')}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t('reportsSubtitle')}
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="">{isMr ? 'सर्व वर्षे (All Years)' : 'All Years'}</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="">{isMr ? 'सर्व महिने (All Months)' : 'All Months'}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES_MR[m]}
                </option>
              ))}
            </select>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={downloadingExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              title="Download Excel Workbook"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{downloadingExcel ? (isMr ? 'डाऊनलोड...' : 'Exporting...') : 'Excel'}</span>
            </button>

            {/* PDF Export */}
            <button
              onClick={handleExportPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/25 transition-all disabled:opacity-50"
              title="Download PDF Audit Report"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPdf ? (isMr ? 'तयार होत आहे...' : 'Generating...') : 'PDF'}</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
              <span>{isMr ? 'प्रिंट' : 'Print'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAllReports}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('tabOverview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t('tabMaintenanceReport')}</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{t('tabExpenseReport')}</span>
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'financials'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>{t('tabCashbookReport')}</span>
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'charts'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('tabVisualCharts')}</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: EXECUTIVE OVERVIEW
            ========================================================================= */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* Top 6 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Billed */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {isMr ? 'एकूण देखभाल आकारणी (Total Billed)' : 'Total Billed'}
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-white mt-1">
                    ₹{Number(overview.totalBilled || 0).toLocaleString('en-IN')}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {overview.duesCounts.totalBills} देयके (दरमहा ₹१,०००)
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              {/* Total Collected */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-medium">
                    {isMr ? 'एकूण वसूल देखभाल (Total Collected)' : 'Total Collected'}
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ₹{Number(overview.totalCollected || 0).toLocaleString('en-IN')}
                  </h3>
                  <p className="text-[10px] text-emerald-500/80 mt-1 flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>{overview.vouchers.completedPaymentsCount} अधिकृत पावत्या</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
              </div>

              {/* Outstanding Dues */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-red-400 font-medium">
                    {isMr ? 'थकीत येणेबाकी (Outstanding Dues)' : 'Outstanding Dues'}
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-red-400 mt-1">
                    ₹{Number(overview.totalOutstanding || 0).toLocaleString('en-IN')}
                  </h3>
                  <p className="text-[10px] text-red-400/80 mt-1">
                    वसुली प्रलंबित शिल्लक
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              {/* Collection Rate (%) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {t('collectionRateLabel')}
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {overview.collectionPercentage}%
                  </h3>
                  <div className="w-36 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min(overview.collectionPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {t('totalExpensesLabel')}
                  </span>
                  <h3 className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    ₹{Number(overview.totalExpenses || 0).toLocaleString('en-IN')}
                  </h3>
                  <p className="text-[10px] text-amber-500/80 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{overview.vouchers.activeExpensesCount} मंजूर खर्च व्हाउचर्स</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* Net Surplus / Deficit */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    {t('netSurplusLabel')}
                  </span>
                  <h3
                    className={`text-2xl font-bold font-mono mt-1 ${
                      overview.netSurplusDeficit >= 0 ? 'text-teal-400' : 'text-amber-400'
                    }`}
                  >
                    ₹{Number(overview.netSurplusDeficit || 0).toLocaleString('en-IN')}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    जमा वजा खर्च निव्वळ फरक
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Resident Dues Clearance Breakdown Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isMr ? '१६ मूळ सभासद थकबाकी स्थिती विश्लेषण' : '16 Residents Dues Clearance Status'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    शिवनेरी क्लासिक अपार्टमेंट (ए विंग) मधील सर्व १६ सभासदांचे थकबाकी वर्गीकरण
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {overview.residentCounts.totalActiveResidents} मूळ सभासद
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-400 font-semibold">{t('clearedResidentsLabel')}</span>
                    <h4 className="text-xl font-bold font-mono text-emerald-300 mt-1">
                      {overview.residentCounts.residentsFullyCleared}
                    </h4>
                    <span className="text-[10px] text-slate-400">थकबाकी पूर्ण भरलेली</span>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
                </div>

                <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-400 font-semibold">{t('partialResidentsLabel')}</span>
                    <h4 className="text-xl font-bold font-mono text-amber-300 mt-1">
                      {overview.residentCounts.residentsWithPartialDues}
                    </h4>
                    <span className="text-[10px] text-slate-400">काही रक्कम थकीत</span>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-400/80" />
                </div>

                <div className="bg-slate-950/70 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-red-400 font-semibold">{t('pendingResidentsLabel')}</span>
                    <h4 className="text-xl font-bold font-mono text-red-300 mt-1">
                      {overview.residentCounts.residentsWithPendingDues}
                    </h4>
                    <span className="text-[10px] text-slate-400">संपूर्ण देयक थकीत</span>
                  </div>
                  <Clock className="w-8 h-8 text-red-400/80" />
                </div>
              </div>
            </div>

            {/* Mode-Wise Segregated Cashbook Strip */}
            {financialSummary && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white">
                    {isMr ? 'साधननिहाय स्वतंत्र ताळेबंद (Non-Commingled Balances)' : 'Mode-Wise Segregated Balances'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {isMr ? 'रोख व बँक स्वतंत्र' : 'Physical Cash segregated from Bank'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5" />
                      {t('cashBalanceLabel')}
                    </span>
                    <div className="text-lg font-bold font-mono text-emerald-300">
                      ₹{Number(financialSummary.modeWise.CASH.closing).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      {t('bankBalanceLabel')}
                    </span>
                    <div className="text-lg font-bold font-mono text-blue-300">
                      ₹{Number(financialSummary.modeWise.BANK_TRANSFER.closing).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-xs text-purple-400 font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {t('upiBalanceLabel')}
                    </span>
                    <div className="text-lg font-bold font-mono text-purple-300">
                      ₹{Number(financialSummary.modeWise.UPI.closing).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 space-y-1">
                    <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      {t('chequeBalanceLabel')}
                    </span>
                    <div className="text-lg font-bold font-mono text-amber-300">
                      ₹{Number(financialSummary.modeWise.CHEQUE.closing).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: MAINTENANCE REPORTS
            ========================================================================= */}
        {activeTab === 'maintenance' && maintenanceReport && (
          <div className="space-y-6">
            {/* Month-Wise Collections Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isMr ? 'महिनानिहाय देखभाल वसुली अहवाल' : 'Month-Wise Maintenance Collections'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    प्रत्येक महिन्यातील आकारणी, वसुली व वसुली टक्केवारी
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">महिना / वर्ष</th>
                      <th className="px-4 py-3 text-right">आकारणी (Billed ₹)</th>
                      <th className="px-4 py-3 text-right text-emerald-400">वसुली (Collected ₹)</th>
                      <th className="px-4 py-3 text-right text-red-400">थकबाकी (Due ₹)</th>
                      <th className="px-3 py-3 text-center">वसुली %</th>
                      <th className="px-3 py-3 text-center text-emerald-400">पूर्ण</th>
                      <th className="px-3 py-3 text-center text-amber-400">अंशतः</th>
                      <th className="px-3 py-3 text-center text-red-400">थकीत</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {maintenanceReport.monthWiseCollections.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          कोणतीही देयके आढळली नाहीत.
                        </td>
                      </tr>
                    ) : (
                      maintenanceReport.monthWiseCollections.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">
                            {isMr ? m.monthNameMarathi : m.monthNameEnglish} {m.year}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300">
                            ₹{m.totalBilled.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            ₹{m.totalPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                            ₹{m.totalOutstanding.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-cyan-400">
                            {m.collectionPercentage}%
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-emerald-400">{m.paidCount}</td>
                          <td className="px-3 py-3 text-center font-mono text-amber-400">{m.partialCount}</td>
                          <td className="px-3 py-3 text-center font-mono text-red-400">{m.unpaidCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approved 16 Residents Dues Roster */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isMr ? '१६ मूळ सभासद देयके व येणेबाकी नोंदवही' : 'Approved 16 Residents Dues & Payments Ledger'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    अधिकृत १६ सभासदांचे चालू खाते, एकूण आकारणी, एकूण जमा व येणेबाकी
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">स्थिती फिल्टर:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                  >
                    <option value="ALL">सर्व (All)</option>
                    <option value="CLEARED">थकबाकी शून्य (Cleared)</option>
                    <option value="PARTIAL">अंशतः थकीत (Partial)</option>
                    <option value="PENDING">थकीत (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">सदनिका क्र.</th>
                      <th className="px-4 py-3">सभासदाचे नाव</th>
                      <th className="px-3 py-3">संपर्क</th>
                      <th className="px-4 py-3 text-right">एकूण आकारणी</th>
                      <th className="px-4 py-3 text-right text-emerald-400">एकूण जमा</th>
                      <th className="px-4 py-3 text-right text-red-400">थकबाकी (Due)</th>
                      <th className="px-3 py-3 text-center">स्थिती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {maintenanceReport.residentSummaries
                      .filter(r => selectedStatus === 'ALL' || r.overallStatus === selectedStatus)
                      .map((res, idx) => (
                        <tr key={res.residentId || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-orange-400 whitespace-nowrap">
                            {res.wing}-{res.flatNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-100 font-devanagari">
                            {res.fullNameMarathi}
                          </td>
                          <td className="px-3 py-3 text-slate-400 font-mono">
                            {res.mobileNumber || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300">
                            ₹{res.totalBilled.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                            ₹{res.totalPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                            ₹{res.totalOutstanding.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {res.overallStatus === 'CLEARED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                क्लिअर (Cleared)
                              </span>
                            ) : res.overallStatus === 'PARTIAL' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                अंशतः (Partial)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                                थकीत (Pending)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: EXPENSE REPORTS
            ========================================================================= */}
        {activeTab === 'expenses' && expenseReport && (
          <div className="space-y-6">
            {/* Category-Wise Breakdown Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isMr ? 'खर्च वर्गवारी तपशील (Category-Wise Expense Breakdown)' : 'Category-Wise Expense Breakdown'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    सोसायटीच्या विविध देखभाल शीर्षकांवर झालेला अधिकृत खर्च
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  एकूण: ₹{expenseReport.grandTotalActiveExpenses.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">खर्च वर्गवारी (Category)</th>
                      <th className="px-3 py-3 text-center">व्हाउचर संख्या</th>
                      <th className="px-4 py-3 text-right">रक्कम (Amount ₹)</th>
                      <th className="px-4 py-3 text-right">टक्केवारी (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenseReport.categoryBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          कोणताही खर्च आढळला नाही.
                        </td>
                      </tr>
                    ) : (
                      expenseReport.categoryBreakdown.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-100">
                            {isMr ? cat.categoryNameMarathi : cat.category}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-slate-300">
                            {cat.vouchersCount}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">
                            ₹{cat.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-cyan-400 font-bold">
                            {cat.percentage}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audited Cancelled Expenses Section */}
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-red-950/20 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-red-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-400" />
                    <span>{isMr ? 'रद्दबातल खर्चाचा ऑडिट इतिहास (Audited Cancelled Vouchers)' : 'Cancelled Vouchers History'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    प्रशासकाने रद्द केलेली व्हाउचर्स (कॅशबुक ताळेबंदातून पूर्णपणे वगळली आहेत)
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-950/60 text-red-300 border border-red-500/40">
                  {expenseReport.cancelledExpenses.count} रद्द व्हाउचर्स (₹{expenseReport.cancelledExpenses.totalAmount.toLocaleString('en-IN')})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">व्हाउचर क्र.</th>
                      <th className="px-3 py-3">खर्च शीर्षक</th>
                      <th className="px-3 py-3">विक्रेता</th>
                      <th className="px-4 py-3 text-right">रक्कम</th>
                      <th className="px-4 py-3">रद्द करण्याचे कारण (Reason)</th>
                      <th className="px-3 py-3">रद्द दिनांक</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenseReport.cancelledExpenses.vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          कोणतेही रद्दबातल व्हाउचर नाही (No cancelled vouchers).
                        </td>
                      </tr>
                    ) : (
                      expenseReport.cancelledExpenses.vouchers.map((e) => (
                        <tr key={e._id} className="hover:bg-slate-800/40 text-slate-300">
                          <td className="px-4 py-3 font-mono font-bold text-red-400">{e.voucherNumber}</td>
                          <td className="px-3 py-3">{e.titleMarathi}</td>
                          <td className="px-3 py-3">{e.payeeName}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-red-300">
                            ₹{Number(e.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-slate-400 italic">{e.cancellationReason || '-'}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-slate-400">
                            {e.cancelledAt ? new Date(e.cancelledAt).toLocaleDateString('en-GB') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: FINANCIAL STATEMENTS
            ========================================================================= */}
        {activeTab === 'financials' && financialSummary && (
          <div className="space-y-6">
            {/* Unconfigured Notice if applicable */}
            {!financialSummary.openingBalances.isConfigured && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{t('unconfiguredOpeningNotice')}</span>
                </div>
                <Link
                  to="/expenses"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-sm transition-all text-xs"
                >
                  आरंभी शिल्लक निश्चित करा
                </Link>
              </div>
            )}

            {/* Segregated Cashbook Reconciliation Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isMr ? 'साधननिहाय कॅशबुक ताळेबंद (Segregated Cashbook Reconciliation)' : 'Mode-Wise Reconciliation'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    रोख रक्कम (Physical Cash) आणि बँक/डिजिटल खाती पूर्णपणे स्वतंत्र ठेवली आहेत.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">पेमेंट साधन (Payment Mode)</th>
                      <th className="px-4 py-3 text-right">आरंभी शिल्लक (Opening ₹)</th>
                      <th className="px-4 py-3 text-right text-emerald-400">एकूण जमा (Inflow ₹)</th>
                      <th className="px-4 py-3 text-right text-red-400">एकूण खर्च (Outflow ₹)</th>
                      <th className="px-4 py-3 text-right text-amber-400">अखेर शिल्लक (Closing ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    <tr className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-sans font-medium text-emerald-400 flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        {METHOD_LABELS[lang]?.CASH}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        ₹{Number(financialSummary.modeWise.CASH.opening).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        +₹{Number(financialSummary.modeWise.CASH.income).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        -₹{Number(financialSummary.modeWise.CASH.expense).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300 font-black">
                        ₹{Number(financialSummary.modeWise.CASH.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-sans font-medium text-blue-400 flex items-center gap-2">
                        <Landmark className="w-4 h-4" />
                        {METHOD_LABELS[lang]?.BANK_TRANSFER}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        ₹{Number(financialSummary.modeWise.BANK_TRANSFER.opening).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        +₹{Number(financialSummary.modeWise.BANK_TRANSFER.income).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        -₹{Number(financialSummary.modeWise.BANK_TRANSFER.expense).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-300 font-black">
                        ₹{Number(financialSummary.modeWise.BANK_TRANSFER.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-sans font-medium text-purple-400 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {METHOD_LABELS[lang]?.UPI}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        ₹{Number(financialSummary.modeWise.UPI.opening).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        +₹{Number(financialSummary.modeWise.UPI.income).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        -₹{Number(financialSummary.modeWise.UPI.expense).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-300 font-black">
                        ₹{Number(financialSummary.modeWise.UPI.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-sans font-medium text-amber-400 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {METHOD_LABELS[lang]?.CHEQUE}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        ₹{Number(financialSummary.modeWise.CHEQUE.opening).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                        +₹{Number(financialSummary.modeWise.CHEQUE.income).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        -₹{Number(financialSummary.modeWise.CHEQUE.expense).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-300 font-black">
                        ₹{Number(financialSummary.modeWise.CHEQUE.closing).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-950 font-semibold border-t-2 border-slate-800 text-xs font-mono">
                    <tr>
                      <td className="px-4 py-3 text-slate-200 font-bold font-sans">
                        {isMr ? 'एकूण ताळेबंद योग (Combined Total):' : 'Combined Total:'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">
                        ₹{Number(financialSummary.totals.totalOpeningBalance).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-400">
                        +₹{Number(financialSummary.totals.totalIncome).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-400">
                        -₹{Number(financialSummary.totals.totalExpenses).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-amber-400 text-sm">
                        ₹{Number(financialSummary.totals.totalClosingBalance).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Official Certification Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white font-devanagari">
                    अधिकृत स्वाक्षरी व लेखापरीक्षण शिक्का
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    श्री ल.रा. कोळी (Shri Laxman Koli) • अध्यक्ष / सचिव (Building Secretary)
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                अहवाल निर्मिती: {new Date().toLocaleString('en-GB')}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: VISUAL CHARTS
            ========================================================================= */}
        {activeTab === 'charts' && chartsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Monthly Maintenance Collection Trend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <BarChart
                data={chartsData.monthlyCollectionTrend}
                title={isMr ? 'मासिक देखभाल वसुली आलेख (Billed vs Collected)' : 'Monthly Billed vs Collected'}
                bar1Key="billed"
                bar2Key="collected"
                bar1Name={isMr ? 'आकारणी (Billed)' : 'Billed'}
                bar2Name={isMr ? 'वसुली (Collected)' : 'Collected'}
                bar1Color="#f97316"
                bar2Color="#10b981"
              />
            </div>

            {/* Chart 2: Income vs Expense Trend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <BarChart
                data={chartsData.incomeVsExpense}
                title={isMr ? 'मासिक जमा विरुद्ध खर्च (Income vs Expense)' : 'Monthly Income vs Expense'}
                bar1Key="income"
                bar2Key="expense"
                bar1Name={isMr ? 'जमा (Income)' : 'Income'}
                bar2Name={isMr ? 'खर्च (Expense)' : 'Expense'}
                bar1Color="#10b981"
                bar2Color="#ef4444"
              />
            </div>

            {/* Chart 3: Monthly Expense Line Trend */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <LineChart
                data={chartsData.monthlyExpenseTrend}
                title={isMr ? 'मासिक खर्च कल रेषालेख (Expense Trend)' : 'Monthly Expense Trend'}
                dataKey="expenseAmount"
                lineColor="#06b6d4"
              />
            </div>

            {/* Chart 4: Expense Category Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <DonutChart
                data={chartsData.categoryDistribution}
                title={isMr ? 'खर्च वर्गवारी वितरण (Category Distribution)' : 'Expense Category Distribution'}
                centerSubtext={isMr ? 'एकूण खर्च' : 'Total Expense'}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportsManagement;
