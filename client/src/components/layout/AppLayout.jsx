import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useLanguage } from '../../context/LanguageContext';

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Responsive Left Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area (Offset for lg screen sidebar) */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <TopHeader onOpenMobile={() => setMobileOpen(true)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>

        {/* Clean Localized Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 px-3 sm:px-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-700">
                {lang === 'mr' ? 'शिवनेरी क्लासिक अपार्टमेंट' : 'Shivneri Classic Apartment'}
              </span>{' '}
              {lang === 'mr' ? '(ए विंग) • पंचवटी, नाशिक' : '(A Wing) • Panchavati, Nashik'}
            </div>
            <div className="text-[11px] text-slate-400">
              {lang === 'mr'
                ? 'सोसायटी व्यवस्थापन प्रणाली • सर्व हक्क राखीव'
                : 'Society Management System • All Rights Reserved'}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
