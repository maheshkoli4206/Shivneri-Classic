import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PasswordInput from '../../components/common/PasswordInput';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Key,
  User,
  Phone,
  RefreshCw,
  X,
  Mail,
  KeyRound,
  FileText,
  UserCheck,
  Server
} from 'lucide-react';

const AdminSettings = () => {
  const { lang, t } = useLanguage();
  const { logout } = useAuth();
  const isMr = lang === 'mr';

  // Active top-level tab: 'security' or 'transfer'
  const [activeTab, setActiveTab] = useState('security');

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --------------------------------------------------------------------------
  // ACCOUNT SECURITY STATE
  // --------------------------------------------------------------------------
  // Username update form
  const [usernameForm, setUsernameForm] = useState({
    currentPassword: '',
    newUsername: ''
  });
  const [updatingUsername, setUpdatingUsername] = useState(false);

  // Password update form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Recovery email update form
  const [emailForm, setEmailForm] = useState({
    currentPassword: '',
    recoveryEmail: ''
  });
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // --------------------------------------------------------------------------
  // CHAIRMAN TRANSFER STATE
  // --------------------------------------------------------------------------
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newFullNameMarathi: '',
    newFullNameEnglish: '',
    newUsername: '',
    newDesignation: 'Chairman / Building Secretary',
    newContactNumber: '',
    newInitialPassword: '',
    authorizedReason: '',
    resolutionNumber: ''
  });
  const [submittingInitiate, setSubmittingInitiate] = useState(false);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTransferDetails, setPendingTransferDetails] = useState(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  // Cancellation state
  const [cancelling, setCancelling] = useState(false);

  // --------------------------------------------------------------------------
  // DATA FETCHING
  // --------------------------------------------------------------------------
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      const [transferRes, securityRes] = await Promise.all([
        api.get('/auth/chairman-transfer/status'),
        api.get('/auth/account-security')
      ]);

      if (transferRes.data?.success) {
        setStatusData(transferRes.data);
        if (transferRes.data.pendingTransfer) {
          setPendingTransferDetails(transferRes.data.pendingTransfer);
        }
      }

      if (securityRes.data?.success) {
        setSecurityData(securityRes.data);
        setEmailForm(prev => ({
          ...prev,
          recoveryEmail: securityRes.data.recoveryEmail || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch settings data:', err);
      setError(
        err.response?.data?.message ||
          (isMr ? 'माहिती मिळवताना त्रुटी आली' : 'Failed to retrieve settings data')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --------------------------------------------------------------------------
  // LIVE PASSWORD VALIDATION CHECKS
  // --------------------------------------------------------------------------
  const pwChecks = {
    length: passwordForm.newPassword.length >= 8,
    upper: /[A-Z]/.test(passwordForm.newPassword),
    lower: /[a-z]/.test(passwordForm.newPassword),
    number: /[0-9]/.test(passwordForm.newPassword),
    special: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(passwordForm.newPassword),
    match: passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword
  };

  // --------------------------------------------------------------------------
  // ACCOUNT SECURITY ACTIONS
  // --------------------------------------------------------------------------
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    try {
      setUpdatingUsername(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/auth/update-username', usernameForm);
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setUsernameForm({ currentPassword: '', newUsername: '' });
        fetchAllData();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'वापरकर्तानाव बदलताना त्रुटी आली' : 'Failed to update username')
      );
    } finally {
      setUpdatingUsername(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!pwChecks.length || !pwChecks.upper || !pwChecks.lower || !pwChecks.number || !pwChecks.special) {
      setError(
        isMr
          ? 'कृपया सर्व पासवर्ड सुरक्षा अटी पूर्ण करा.'
          : 'Please fulfill all password security requirements.'
      );
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(
        isMr
          ? 'नवीन पासवर्ड आणि पुष्टी पासवर्ड जुळत नाहीत'
          : 'New password and confirmation do not match'
      );
      return;
    }

    try {
      setUpdatingPassword(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/auth/update-password', passwordForm);
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        fetchAllData();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'पासवर्ड बदलताना त्रुटी आली' : 'Failed to update password')
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateRecoveryEmail = async (e) => {
    e.preventDefault();
    try {
      setUpdatingEmail(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/auth/update-recovery-email', emailForm);
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setEmailForm(prev => ({ ...prev, currentPassword: '' }));
        fetchAllData();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'रिकव्हरी ईमेल अद्यतनित करताना त्रुटी आली' : 'Failed to update recovery email')
      );
    } finally {
      setUpdatingEmail(false);
    }
  };

  // --------------------------------------------------------------------------
  // CHAIRMAN TRANSFER ACTIONS
  // --------------------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingInitiate(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/auth/chairman-transfer/initiate', formData);
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setShowInitiateForm(false);
        setPendingTransferDetails(res.data.pendingTransfer);
        setConfirmModalOpen(true);
        fetchAllData();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'हस्तांतरण प्रक्रिया सुरू करताना त्रुटी आली' : 'Failed to initiate transfer')
      );
    } finally {
      setSubmittingInitiate(false);
    }
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingConfirm(true);
      setError('');
      setSuccessMsg('');

      const res = await api.post('/auth/chairman-transfer/confirm', {
        currentPassword: confirmPasswordInput,
        confirmationCode: confirmCodeInput,
        confirmationPhrase: confirmPhraseInput
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setConfirmModalOpen(false);
        setTimeout(async () => {
          await logout();
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'हस्तांतरण पुष्टीकरण अयशस्वी झाले' : 'Transfer confirmation failed')
      );
    } finally {
      setSubmittingConfirm(false);
    }
  };

  const handleCancelPending = async () => {
    if (!window.confirm(isMr ? 'प्रलंबित हस्तांतरण खरोखर रद्द करायचे आहे का?' : 'Cancel this pending transfer?')) {
      return;
    }
    try {
      setCancelling(true);
      setError('');
      const res = await api.post('/auth/chairman-transfer/cancel', {
        reason: 'Cancelled by current Super Admin from UI'
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setPendingTransferDetails(null);
        setConfirmModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isMr ? 'हस्तांतरण रद्द करताना त्रुटी आली' : 'Failed to cancel transfer')
      );
    } finally {
      setCancelling(false);
    }
  };

  const expectedPhrase = isMr ? 'हस्तांतरण निश्चित करा' : 'CONFIRM OWNERSHIP TRANSFER';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('settingsTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              {isMr ? 'प्रशासकीय नियंत्रण' : 'Admin Governance'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-orange-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{isMr ? 'ताजे करा' : 'Refresh'}</span>
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{successMsg}</div>
        </div>
      )}

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-md w-full">
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-white text-orange-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{t('tabAccountSecurity')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transfer'
              ? 'bg-white text-orange-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t('tabChairmanTransfer')}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ACCOUNT SECURITY MANAGEMENT                                    */}
      {/* ===================================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Identity & Status Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img
                  src="/building-logo.png"
                  alt="Logo"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400/50 shadow-md bg-white shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {isMr
                        ? securityData?.fullNameMarathi || 'श्री ल.रा. कोळी'
                        : securityData?.fullNameEnglish || 'Shri Laxman Koli'}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {t('adminRoleBadge')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isMr ? 'चेअरमन / सेक्रेटरी • ए विंग, नाशिक' : 'Chairman / Building Secretary • A Wing, Nashik'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    {t('currentUsernameLabel')}
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {securityData?.username || 'laxman_koli'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    {t('recoveryEmailLabel')}
                  </span>
                  <span className="font-semibold text-slate-800 truncate block max-w-[130px]" title={securityData?.recoveryEmail || 'Not Set'}>
                    {securityData?.recoveryEmail || (isMr ? 'सेट नाही' : 'Not Set')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    {isMr ? 'सत्र आवृत्ती' : 'Token Version'}
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    v{securityData?.tokenVersion ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    {isMr ? 'ईमेल सेवा (SMTP)' : 'Email Service'}
                  </span>
                  <span className={`font-semibold ${securityData?.isEmailConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {securityData?.isEmailConfigured ? (isMr ? 'सक्रिय' : 'Active') : (isMr ? 'सेटअप आवश्यक' : 'Setup Required')}
                  </span>
                </div>
              </div>
            </div>

            {/* SMTP Status Notification Banner */}
            {!securityData?.isEmailConfigured ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs flex items-start gap-3">
                <Server className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-950">
                    {t('smtpStatusMissing')}
                  </h4>
                  <p className="text-amber-800 leading-relaxed">
                    {t('smtpSetupHint')}
                  </p>
                  <p className="text-[11px] font-mono text-amber-900 bg-amber-100/60 p-2 rounded-lg mt-1 inline-block">
                    SMTP_HOST=smtp.gmail.com | SMTP_PORT=587 | SMTP_USER=your_email@gmail.com | SMTP_PASS=your_app_password
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('smtpStatusConfigured')}</span>
              </div>
            )}
          </div>

          {/* TWO-COLUMN GRID: Change Username & Password Recovery Email */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: CHANGE USERNAME */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {t('changeUsernameCardTitle')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t('changeUsernameDesc')}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateUsername} className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('currentUsernameLabel')}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={securityData?.username || ''}
                      className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-mono text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('newUsernameLabel')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={usernameForm.newUsername}
                      onChange={(e) => setUsernameForm(prev => ({ ...prev, newUsername: e.target.value }))}
                      placeholder="e.g. laxman_koli_admin"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('currentPasswordLabel')} *
                    </label>
                    <PasswordInput
                      id="user-curr-password"
                      name="currentPassword"
                      value={usernameForm.currentPassword}
                      onChange={(e) => setUsernameForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      leftIcon={Lock}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updatingUsername || !usernameForm.newUsername || !usernameForm.currentPassword}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {updatingUsername ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('updatingCredentials')}</span>
                        </>
                      ) : (
                        <span>{t('btnUpdateUsername')}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* CARD 2: PASSWORD RECOVERY EMAIL */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {t('recoveryEmailCardTitle')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t('recoveryEmailDesc')}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateRecoveryEmail} className="space-y-4 pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('recoveryEmailLabel')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={emailForm.recoveryEmail}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                      placeholder="e.g. laxmankoli@shivnericlassic.org"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {t('currentPasswordLabel')} *
                    </label>
                    <PasswordInput
                      id="email-curr-password"
                      name="currentPassword"
                      value={emailForm.currentPassword}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      leftIcon={Lock}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    {isMr
                      ? 'हा ईमेल केवळ पासवर्ड विसरल्यास ६-अंकी OTP पाठवण्यासाठी वापरला जातो.'
                      : 'This email is exclusively used to deliver 6-digit OTP verification codes during password recovery.'}
                  </p>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updatingEmail || !emailForm.recoveryEmail || !emailForm.currentPassword}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {updatingEmail ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('updatingCredentials')}</span>
                        </>
                      ) : (
                        <span>{t('btnSaveRecoveryEmail')}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* CARD 3: CHANGE PASSWORD (FULL WIDTH) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {t('changePasswordCardTitle')}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {t('changePasswordDesc')}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('currentPasswordLabel')} *
                  </label>
                  <PasswordInput
                    id="pw-curr-password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    required
                    leftIcon={Lock}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('newPasswordLabel')} *
                  </label>
                  <PasswordInput
                    id="pw-new-password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
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
                    id="pw-confirm-password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    leftIcon={Lock}
                  />
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2">
                <span className="font-semibold text-slate-800 block">
                  {t('passwordReqTitle')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${pwChecks.length ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                    <span>{pwChecks.length ? '✓' : '•'}</span>
                    <span>{t('passwordReqMin')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwChecks.upper ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                    <span>{pwChecks.upper ? '✓' : '•'}</span>
                    <span>{t('passwordReqUpper')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwChecks.lower ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                    <span>{pwChecks.lower ? '✓' : '•'}</span>
                    <span>{t('passwordReqLower')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwChecks.number ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                    <span>{pwChecks.number ? '✓' : '•'}</span>
                    <span>{t('passwordReqNumber')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwChecks.special ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                    <span>{pwChecks.special ? '✓' : '•'}</span>
                    <span>{t('passwordReqSpecial')}</span>
                  </div>
                  {passwordForm.confirmPassword && (
                    <div className={`flex items-center gap-1.5 ${pwChecks.match ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}`}>
                      <span>{pwChecks.match ? '✓' : '✗'}</span>
                      <span>{isMr ? 'पासवर्ड जुळतात' : 'Passwords match'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-amber-700 font-medium">
                  {isMr
                    ? '⚠️ पासवर्ड बदलल्यास इतर सर्व डिव्हाइसेसवरील जुनी सत्रे तात्काळ बंद केली जातील.'
                    : '⚠️ Updating your password invalidates all other active sessions across browsers.'}
                </span>
                <button
                  type="submit"
                  disabled={
                    updatingPassword ||
                    !passwordForm.currentPassword ||
                    !pwChecks.length ||
                    !pwChecks.upper ||
                    !pwChecks.lower ||
                    !pwChecks.number ||
                    !pwChecks.special ||
                    !pwChecks.match
                  }
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('updatingCredentials')}</span>
                    </>
                  ) : (
                    <span>{t('btnUpdatePassword')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: CHAIRMAN OWNERSHIP TRANSFER                                    */}
      {/* ===================================================================== */}
      {activeTab === 'transfer' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Database Singleton Invariant Explanation */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950">
                {t('singletonPolicyTitle')}
              </h4>
              <p className="text-amber-800 leading-relaxed">
                {t('singletonPolicyDesc')}
              </p>
            </div>
          </div>

          {/* SECTION: ACTIVE PENDING TRANSFER NOTIFICATION (IF ANY) */}
          {statusData?.pendingTransfer && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-orange-950">
                      {isMr ? 'हस्तांतरण प्रक्रिया प्रलंबित (Pending Confirmation)' : 'Transfer Pending Confirmation'}
                    </h3>
                    <p className="text-xs text-orange-800">
                      {isMr ? 'हस्तांतरण आयडी:' : 'Transfer ID:'} <span className="font-mono font-bold">{statusData.pendingTransfer.transferId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPendingTransferDetails(statusData.pendingTransfer);
                      setConfirmModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all cursor-pointer"
                  >
                    {isMr ? 'पुष्टी करा व पूर्ण करा' : 'Confirm & Finalize'}
                  </button>
                  <button
                    onClick={handleCancelPending}
                    disabled={cancelling}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isMr ? 'रद्द करा' : 'Cancel'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/80 p-3.5 rounded-xl border border-orange-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">{isMr ? 'प्रस्तावित नवीन चेअरमन:' : 'Proposed Chairman:'}</span>
                  <span className="font-bold text-slate-900">{statusData.pendingTransfer.newChairman?.fullNameEnglish}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isMr ? 'नवीन वापरकर्तानाव:' : 'New Username:'}</span>
                  <span className="font-mono font-bold text-slate-900">{statusData.pendingTransfer.newChairman?.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isMr ? 'ठराव क्रमांक:' : 'Resolution No:'}</span>
                  <span className="font-semibold text-slate-800">{statusData.pendingTransfer.resolutionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{isMr ? 'मुदत समाप्ती:' : 'Expires At:'}</span>
                  <span className="font-semibold text-red-600">
                    {new Date(statusData.pendingTransfer.confirmationExpiresAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CHAIRMAN OWNERSHIP TRANSFER PANEL */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-orange-600" />
                  <span>{t('transferSectionTitle')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('transferSectionDesc')}
                </p>
              </div>

              {!showInitiateForm && !statusData?.pendingTransfer && (
                <button
                  onClick={() => setShowInitiateForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                >
                  <span>{t('btnInitiateTransfer')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Transfer Initiation Form */}
            {showInitiateForm && !statusData?.pendingTransfer && (
              <form onSubmit={handleInitiateSubmit} className="space-y-6 animate-in fade-in">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>{isMr ? 'सुरक्षा इशारा:' : 'Security Notice:'} </strong>
                    {isMr
                      ? 'ही प्रक्रिया केवळ नवीन समितीच्या कायदेशीर ठरावानुसार केली पाहिजे. हस्तांतरण पूर्ण झाल्यावर जुन्या चेअरमनचे लॉगिन कायमचे बंद होईल.'
                      : 'This procedure must strictly be backed by a General Body Resolution. Once completed, the current Chairman account will be permanently transferred to the new credentials.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewChairmanMarathi')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="newFullNameMarathi"
                      value={formData.newFullNameMarathi}
                      onChange={handleInputChange}
                      placeholder="उदा. श्री रमेश शांताराम पाटील"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewChairmanEnglish')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="newFullNameEnglish"
                      value={formData.newFullNameEnglish}
                      onChange={handleInputChange}
                      placeholder="e.g. Shri Ramesh Shantaram Patil"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewUsername')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="newUsername"
                      value={formData.newUsername}
                      onChange={handleInputChange}
                      placeholder="e.g. ramesh_patil"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewDesignation')}
                    </label>
                    <input
                      type="text"
                      name="newDesignation"
                      value={formData.newDesignation}
                      onChange={handleInputChange}
                      placeholder="Chairman / Building Secretary"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewContact')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="tel"
                      name="newContactNumber"
                      value={formData.newContactNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. 9822123456"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldNewPassword')} <span className="text-orange-600">*</span>
                    </label>
                    <PasswordInput
                      id="transfer-new-pw"
                      name="newInitialPassword"
                      value={formData.newInitialPassword}
                      onChange={handleInputChange}
                      placeholder="Minimum 8 characters"
                      required
                      autoComplete="new-password"
                      leftIcon={Lock}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldResolutionNumber')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="resolutionNumber"
                      value={formData.resolutionNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. AGM-2027-RES-01"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      {t('fieldHandoverReason')} <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="authorizedReason"
                      value={formData.authorizedReason}
                      onChange={handleInputChange}
                      placeholder="e.g. Committee tenure completion"
                      className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs sm:text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Current Super Admin Password Authentication */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="max-w-md">
                    <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                      {t('fieldCurrentPasswordAuth')} <span className="text-orange-600">*</span>
                    </label>
                    <PasswordInput
                      id="transfer-curr-pw"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                      leftIcon={Lock}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInitiateForm(false)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    {t('btnCancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInitiate}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {submittingInitiate ? (isMr ? 'सुरू होत आहे...' : 'Initiating...') : t('btnInitiateTransfer')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* TENURE HISTORY TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>{t('tenureHistoryTitle')}</span>
              </h3>
            </div>

            {statusData?.currentChairman?.tenureHistory?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{isMr ? 'माजी चेअरमन' : 'Former Chairman'}</th>
                      <th className="py-2.5 px-3">{isMr ? 'वापरकर्तानाव' : 'Username'}</th>
                      <th className="py-2.5 px-3">{isMr ? 'कार्यकाळ' : 'Tenure'}</th>
                      <th className="py-2.5 px-3">{isMr ? 'ठराव क्र.' : 'Resolution'}</th>
                      <th className="py-2.5 px-3">{isMr ? 'हस्तांतरण कारण' : 'Handover Reason'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statusData.currentChairman.tenureHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {isMr ? item.fullNameMarathi : item.fullNameEnglish}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{item.username}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {new Date(item.tenureStartDate).toLocaleDateString()} - {new Date(item.tenureEndDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">{item.resolutionNumber || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.handoverReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                {isMr
                  ? 'अद्याप कोणताही पदभार हस्तांतरण इतिहास नोंदवलेला नाही. सध्याचे चेअरमन मूळ संस्थापक मुख्य प्रशासक आहेत.'
                  : 'No previous Chairman handovers recorded. Current Super Admin is the founding Chairman.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CONFIRMATION MODAL FOR CHAIRMAN TRANSFER                              */}
      {/* ===================================================================== */}
      {confirmModalOpen && pendingTransferDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-red-600 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-base">{t('confirmModalTitle')}</h3>
              </div>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} id="confirm-transfer-form" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-xl leading-relaxed">
                {t('confirmModalWarning')}
              </div>

              {pendingTransferDetails?.confirmationCode && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-1">
                  <span className="text-[11px] font-semibold text-amber-900">
                    {isMr ? 'सिस्टम जनरेटेड पडताळणी कोड:' : 'Generated Confirmation Code:'}
                  </span>
                  <div className="font-mono text-xl font-extrabold text-orange-700 tracking-widest select-all">
                    {pendingTransferDetails.confirmationCode}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {t('confirmCodePrompt')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={confirmCodeInput}
                  onChange={(e) => setConfirmCodeInput(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {t('confirmPhrasePrompt')}{' '}
                  <span className="font-mono text-red-600 select-all">"{expectedPhrase}"</span>
                </label>
                <input
                  type="text"
                  value={confirmPhraseInput}
                  onChange={(e) => setConfirmPhraseInput(e.target.value)}
                  placeholder={expectedPhrase}
                  className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  {t('fieldCurrentPasswordAuth')} <span className="text-red-600">*</span>
                </label>
                <PasswordInput
                  id="confirm-modal-pw"
                  name="confirmPassword"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Your current password"
                  required
                  leftIcon={Lock}
                />
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                {t('btnCancelTransfer')}
              </button>
              <button
                type="submit"
                form="confirm-transfer-form"
                disabled={
                  submittingConfirm ||
                  !confirmPasswordInput ||
                  !confirmCodeInput ||
                  confirmPhraseInput.trim().toLowerCase() !== expectedPhrase.toLowerCase()
                }
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                {submittingConfirm ? (isMr ? 'हस्तांतरित होत आहे...' : 'Transferring...') : t('btnConfirmTransfer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
