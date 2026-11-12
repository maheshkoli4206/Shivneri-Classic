import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Menu,
  ShieldCheck,
  Globe,
  ChevronRight
} from 'lucide-react';

const TopHeader = ({ onOpenMobile }) => {
  const { admin } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const location = useLocation();

  // Determine current page metadata
  const getPageInfo = () => {
    const path = location.pathname;
    if (path === '/') {
      return {
        title: lang === 'mr' ? 'नियंत्रण कक्ष' : 'Management Dashboard',
        crumb: lang === 'mr' ? 'मुख्य पृष्ठ' : 'Home'
      };
    }
    if (path.startsWith('/residents')) {
      return {
        title: lang === 'mr' ? 'सभासद नोंदवही (मास्टर डेटा)' : 'Resident Registry (Master Data)',
        crumb: lang === 'mr' ? 'सभासद' : 'Residents'
      };
    }
    if (path.startsWith('/maintenance')) {
      return {
        title: lang === 'mr' ? 'मासिक देखभाल व्यवस्थापन' : 'Monthly Maintenance Management',
        crumb: lang === 'mr' ? 'देखभाल' : 'Maintenance'
      };
    }
    if (path.startsWith('/payments')) {
      return {
        title: lang === 'mr' ? 'पेमेंट व अधिकृत पावत्या' : 'Payments & Receipts',
        crumb: lang === 'mr' ? 'पेमेंट' : 'Payments'
      };
    }
    if (path.startsWith('/expenses')) {
      return {
        title: lang === 'mr' ? 'सोसायटी खर्च व कॅशबुक' : 'Expenses & Cashbook',
        crumb: lang === 'mr' ? 'कॅशबुक' : 'Expenses'
      };
    }
    if (path.startsWith('/reports')) {
      return {
        title: lang === 'mr' ? 'वित्तीय अहवाल व विश्लेषण' : 'Reports & Analytics',
        crumb: lang === 'mr' ? 'अहवाल' : 'Reports'
      };
    }
    if (path.startsWith('/settings')) {
      return {
        title: lang === 'mr' ? 'प्रशासक सेटिंग्ज व चेअरमन हस्तांतरण' : 'Admin Settings & Chairman Transfer',
        crumb: lang === 'mr' ? 'सेटिंग्ज' : 'Settings'
      };
    }
    return {
      title: lang === 'mr' ? 'प्रशासक पोर्टल' : 'Admin Portal',
      crumb: 'Portal'
    };
  };

  const pageInfo = getPageInfo();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Toggle, Society Logo & Page Title / Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobile}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Society Logo - Always visible across Mobile, Tablet and Desktop */}
          <img
            src="/building-logo.png"
            alt="Shivneri Classic Logo"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400/50 shadow-xs shrink-0 bg-white block"
          />

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-0.5">
              <span className="hover:text-slate-700">
                {lang === 'mr' ? 'शिवनेरी क्लासिक' : 'Shivneri Classic'}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-orange-600 font-semibold">{pageInfo.crumb}</span>
            </div>
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {pageInfo.title}
            </h1>
          </div>
        </div>

        {/* Right: Security Badge, Language Toggle & Admin Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Subtle Security Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'mr' ? 'सुरक्षित सत्र सक्रिय' : 'Encrypted Session'}</span>
          </div>

          {/* Language Toggle Pill with 44px touch target */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 transition-colors"
            title="Toggle Language"
            aria-label="Toggle language between Marathi and English"
          >
            <Globe className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">{t('langSwitch')}</span>
          </button>

          {/* Admin Profile Pill with 44px touch target */}
          <Link
            to="/settings"
            className="min-h-[44px] flex items-center gap-2 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
            title={lang === 'mr' ? 'प्रशासक सेटिंग्ज व प्रोफाइल' : 'Admin Settings & Profile'}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-orange-600/20 shrink-0">
              {lang === 'mr' ? 'ल.को.' : 'LK'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {lang === 'mr'
                  ? (admin?.fullNameMarathi || 'श्री ल.रा. कोळी')
                  : 'Shri Laxman Koli'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {lang === 'mr' ? 'चेअरमन / सेक्रेटरी' : 'Chairman / Secretary'}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
