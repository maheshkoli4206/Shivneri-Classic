import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught a component crash:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isMr = localStorage.getItem('shivneri_lang') !== 'en';
      const errorMsg = this.state.error?.toString() || 'Unknown runtime error';

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-red-200 shadow-xl p-6 text-slate-900 space-y-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-red-950">
                {isMr ? 'इंटरफेस लोड करताना त्रुटी आली' : 'Interface Encountered an Error'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isMr
                  ? 'घटकाच्या सादरीकरणात अनपेक्षित त्रुटी निर्माण झाली आहे. सुरक्षिततेसाठी संपूर्ण स्क्रीन रिकामी न करता ही पूर्वसूचना दाखवली जात आहे.'
                  : 'An unexpected component rendering error occurred. The interface has caught the error to prevent a blank screen.'}
              </p>
            </div>

            <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-xs font-mono text-red-800 break-words">
              {errorMsg}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isMr ? 'पुन्हा लोड करा (Reload)' : 'Reload Page'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isMr ? 'डॅशबोर्डवर जा' : 'Go to Dashboard'}</span>
              </button>
            </div>

            {/* Expandable technical details */}
            {this.state.errorInfo && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 cursor-pointer py-1"
                >
                  <span>{isMr ? 'तांत्रिक तपशील' : 'Technical Stack Trace'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-2 bg-slate-900 text-slate-200 rounded-lg text-[10px] overflow-x-auto max-h-40 leading-relaxed font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

