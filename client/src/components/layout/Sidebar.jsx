import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useResidentContext } from '../../context/ResidentContext';
import {
  Building2,
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Wallet,
  BarChart3,
  Globe,
  LogOut,
  X,
  ChevronRight,
  UserCheck,
  Settings
} from 'lucide-react';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { admin, logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const { totalResidentsCount } = useResidentContext();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    {
      to: '/',
      label: t('navDashboard'),
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/residents',
      label: t('navResidents'),
      icon: Users,
      badge: totalResidentsCount != null ? String(totalResidentsCount) : null
    },
    {
      to: '/maintenance',
      label: t('navMaintenance'),
      icon: Calendar,
      badge: null
    },
    {
      to: '/payments',
      label: t('navPayments'),
      icon: CreditCard,
      badge: null
    },
    {
      to: '/expenses',
      label: t('navExpenses'),
      icon: Wallet,
      badge: null
    },
    {
      to: '/reports',
      label: t('navReports'),
      icon: BarChart3,
      badge: null
    },
    {
      to: '/settings',
      label: t('navSettings'),
      icon: Settings,
      badge: null
    }
  ];

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Scrollable Nav Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Header & Branding */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/building-logo.png"
                alt="Shivneri Classic Apartment Logo"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50 shadow-md shadow-orange-500/20 shrink-0 bg-white"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm tracking-tight text-white truncate">
                    {lang === 'mr' ? 'शिवनेरी क्लासिक' : 'Shivneri Classic'}
                  </h1>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <span>{lang === 'mr' ? 'ए विंग' : 'A Wing'}</span>
                  <span>•</span>
                  <span className="text-slate-400">{lang === 'mr' ? 'नाशिक' : 'Nashik'}</span>
                </div>
              </div>
            </div>

            {/* Mobile close button with 44px touch target */}
            <button
              onClick={closeMobile}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Super Admin Mini Profile */}
          <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {lang === 'mr'
                    ? (admin?.fullNameMarathi || 'श्री ल.रा. कोळी')
                    : 'Shri Laxman Koli'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span className="truncate">{lang === 'mr' ? 'सोसायटी सेक्रेटरी' : 'Building Secretary'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links - Scrollable on shorter mobile screens */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {lang === 'mr' ? 'मुख्य कार्यप्रणाली' : 'Main Menu'}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobile}
                  className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 font-semibold border-l-4 border-orange-500 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 active:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-orange-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isActive
                          ? 'bg-orange-500/30 text-orange-300'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Language & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/30 shrink-0">
          {/* Language Switcher Button with 44px min height */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>{lang === 'mr' ? 'भाषा: मराठी' : 'Language: English'}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-orange-300 font-semibold">
              {t('langSwitch')}
            </span>
          </button>

          {/* Logout Button with 44px min height */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            type="button"
            className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-950/30 hover:bg-red-900/40 active:bg-red-900/60 text-red-300 border border-red-900/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{t('logoutButton')}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-red-400/60" />
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'mr' ? 'लॉगआउट पुष्टीकरण' : 'Confirm Logout'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'mr' ? 'आपले सुरक्षित सत्र समाप्त करायचे आहे का?' : 'Do you want to end your secure session?'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {lang === 'mr' ? 'रद्द करा' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
              >
                {lang === 'mr' ? 'लॉगआउट करा' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
