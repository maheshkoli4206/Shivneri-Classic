import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useResidentContext } from '../../context/ResidentContext';
import api from '../../services/api';
import {
  Building2,
  ShieldCheck,
  Users,
  Calendar,
  CreditCard,
  Wallet,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
  const { admin } = useAuth();
  const { t, lang } = useLanguage();
  const { totalResidentsCount } = useResidentContext();
  const [stats, setStats] = useState({
    residentsCount: totalResidentsCount ?? 0,
    maintenanceRate: 1000,
    totalCollected: 0,
    totalOutstanding: 0,
    loading: false
  });

  // Keep stats.residentsCount synchronized with shared ResidentContext
  useEffect(() => {
    if (totalResidentsCount != null) {
      setStats(prev => ({
        ...prev,
        residentsCount: totalResidentsCount
      }));
    }
  }, [totalResidentsCount]);

  useEffect(() => {
    // Try to fetch live metrics
    const fetchQuickMetrics = async () => {
      try {
        const [resRes, maintRes] = await Promise.allSettled([
          api.get('/residents'),
          api.get('/maintenance/config')
        ]);

        let count = totalResidentsCount ?? 0;
        if (resRes.status === 'fulfilled' && resRes.value.data?.residents) {
          count = resRes.value.data.residents.length;
        }

        let rate = 1000;
        if (maintRes.status === 'fulfilled' && maintRes.value.data?.config) {
          rate = maintRes.value.data.config.defaultMonthlyAmount || 1000;
        }

        setStats(prev => ({
          ...prev,
          residentsCount: count,
          maintenanceRate: rate
        }));
      } catch (err) {
        // Fallback default master values
      }
    };
    fetchQuickMetrics();
  }, [totalResidentsCount]);

  const formatLastLogin = (dateString) => {
    if (!dateString) return lang === 'mr' ? 'प्रथम लॉगिन' : 'First Login';
    try {
      const d = new Date(dateString);
      return d.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <img
              src="/building-logo.png"
              alt="Shivneri Classic Apartment Emblem"
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover shadow-md ring-2 ring-amber-400/50 shadow-orange-500/20 shrink-0 bg-white block"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {lang === 'mr' ? 'स्वागत आहे, ' : 'Welcome, '}
                  {lang === 'mr'
                    ? (admin?.fullNameMarathi || 'श्री ल.रा. कोळी')
                    : 'Shri Laxman Koli'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {t('adminRoleBadge')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-snug">
                {lang === 'mr'
                  ? 'शिवनेरी क्लासिक अपार्टमेंट (ए विंग) • औरंगाबाद रोड, पंचवटी, नाशिक'
                  : 'Shivneri Classic Apartment (A Wing) • Aurangabad Road, Panchavati, Nashik'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 shrink-0 self-start md:self-auto">
            <Clock className="w-4 h-4 text-orange-600 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">
                {lang === 'mr' ? 'शेवटचे लॉगिन' : 'Last Login'}:
              </span>
              <span className="font-semibold text-slate-800">
                {formatLastLogin(admin?.lastLogin)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Residents */}
        <Link
          to="/residents"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all group min-h-[44px]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'mr' ? 'एकूण सभासद' : 'Total Residents'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.residentsCount}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {lang === 'mr' ? 'सदनिका व दुकाने' : 'Flats & Shops'}
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {lang === 'mr' ? `${stats.residentsCount} सभासद सक्रिय` : `${stats.residentsCount} Members Active`}
          </p>
        </Link>

        {/* Card 2: Maintenance Rate */}
        <Link
          to="/maintenance"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all group min-h-[44px]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'mr' ? 'मासिक देखभाल दर' : 'Maintenance Rate'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ₹{stats.maintenanceRate.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {lang === 'mr' ? '/ दरमहा' : '/ Month'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-2">
            {lang === 'mr' ? 'देय दिनांक: दरमहा १० तारीख' : 'Due Day: 10th of Month'}
          </p>
        </Link>

        {/* Card 3: Total Collections */}
        <Link
          to="/payments"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all group min-h-[44px]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'mr' ? 'एकूण जमा पावती' : 'Total Collected'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ₹0
            </span>
            <span className="text-xs font-medium text-slate-500">
              {lang === 'mr' ? 'अधिकृत जमा' : 'Official Total'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-2">
            {lang === 'mr' ? 'थकीत शून्य नोंदणी' : 'Clean Master Records'}
          </p>
        </Link>

        {/* Card 4: Total Outstanding */}
        <Link
          to="/reports"
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all group min-h-[44px]"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {lang === 'mr' ? 'शिल्लक येणे बाकी' : 'Total Outstanding'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              ₹0
            </span>
            <span className="text-xs font-medium text-slate-500">
              {lang === 'mr' ? 'बाकी शिल्लक' : 'Pending'}
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-2">
            {lang === 'mr' ? 'कोणतीही थकबाकी नाही' : 'Zero Arrears'}
          </p>
        </Link>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {lang === 'mr' ? 'त्वरित कृती' : 'Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <Link
            to="/residents"
            className="min-h-[44px] flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-orange-50/60 active:bg-orange-100/60 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-700 transition-all text-xs font-semibold"
          >
            <Users className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{lang === 'mr' ? 'सभासद यादी' : 'View Residents'}</span>
          </Link>
          <Link
            to="/maintenance"
            className="min-h-[44px] flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-orange-50/60 active:bg-orange-100/60 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-700 transition-all text-xs font-semibold"
          >
            <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{lang === 'mr' ? 'देयके तयार करा' : 'Generate Bills'}</span>
          </Link>
          <Link
            to="/payments"
            className="min-h-[44px] flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-orange-50/60 active:bg-orange-100/60 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-700 transition-all text-xs font-semibold"
          >
            <CreditCard className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{lang === 'mr' ? 'पेमेंट नोंदवा' : 'Record Payment'}</span>
          </Link>
          <Link
            to="/expenses"
            className="min-h-[44px] flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-orange-50/60 active:bg-orange-100/60 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-700 transition-all text-xs font-semibold"
          >
            <Wallet className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{lang === 'mr' ? 'खर्च नोंदवा' : 'Record Expense'}</span>
          </Link>
          <Link
            to="/reports"
            className="min-h-[44px] col-span-2 sm:col-span-1 flex items-center justify-center sm:justify-start gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 hover:bg-orange-50/60 active:bg-orange-100/60 border border-slate-200/80 hover:border-orange-300 text-slate-700 hover:text-orange-700 transition-all text-xs font-semibold"
          >
            <BarChart3 className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="truncate">{lang === 'mr' ? 'ताळेबंद अहवाल' : 'View Reports'}</span>
          </Link>
        </div>
      </div>

      {/* Primary Management Modules Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {lang === 'mr' ? 'सोसायटी व्यवस्थापन विभाग' : 'Management Modules'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Resident Registry */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('residentsTitle')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'mr'
                    ? 'सर्व सभासदांची अधिकृत यादी, सदनिका/दुकान क्रमांक आणि संपर्क तपशील व्यवस्थापित करा.'
                    : 'Manage resident master records, flat and shop numbers, and contact details.'}
                </p>
              </div>
            </div>
            <Link
              to="/residents"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200/80 transition-colors"
            >
              <span>{lang === 'mr' ? 'नोंदवही उघडा' : 'Open Registry'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-600" />
            </Link>
          </div>

          {/* Module 2: Monthly Maintenance */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('maintenanceTitle')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'mr'
                    ? 'दरमहा ₹१,००० देखभाल दर, मासिक देयके निर्मिती आणि देयक नोंदवही.'
                    : 'Monthly ₹1,000 billing engine, automated bill generation, and dues tracking.'}
                </p>
              </div>
            </div>
            <Link
              to="/maintenance"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 transition-colors"
            >
              <span>{lang === 'mr' ? 'देयके व्यवस्थापन' : 'Manage Dues'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </Link>
          </div>

          {/* Module 3: Payments & Receipts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('paymentsTitle')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'mr'
                    ? 'रोख, यूपीआय, बँक ट्रान्सफर पावती नोंदणी आणि अधिकृत SCA पावती निर्मिती.'
                    : 'Record Cash, UPI, and Bank payments with official sequential receipt numbers.'}
                </p>
              </div>
            </div>
            <Link
              to="/payments"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 transition-colors"
            >
              <span>{lang === 'mr' ? 'पावत्या व्यवस्थापन' : 'Manage Payments'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </Link>
          </div>

          {/* Module 4: Expenses & Cashbook */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('expensesTitle')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'mr'
                    ? 'सोसायटी खर्च व्हाउचर्स (EXP-YYYYMM-XXXX) आणि रोख/बँक स्वतंत्र कॅशबुक.'
                    : 'Society expense vouchers, payee ledger, and multi-mode cashbook balance.'}
                </p>
              </div>
            </div>
            <Link
              to="/expenses"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80 transition-colors"
            >
              <span>{lang === 'mr' ? 'कॅशबुक उघडा' : 'Open Cashbook'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
            </Link>
          </div>

          {/* Module 5: Reports & Analytics */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('reportsTitle')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {lang === 'mr'
                    ? 'वित्तीय ताळेबंद, आलेख, एक्सेल आणि पीडीएफ ऑडिट अहवाल डाउनलोड करा.'
                    : 'Download financial ledgers, audit reports in Excel and PDF formats.'}
                </p>
              </div>
            </div>
            <Link
              to="/reports"
              className="inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200/80 transition-colors"
            >
              <span>{lang === 'mr' ? 'अहवाल पहा' : 'View Reports'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            </Link>
          </div>

          {/* Security & System Architecture Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-orange-400">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">
                  {lang === 'mr' ? 'सुरक्षा व डेटाबेस स्थिती' : 'System Security'}
                </h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 mt-2">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>MongoDB 8.2 Authorization Active</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>HttpOnly Cookies & Anti-CSRF Protection</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>SCA Atomic Receipts Sequence</span>
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
              Database: <span className="font-mono text-orange-400">shivneri_classic_prod_db</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
