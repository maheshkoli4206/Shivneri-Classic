import React from 'react';
import { Building2, ShieldCheck, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              शिवनेरी क्लासिक अपार्टमेंट
            </h1>
            <p className="text-xs text-orange-400 font-medium">
              ए विंग (A Wing) • पंचवटी, नाशिक
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>टप्पा २: पायाभूत सुविधा सिद्ध</span>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-3xl mx-auto w-full my-auto py-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-slate-800 text-orange-400 border border-orange-500/30 mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Frontend Scaffolding & Tailwind CSS Verified</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
          सोसायटी देखभाल व्यवस्थापन प्रणाली
        </h2>
        <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
          Shivneri Classic Apartment (A Wing) single-admin management application.
          Devanagari font support, mobile-first responsiveness, and modular architecture active.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto mb-10">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">प्रशासक मॉडेल</div>
            <div className="text-white font-semibold text-sm">एकमेव मुख्य प्रशासक</div>
            <div className="text-xs text-slate-400 mt-1">श्री ल.रा. कोळी (चेअरमन/सेक्रेटरी)</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">पावती प्रणाली</div>
            <div className="text-white font-semibold text-sm">SCA-YYYYMM-XXXX</div>
            <div className="text-xs text-slate-400 mt-1">अचूक अनुक्रमिक पावती क्रमांक</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">डेटा सुरक्षा</div>
            <div className="text-white font-semibold text-sm">HttpOnly कुकी & CSRF</div>
            <div className="text-xs text-slate-400 mt-1">शून्य लोकल स्टोरेज वापर</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-4 py-2 rounded-lg border border-slate-700/40">
          <FileText className="w-4 h-4 text-orange-400" />
          <span>संदर्भ: phase1_architecture_plan.md प्रमाणे संपूर्ण रचना सक्रिय</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-4 border-t border-slate-800 text-xs text-slate-500">
        शिवनेरी क्लासिक अपार्टमेंट • औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र.
      </footer>
    </div>
  );
}

export default App;
