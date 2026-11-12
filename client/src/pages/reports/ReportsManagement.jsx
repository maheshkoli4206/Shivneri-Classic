import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Wallet,
  FileSpreadsheet,
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
  CreditCard
} from 'lucide-react';
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
  const { lang, t } = useLanguage();
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
      setError(err.response?.data?.message || err.message || (isMr ? 'अहवाल लोड करताना त्रुटी आली.' : 'Failed to fetch report data.'));
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

  // Export PDF Audit Report Handler
  const handleExportPdf = () => {
    try {
      setDownloadingPdf(true);
      const queryParams = new URLSearchParams();
      queryParams.append('lang', lang);
      if (selectedYear) queryParams.append('year', selectedYear);
      if (selectedMonth) queryParams.append('month', selectedMonth);

      const url = `/api/v1/reports/export/pdf?${queryParams.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('reportsTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {isMr ? 'वित्तीय विश्लेषण' : 'Analytics Suite'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('reportsSubtitle')}
          </p>
        </div>

        {/* Global Toolbar Filters & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto print:hidden">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
          >
            <option value="">{isMr ? 'सर्व वर्षे' : 'All Years'}</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-h-[44px] bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          >
            <option value="">{isMr ? 'सर्व महिने' : 'All Months'}</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {isMr ? MONTH_NAMES_MR[m] : MONTH_NAMES_EN[m]}
              </option>
            ))}
          </select>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            disabled={downloadingExcel}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Download Excel Workbook"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{downloadingExcel ? (isMr ? 'डाऊनलोड...' : 'Downloading...') : 'Excel'}</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPdf}
            disabled={downloadingPdf}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Download PDF Audit Report"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPdf ? (isMr ? 'तयार होत आहे...' : 'Generating...') : 'PDF'}</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">{isMr ? 'प्रिंट' : 'Print'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchAllReports}
            disabled={loading}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto print:hidden w-full sm:w-fit gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-orange-600" />
          <span>{t('tabOverview')}</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-orange-600" />
          <span>{t('tabMaintenanceReport')}</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 text-orange-600" />
          <span>{t('tabExpenseReport')}</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'financials'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Coins className="w-4 h-4 text-orange-600" />
          <span>{t('tabCashbookReport')}</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'charts'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-orange-600" />
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">
                  {t('totalBilledLabel')}
                </span>
                <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  ₹{Number(overview.totalBilled || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {overview.duesCounts.totalBills} {isMr ? 'देयके (दरमहा ₹१,०००)' : 'bills (₹1,000 / month)'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* Total Collected */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 font-medium">
                  {t('totalCollectedLabel')}
                </span>
                <h3 className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  ₹{Number(overview.totalCollected || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>{overview.vouchers.completedPaymentsCount} {isMr ? 'अधिकृत पावत्या' : 'official receipts'}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Outstanding Dues */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-red-700 font-medium">
                  {t('totalOutstandingLabel')}
                </span>
                <h3 className="text-2xl font-bold font-mono text-red-600 mt-1">
                  ₹{Number(overview.totalOutstanding || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isMr ? 'वसुली प्रलंबित शिल्लक' : 'Pending collections balance'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Collection Rate (%) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">
                  {t('collectionRateLabel')}
                </span>
                <h3 className="text-2xl font-bold font-mono text-cyan-600 mt-1">
                  {overview.collectionPercentage}%
                </h3>
                <div className="w-36 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 rounded-full"
                    style={{ width: `${Math.min(overview.collectionPercentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">
                  {t('totalExpensesLabel')}
                </span>
                <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  ₹{Number(overview.totalExpenses || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{overview.vouchers.activeExpensesCount} {isMr ? 'मंजूर खर्च व्हाउचर्स' : 'approved vouchers'}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            {/* Net Surplus / Deficit */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">
                  {t('netSurplusLabel')}
                </span>
                <h3
                  className={`text-2xl font-bold font-mono mt-1 ${
                    overview.netSurplusDeficit >= 0 ? 'text-teal-600' : 'text-amber-600'
                  }`}
                >
                  ₹{Number(overview.netSurplusDeficit || 0).toLocaleString('en-IN')}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isMr ? 'जमा वजा खर्च फरक' : 'Income minus Expense surplus'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Resident Dues Clearance Breakdown Cards */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isMr ? '१६ मूळ सभासद थकबाकी स्थिती विश्लेषण' : '16 Residents Dues Clearance Status'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isMr
                    ? 'शिवनेरी क्लासिक अपार्टमेंट (ए विंग) मधील सर्व १६ सभासदांचे थकबाकी वर्गीकरण'
                    : 'Clearance categorization for all 16 members of Shivneri Classic Apartment - A Wing'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {overview.residentCounts.totalActiveResidents} {isMr ? 'मूळ सभासद' : 'Members'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-700 font-semibold">{t('clearedResidentsLabel')}</span>
                  <h4 className="text-xl font-bold font-mono text-emerald-600 mt-1">
                    {overview.residentCounts.residentsFullyCleared}
                  </h4>
                  <span className="text-[10px] text-slate-500">{isMr ? 'थकबाकी पूर्ण भरलेली' : 'Fully Cleared'}</span>
                </div>
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-700 font-semibold">{t('partialResidentsLabel')}</span>
                  <h4 className="text-xl font-bold font-mono text-amber-600 mt-1">
                    {overview.residentCounts.residentsWithPartialDues}
                  </h4>
                  <span className="text-[10px] text-slate-500">{isMr ? 'काही रक्कम थकीत' : 'Partially Cleared'}</span>
                </div>
                <AlertCircle className="w-7 h-7 text-amber-600" />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-red-700 font-semibold">{t('pendingResidentsLabel')}</span>
                  <h4 className="text-xl font-bold font-mono text-red-600 mt-1">
                    {overview.residentCounts.residentsWithPendingDues}
                  </h4>
                  <span className="text-[10px] text-slate-500">{isMr ? 'संपूर्ण देयक थकीत' : 'Pending Dues'}</span>
                </div>
                <Clock className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </div>

          {/* Mode-Wise Segregated Cashbook Strip */}
          {financialSummary && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isMr ? 'साधननिहाय स्वतंत्र ताळेबंद' : 'Mode-Wise Segregated Balances'}
                </h3>
                <span className="text-xs text-slate-500">
                  {isMr ? 'रोख व बँक स्वतंत्र खाती' : 'Physical Cash segregated from Bank'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-600" />
                    {t('cashBalanceLabel')}
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-700">
                    ₹{Number(financialSummary.modeWise.CASH.closing).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    {t('bankBalanceLabel')}
                  </span>
                  <div className="text-lg font-bold font-mono text-blue-700">
                    ₹{Number(financialSummary.modeWise.BANK_TRANSFER.closing).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-xs text-purple-700 font-semibold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    {t('upiBalanceLabel')}
                  </span>
                  <div className="text-lg font-bold font-mono text-purple-700">
                    ₹{Number(financialSummary.modeWise.UPI.closing).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    {t('chequeBalanceLabel')}
                  </span>
                  <div className="text-lg font-bold font-mono text-amber-700">
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
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isMr ? 'महिनानिहाय देखभाल वसुली अहवाल' : 'Month-Wise Maintenance Collections'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr
                    ? 'प्रत्येक महिन्यातील आकारणी, वसुली व वसुली टक्केवारी'
                    : 'Monthly billed fee, collections and collection efficiency'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{isMr ? 'महिना / वर्ष' : 'Month / Year'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'आकारणी (₹)' : 'Billed (₹)'}</th>
                    <th className="px-4 py-3 text-right text-emerald-700">{isMr ? 'वसुली (₹)' : 'Collected (₹)'}</th>
                    <th className="px-4 py-3 text-right text-red-700">{isMr ? 'थकबाकी (₹)' : 'Balance Due (₹)'}</th>
                    <th className="px-3 py-3 text-center">{isMr ? 'वसुली %' : 'Collection %'}</th>
                    <th className="px-3 py-3 text-center text-emerald-700">{isMr ? 'पूर्ण' : 'Paid'}</th>
                    <th className="px-3 py-3 text-center text-amber-700">{isMr ? 'अंशतः' : 'Partial'}</th>
                    <th className="px-3 py-3 text-center text-red-700">{isMr ? 'थकीत' : 'Unpaid'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenanceReport.monthWiseCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {isMr ? 'कोणतीही देयके आढळली नाहीत.' : 'No maintenance bills found.'}
                      </td>
                    </tr>
                  ) : (
                    maintenanceReport.monthWiseCollections.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {isMr ? m.monthNameMarathi : m.monthNameEnglish} {m.year}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          ₹{m.totalBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          ₹{m.totalPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                          ₹{m.totalOutstanding.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-cyan-600">
                          {m.collectionPercentage}%
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-emerald-600">{m.paidCount}</td>
                        <td className="px-3 py-3 text-center font-mono text-amber-600">{m.partialCount}</td>
                        <td className="px-3 py-3 text-center font-mono text-red-600">{m.unpaidCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approved 16 Residents Dues Roster */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isMr ? '१६ मूळ सभासद देयके व येणेबाकी नोंदवही' : 'Approved 16 Residents Dues & Payments Ledger'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr
                    ? 'अधिकृत १६ सभासदांचे चालू खाते, एकूण आकारणी, एकूण जमा व येणेबाकी'
                    : 'Official running ledger, billed dues, collections and outstanding balance for all 16 residents'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{isMr ? 'स्थिती:' : 'Status:'}</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700"
                >
                  <option value="ALL">{t('filterAll')}</option>
                  <option value="CLEARED">{isMr ? 'थकबाकी शून्य' : 'Cleared'}</option>
                  <option value="PARTIAL">{isMr ? 'अंशतः थकीत' : 'Partial'}</option>
                  <option value="PENDING">{isMr ? 'थकीत' : 'Pending'}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{isMr ? 'सदनिका क्र.' : 'Flat No.'}</th>
                    <th className="px-4 py-3">{isMr ? 'सभासदाचे नाव' : 'Resident Name'}</th>
                    <th className="px-3 py-3">{isMr ? 'संपर्क' : 'Contact'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'एकूण आकारणी' : 'Total Billed'}</th>
                    <th className="px-4 py-3 text-right text-emerald-700">{isMr ? 'एकूण जमा' : 'Total Paid'}</th>
                    <th className="px-4 py-3 text-right text-red-700">{isMr ? 'थकबाकी' : 'Balance Due'}</th>
                    <th className="px-3 py-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenanceReport.residentSummaries
                    .filter(r => selectedStatus === 'ALL' || r.overallStatus === selectedStatus)
                    .map((res, idx) => (
                      <tr key={res.residentId || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-orange-700 whitespace-nowrap">
                          {res.wing}-{res.flatNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 font-devanagari">
                          {res.fullNameMarathi}
                        </td>
                        <td className="px-3 py-3 text-slate-500 font-mono">
                          {res.mobileNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          ₹{res.totalBilled.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          ₹{res.totalPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                          ₹{res.totalOutstanding.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {res.overallStatus === 'CLEARED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                              {isMr ? 'क्लिअर' : 'Cleared'}
                            </span>
                          ) : res.overallStatus === 'PARTIAL' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                              {isMr ? 'अंशतः' : 'Partial'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-red-700 bg-red-50 border border-red-200">
                              {isMr ? 'थकीत' : 'Pending'}
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
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isMr ? 'खर्च वर्गवारी तपशील' : 'Category-Wise Expense Breakdown'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr ? 'सोसायटीच्या विविध देखभाल शीर्षकांवर झालेला अधिकृत खर्च' : 'Official society expenses classified by category'}
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-slate-900">
                {isMr ? 'एकूण:' : 'Total:'} ₹{expenseReport.grandTotalActiveExpenses.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{isMr ? 'खर्च वर्गवारी' : 'Category'}</th>
                    <th className="px-3 py-3 text-center">{isMr ? 'व्हाउचर संख्या' : 'Voucher Count'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'रक्कम (₹)' : 'Amount (₹)'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'टक्केवारी (%)' : 'Percentage (%)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseReport.categoryBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        {isMr ? 'कोणताही खर्च आढळला नाही.' : 'No expenses recorded.'}
                      </td>
                    </tr>
                  ) : (
                    expenseReport.categoryBreakdown.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {isMr ? cat.categoryNameMarathi : cat.category}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                          {cat.vouchersCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          ₹{cat.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-600 font-bold">
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
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-red-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                  <span>{isMr ? 'रद्दबातल खर्चाचा ऑडिट इतिहास' : 'Cancelled Vouchers History'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr ? 'प्रशासकाने रद्द केलेली व्हाउचर्स (कॅशबुक ताळेबंदातून वगळली आहेत)' : 'Audited cancelled vouchers (excluded from active cashbook)'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                {expenseReport.cancelledExpenses.count} {isMr ? 'रद्द व्हाउचर्स' : 'Cancelled Vouchers'} (₹{expenseReport.cancelledExpenses.totalAmount.toLocaleString('en-IN')})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{isMr ? 'व्हाउचर क्र.' : 'Voucher No.'}</th>
                    <th className="px-3 py-3">{isMr ? 'खर्च शीर्षक' : 'Expense Title'}</th>
                    <th className="px-3 py-3">{isMr ? 'विक्रेता' : 'Payee'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'रक्कम (₹)' : 'Amount (₹)'}</th>
                    <th className="px-4 py-3">{isMr ? 'रद्द करण्याचे कारण' : 'Cancellation Reason'}</th>
                    <th className="px-3 py-3">{isMr ? 'रद्द दिनांक' : 'Cancelled Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenseReport.cancelledExpenses.vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        {isMr ? 'कोणतेही रद्दबातल व्हाउचर नाही.' : 'No cancelled vouchers found.'}
                      </td>
                    </tr>
                  ) : (
                    expenseReport.cancelledExpenses.vouchers.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/80 text-slate-700">
                        <td className="px-4 py-3 font-mono font-bold text-red-600">{e.voucherNumber}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{e.titleMarathi}</td>
                        <td className="px-3 py-3">{e.payeeName}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                          ₹{Number(e.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">{e.cancellationReason || '-'}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                          {e.cancelledAt ? new Date(e.cancelledAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB') : '-'}
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
          {!financialSummary.openingBalances.isConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800 shadow-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('unconfiguredOpeningNotice')}</span>
              </div>
              <Link
                to="/expenses"
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs transition-colors text-xs"
              >
                {isMr ? 'आरंभी शिल्लक निश्चित करा' : 'Configure Opening Balance'}
              </Link>
            </div>
          )}

          {/* Segregated Cashbook Reconciliation Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {isMr ? 'साधननिहाय कॅशबुक ताळेबंद' : 'Mode-Wise Reconciliation'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isMr ? 'रोख रक्कम आणि बँक/डिजिटल खाती पूर्णपणे स्वतंत्र ठेवली आहेत.' : 'Physical cash and bank/digital accounts are segregated.'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{isMr ? 'पेमेंट साधन' : 'Payment Mode'}</th>
                    <th className="px-4 py-3 text-right">{isMr ? 'आरंभी शिल्लक (₹)' : 'Opening Balance (₹)'}</th>
                    <th className="px-4 py-3 text-right text-emerald-700">{isMr ? 'एकूण जमा (₹)' : 'Inflow (₹)'}</th>
                    <th className="px-4 py-3 text-right text-red-700">{isMr ? 'एकूण खर्च (₹)' : 'Outflow (₹)'}</th>
                    <th className="px-4 py-3 text-right text-slate-900">{isMr ? 'अखेर शिल्लक (₹)' : 'Closing Balance (₹)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-sans font-semibold text-emerald-700 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      {METHOD_LABELS[lang]?.CASH}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ₹{Number(financialSummary.modeWise.CASH.opening).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      +₹{Number(financialSummary.modeWise.CASH.income).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      -₹{Number(financialSummary.modeWise.CASH.expense).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-black">
                      ₹{Number(financialSummary.modeWise.CASH.closing).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-sans font-semibold text-blue-700 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-blue-600" />
                      {METHOD_LABELS[lang]?.BANK_TRANSFER}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ₹{Number(financialSummary.modeWise.BANK_TRANSFER.opening).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      +₹{Number(financialSummary.modeWise.BANK_TRANSFER.income).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      -₹{Number(financialSummary.modeWise.BANK_TRANSFER.expense).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 font-black">
                      ₹{Number(financialSummary.modeWise.BANK_TRANSFER.closing).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-sans font-semibold text-purple-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      {METHOD_LABELS[lang]?.UPI}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ₹{Number(financialSummary.modeWise.UPI.opening).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      +₹{Number(financialSummary.modeWise.UPI.income).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      -₹{Number(financialSummary.modeWise.UPI.expense).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700 font-black">
                      ₹{Number(financialSummary.modeWise.UPI.closing).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-sans font-semibold text-amber-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      {METHOD_LABELS[lang]?.CHEQUE}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      ₹{Number(financialSummary.modeWise.CHEQUE.opening).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      +₹{Number(financialSummary.modeWise.CHEQUE.income).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">
                      -₹{Number(financialSummary.modeWise.CHEQUE.expense).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 font-black">
                      ₹{Number(financialSummary.modeWise.CHEQUE.closing).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-semibold border-t border-slate-200 text-xs font-mono">
                  <tr>
                    <td className="px-4 py-3 text-slate-900 font-bold font-sans">
                      {isMr ? 'एकूण ताळेबंद योग:' : 'Combined Total:'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800">
                      ₹{Number(financialSummary.totals.totalOpeningBalance).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      +₹{Number(financialSummary.totals.totalIncome).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      -₹{Number(financialSummary.totals.totalExpenses).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                      ₹{Number(financialSummary.totals.totalClosingBalance).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Official Certification Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 font-devanagari">
                  {isMr ? 'अधिकृत स्वाक्षरी व लेखापरीक्षण शिक्का' : 'Official Signature & Audit Seal'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isMr ? 'श्री ल.रा. कोळी • चेअरमन / सोसायटी सेक्रेटरी' : 'Shri Laxman Koli • Chairman / Building Secretary'}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              {isMr ? 'अहवाल दिनांक: ' : 'Report Date: '}{new Date().toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <BarChart
              data={chartsData.monthlyCollectionTrend}
              title={isMr ? 'मासिक देखभाल आकारणी विरुद्ध वसुली' : 'Monthly Billed vs Collected'}
              bar1Key="billed"
              bar2Key="collected"
              bar1Name={isMr ? 'आकारणी' : 'Billed'}
              bar2Name={isMr ? 'वसुली' : 'Collected'}
              bar1Color="#f97316"
              bar2Color="#10b981"
              emptyText={isMr ? 'कोणतीही माहिती उपलब्ध नाही' : 'No data available'}
            />
          </div>

          {/* Chart 2: Income vs Expense Trend */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <BarChart
              data={chartsData.incomeVsExpense}
              title={isMr ? 'मासिक जमा विरुद्ध खर्च' : 'Monthly Income vs Expense'}
              bar1Key="income"
              bar2Key="expense"
              bar1Name={isMr ? 'जमा' : 'Income'}
              bar2Name={isMr ? 'खर्च' : 'Expense'}
              bar1Color="#10b981"
              bar2Color="#ef4444"
              emptyText={isMr ? 'कोणतीही माहिती उपलब्ध नाही' : 'No data available'}
            />
          </div>

          {/* Chart 3: Monthly Expense Line Trend */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <LineChart
              data={chartsData.monthlyExpenseTrend}
              title={isMr ? 'मासिक खर्च कल रेषालेख' : 'Monthly Expense Trend'}
              dataKey="expenseAmount"
              lineColor="#0284c7"
              emptyText={isMr ? 'कोणतीही माहिती उपलब्ध नाही' : 'No data available'}
            />
          </div>

          {/* Chart 4: Expense Category Distribution */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <DonutChart
              data={chartsData.categoryDistribution}
              title={isMr ? 'खर्च वर्गवारी वितरण' : 'Expense Category Distribution'}
              centerSubtext={isMr ? 'एकूण खर्च' : 'Total Expense'}
              emptyText={isMr ? 'कोणतीही माहिती उपलब्ध नाही' : 'No data available'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;
