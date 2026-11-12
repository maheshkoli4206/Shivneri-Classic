import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import PasswordInput from '../../components/common/PasswordInput';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Globe,
  CheckCircle2,
  Mail,
  KeyRound,
  X,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMr = lang === 'mr';

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes countdown in seconds

  const from = location.state?.from?.pathname || '/';

  // Countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (forgotModalOpen && forgotStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [forgotModalOpen, forgotStep, otpTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Live password validation checks
  const pwChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(newPassword),
    match: newPassword && newPassword === confirmPassword
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage(
        isMr
          ? 'कृपया वापरकर्तानाव आणि पासवर्ड प्रविष्ट करा.'
          : 'Please enter both username and password.'
      );
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (error) {
      const serverMsg =
        error.response?.data?.message ||
        (isMr
          ? 'लॉगिन अयशस्वी. कृपया आपले वापरकर्तानाव आणि पासवर्ड तपासा.'
          : 'Login failed. Please check your credentials.');
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP to registered recovery email
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!recoveryEmail.trim()) {
      setForgotError(
        isMr
          ? 'कृपया नोंदणीकृत ईमेल पत्ता प्रविष्ट करा'
          : 'Please enter your registered recovery email'
      );
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/request-otp', {
        email: recoveryEmail.trim()
      });
      if (res.data?.success) {
        setForgotSuccess(res.data.message);
        setForgotStep(2);
        setOtpTimer(300);
        setRemainingAttempts(5);
      }
    } catch (error) {
      const resp = error.response?.data;
      if (resp?.code === 'SMTP_NOT_CONFIGURED') {
        setForgotError(
          resp.message ||
            (isMr
              ? 'ईमेल सेवा (SMTP) कॉन्फिगर केलेली नाही. कृपया सर्व्हर ॲडमिनिस्ट्रेटरशी संपर्क साधा.'
              : 'Email service (SMTP) is not configured in server/.env.')
        );
      } else {
        setForgotError(
          resp?.message ||
            (isMr ? 'OTP पाठवताना त्रुटी आली.' : 'Failed to send OTP code.')
        );
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setForgotError(
        isMr
          ? 'कृपया ६-अंकी पडताळणी कोड प्रविष्ट करा'
          : 'Please enter the exact 6-digit OTP code'
      );
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/verify-otp', {
        email: recoveryEmail.trim(),
        otp: otpCode.trim()
      });
      if (res.data?.success && res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setForgotSuccess(res.data.message);
        setForgotStep(3);
      }
    } catch (error) {
      const resp = error.response?.data;
      if (resp?.remainingAttempts !== undefined) {
        setRemainingAttempts(resp.remainingAttempts);
      }
      setForgotError(
        resp?.message ||
          (isMr ? 'OTP पडताळताना त्रुटी आली.' : 'Failed to verify OTP code.')
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!pwChecks.length || !pwChecks.upper || !pwChecks.lower || !pwChecks.number || !pwChecks.special) {
      setForgotError(
        isMr
          ? 'कृपया सर्व पासवर्ड सुरक्षा अटी पूर्ण करा.'
          : 'Please fulfill all password security requirements.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError(
        isMr
          ? 'नवीन पासवर्ड आणि पुष्टी पासवर्ड जुळत नाहीत'
          : 'New password and confirm password do not match'
      );
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/reset-password', {
        email: recoveryEmail.trim(),
        resetToken,
        newPassword,
        confirmPassword
      });
      if (res.data?.success) {
        setForgotSuccess(res.data.message);
        setForgotStep(4);
      }
    } catch (error) {
      setForgotError(
        error.response?.data?.message ||
          (isMr ? 'पासवर्ड रीसेट करताना त्रुटी आली.' : 'Failed to reset password.')
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotModalOpen(false);
    setForgotStep(1);
    setRecoveryEmail('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setRemainingAttempts(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-orange-500 selection:text-white font-sans">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-orange-100/60 via-slate-100/30 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-10 right-10 w-80 h-80 bg-blue-100/40 blur-3xl pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2 z-10 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src="/building-logo.png"
            alt="Shivneri Classic Apartment Logo"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-amber-500/40 shadow-md shadow-orange-500/20 shrink-0 bg-white block"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 leading-tight truncate">
              {t('appName')}
            </h1>
            <p className="text-[11px] sm:text-xs text-orange-600 font-semibold truncate">
              {t('wing')} • {t('location')}
            </p>
          </div>
        </div>

        {/* Bilingual Switcher (Marathi / English Only - No Hindi) */}
        <button
          onClick={toggleLanguage}
          type="button"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-xs transition-colors cursor-pointer shrink-0"
          title="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span>{t('langSwitch')}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto w-full my-auto py-4 sm:py-8 z-10">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 p-5 sm:p-8">
          {/* Admin Identity Banner with Building Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/building-logo.png"
                alt="Shivneri Classic Apartment Emblem"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg ring-4 ring-amber-400/40 bg-white hover:scale-105 transition-transform"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              <span>{t('superAdminPortal')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('loginTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
              {t('loginSubtitle')}
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t('usernameLabel')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('usernamePlaceholder')}
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t('passwordLabel')}
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                required
                autoComplete="current-password"
                leftIcon={Lock}
                showToggleLabel={isMr ? 'पासवर्ड दाखवा' : 'Show password'}
                hideToggleLabel={isMr ? 'पासवर्ड लपवा' : 'Hide password'}
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotStep(1);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="min-h-[40px] flex items-center text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors focus:outline-none focus:underline cursor-pointer"
                >
                  {t('forgotPasswordLink')}
                </button>
              </div>
            </div>

            {/* Admin Designation Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
              <div>
                <span className="text-slate-800 font-semibold">{t('adminName')}</span>
                <span className="block text-slate-500 text-[10px]">{t('adminDesignation')}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {t('adminRoleBadge')}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-md shadow-orange-600/20 hover:shadow-orange-600/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('loggingIn')}</span>
                </>
              ) : (
                <span>{t('loginButton')}</span>
              )}
            </button>
          </form>

          {/* Restricted Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-normal">
              {t('noticeNoResidentLogin')}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center py-2 z-10">
        <p className="text-[11px] text-slate-500">
          {t('securityNotice')}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
          {t('appName')} • {isMr ? 'पंचवटी, नाशिक, महाराष्ट्र.' : 'Panchavati, Nashik, Maharashtra.'}
        </p>
      </footer>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL (Bilingual 3-Step OTP Workflow)                      */}
      {/* ========================================================================= */}
      {forgotModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-tight text-white truncate">
                    {t('forgotModalTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {forgotStep === 1 && t('step1Title')}
                    {forgotStep === 2 && t('step2Title')}
                    {forgotStep === 3 && t('step3Title')}
                    {forgotStep === 4 && t('passwordResetSuccessTitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Error Alert */}
              {forgotError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{forgotError}</div>
                </div>
              )}

              {/* Success Alert */}
              {forgotSuccess && forgotStep !== 4 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{forgotSuccess}</div>
                </div>
              )}

              {/* STEP 1: Enter Registered Recovery Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isMr
                      ? 'सुपर ॲडमिन खात्याशी जोडलेला अधिकृत ईमेल पत्ता प्रविष्ट करा. त्यावर ६-अंकी OTP पाठवला जाईल.'
                      : 'Enter the registered recovery email associated with the Super Admin account. A 6-digit OTP will be sent.'}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('recoveryEmailLabel')} *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="admin@shivnericlassic.org"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t('btnCancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('sendingOtp')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('btnSendOtp')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter 6-digit OTP Code */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 space-y-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span>{isMr ? 'पडताळणी कोड पाठवला गेला' : 'OTP Sent to'}</span>
                      <span className="font-mono text-orange-700 font-bold">{formatTimer(otpTimer)}</span>
                    </div>
                    <p className="text-[11px] text-orange-800 break-all">{recoveryEmail}</p>
                    {remainingAttempts !== null && (
                      <p className="text-[11px] text-amber-800 font-semibold pt-1">
                        {t('otpRemainingAttempts')} {remainingAttempts} / 5
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {isMr ? '६-अंकी पडताळणी OTP टाका' : 'Enter 6-Digit OTP Code'} *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full text-center tracking-[8px] font-mono font-bold text-xl py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => handleRequestOtp()}
                      disabled={forgotLoading || otpTimer > 240}
                      className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{t('btnResendOtp')}</span>
                    </button>
                    <span className="text-slate-400 text-[11px]">{t('otpExpiryNotice')}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {isMr ? 'ईमेल बदला' : 'Change Email'}
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || otpCode.length !== 6}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('verifyingOtp')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('btnVerifyOtp')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Set New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isMr
                      ? 'नवीन सुरक्षित पासवर्ड प्रविष्ट करा व पुष्टी करा. जुनी सर्व सत्रे तात्काळ रद्द होतील.'
                      : 'Set a new secure password. All previous active sessions will be terminated.'}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('newPasswordLabel')} *
                    </label>
                    <PasswordInput
                      id="forgot-new-password"
                      name="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      leftIcon={Lock}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('confirmPasswordLabel')} *
                    </label>
                    <PasswordInput
                      id="forgot-confirm-password"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      leftIcon={Lock}
                    />
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                    <span className="font-semibold text-slate-700 block">
                      {t('passwordReqTitle')}
                    </span>
                    <ul className="space-y-1">
                      <li className={`flex items-center gap-1.5 ${pwChecks.length ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        <span>{pwChecks.length ? '✓' : '•'}</span>
                        <span>{t('passwordReqMin')}</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${pwChecks.upper ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        <span>{pwChecks.upper ? '✓' : '•'}</span>
                        <span>{t('passwordReqUpper')}</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${pwChecks.lower ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        <span>{pwChecks.lower ? '✓' : '•'}</span>
                        <span>{t('passwordReqLower')}</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${pwChecks.number ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        <span>{pwChecks.number ? '✓' : '•'}</span>
                        <span>{t('passwordReqNumber')}</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${pwChecks.special ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        <span>{pwChecks.special ? '✓' : '•'}</span>
                        <span>{t('passwordReqSpecial')}</span>
                      </li>
                      {confirmPassword && (
                        <li className={`flex items-center gap-1.5 ${pwChecks.match ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}`}>
                          <span>{pwChecks.match ? '✓' : '✗'}</span>
                          <span>{isMr ? 'पासवर्ड जुळतात' : 'Passwords match'}</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t('btnCancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !pwChecks.length || !pwChecks.upper || !pwChecks.lower || !pwChecks.number || !pwChecks.special || !pwChecks.match}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('resettingPassword')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('btnResetPassword')}</span>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Reset Success */}
              {forgotStep === 4 && (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-50">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-slate-900">
                      {t('passwordResetSuccessTitle')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                      {t('passwordResetSuccessDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all cursor-pointer"
                  >
                    {t('backToLogin')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
