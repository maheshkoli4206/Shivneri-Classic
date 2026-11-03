import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Building2,
  ShieldCheck,
  LogOut,
  UserCheck,
  Database,
  Receipt,
  Users,
  Calendar,
  Globe,
  Clock,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { admin, logout } = useAuth();
  const { t, toggleLanguage } = useLanguage();

  const handleLogout = async () => {
    await logout();
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'प्रथम लॉगिन (First Login)';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('mr-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
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
              <p className="text-xs text-slate-400">
                {t('location')}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/residents"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('navResidents')}</span>
            </Link>

            <Link
              to="/maintenance"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('navMaintenance')}</span>
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
              onClick={handleLogout}
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
        {/* Welcome Admin Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {admin?.fullNameMarathi || 'श्री ल.रा. कोळी'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('adminRoleBadge')}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {admin?.designation || 'Chairman / Building Secretary'} • वापरकर्तानाव:{' '}
                  <span className="text-orange-400 font-mono font-medium">{admin?.username}</span>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400 bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center sm:justify-end gap-1.5 text-slate-400 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>शेवटचे लॉगिन:</span>
              </div>
              <span className="text-white font-medium">{formatLastLogin(admin?.lastLogin)}</span>
            </div>
          </div>
        </div>

        {/* Operational Modules Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Quick Access Card: Resident Master Registry */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center border border-orange-500/25 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('residentsTitle')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  १६ मूळ सभासदांची अधिकृत यादी, सदनिका क्रमांक व संपर्क माहिती व्यवस्थापित करा.
                </p>
              </div>
            </div>
            <Link
              to="/residents"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all self-start"
            >
              <span>सभासद यादी उघडा</span>
              <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
            </Link>
          </div>

          {/* Quick Access Card: Monthly Maintenance Engine */}
          <div className="bg-gradient-to-r from-orange-950/25 via-slate-900 to-slate-850 border border-orange-500/30 rounded-2xl p-6 shadow-lg flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/35 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {t('maintenanceTitle')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  मासिक देखभाल दर निश्चित करा, देयके तयार करा आणि देयक नोंदवही तपासा.
                </p>
              </div>
            </div>
            <Link
              to="/maintenance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/30 transition-all self-start"
            >
              <span>मासिक देखभाल व्यवस्थापन</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* System Status Grid */}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          सिस्टम सुरक्षा व पायाभूत स्थिती (System Architecture Status)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">प्रशासक मॉडेल</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">एकमेव मुख्य प्रशासक</div>
            <div className="text-xs text-slate-400 mt-1">
              सिंगलटन की: <span className="font-mono text-orange-400 text-[10px]">SHIVNERI_SUPER_ADMIN_SINGLETON</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">सत्र सुरक्षा</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">HttpOnly कुकी & CSRF</div>
            <div className="text-xs text-slate-400 mt-1">शून्य लोकल स्टोरेज वापर (Zero Storage Token)</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">डेटाबेस नाव</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-base font-bold text-white font-mono truncate">shivneri_classic_admin_db</div>
            <div className="text-xs text-slate-400 mt-1">स्वतंत्र व सुरक्षित Atlas कनेक्शन</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">पावती मानक</span>
              <Receipt className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">SCA-YYYYMM-XXXX</div>
            <div className="text-xs text-slate-400 mt-1">अणु (Atomic) अनुक्रम पावती रचना</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        शिवनेरी क्लासिक अपार्टमेंट (ए विंग) • औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र.
      </footer>
    </div>
  );
};

export default Dashboard;
