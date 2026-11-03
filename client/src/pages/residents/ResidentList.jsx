import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Building2,
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  Power,
  Globe,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Phone,
  Mail,
  Home,
  FileText
} from 'lucide-react';

const ResidentList = () => {
  const { logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullNameMarathi: '',
    flatNumber: '',
    wing: 'A Wing',
    mobileNumber: '',
    email: '',
    address: '',
    notes: '',
    status: 'ACTIVE'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch residents list
  const fetchResidents = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/residents', { params });
      if (res.data.success) {
        setResidents(res.data.residents || []);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'सभासद यादी आणताना त्रुटी आली.'
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      fullNameMarathi: '',
      flatNumber: '',
      wing: 'A Wing',
      mobileNumber: '',
      email: '',
      address: '',
      notes: '',
      status: 'ACTIVE'
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (resident) => {
    setSelectedResident(resident);
    setFormData({
      fullNameMarathi: resident.fullNameMarathi || '',
      flatNumber: resident.flatNumber || '',
      wing: resident.wing || 'A Wing',
      mobileNumber: resident.mobileNumber || '',
      email: resident.email || '',
      address: resident.address || '',
      notes: resident.notes || '',
      status: resident.status || 'ACTIVE'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (resident) => {
    setSelectedResident(resident);
    setIsViewModalOpen(true);
  };

  // Open Status Confirm Modal
  const handleOpenStatusConfirm = (resident) => {
    setSelectedResident(resident);
    setIsStatusConfirmOpen(true);
  };

  // Submit Add
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullNameMarathi.trim()) {
      setFormError('मराठी पूर्ण नाव आवश्यक आहे.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.post('/residents', formData);
      if (res.data.success) {
        setSuccessMessage('नवीन सभासद यशस्वीरीत्या नोंदवला गेला!');
        setIsAddModalOpen(false);
        fetchResidents();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'नोंदणी करताना त्रुटी आली.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullNameMarathi.trim()) {
      setFormError('मराठी पूर्ण नाव आवश्यक आहे.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.put(`/residents/${selectedResident._id}`, formData);
      if (res.data.success) {
        setSuccessMessage('सभासदाची माहिती यशस्वीरीत्या अद्यतनित झाली!');
        setIsEditModalOpen(false);
        fetchResidents();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'अद्यतन करताना त्रुटी आली.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async () => {
    if (!selectedResident) return;
    setFormSubmitting(true);
    try {
      const targetStatus = selectedResident.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await api.patch(`/residents/${selectedResident._id}/status`, {
        status: targetStatus
      });
      if (res.data.success) {
        setSuccessMessage(`सभासद स्थिती यशस्वीरीत्या बदलली!`);
        setIsStatusConfirmOpen(false);
        fetchResidents();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'स्थिती बदलताना त्रुटी आली.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Compute Stats
  const totalCount = residents.length;
  const activeCount = residents.filter((r) => r.status === 'ACTIVE').length;
  const inactiveCount = residents.filter((r) => r.status === 'INACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Header & Navigation */}
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
              <p className="text-xs text-slate-400">{t('location')}</p>
            </div>
          </div>

          {/* Navigation Links & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{t('navDashboard')}</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
              <Users className="w-3.5 h-3.5" />
              <span>{t('navResidents')}</span>
            </div>

            <button
              onClick={toggleLanguage}
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('langSwitch')}</span>
            </button>

            <button
              onClick={logout}
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
        {/* Page Title & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('residentsTitle')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {t('initialRosterBadge')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t('residentsSubtitle')}
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg shadow-orange-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addResident')}</span>
          </button>
        </div>

        {/* Global Toast Messages */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Summary Metric Badges */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 max-w-xl">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">एकूण सभासद (Total)</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{totalCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xs text-emerald-400 font-medium mb-1">सक्रिय (Active)</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{activeCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">निष्क्रिय (Inactive)</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-300">{inactiveCount}</div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' ? t('filterAll') : f === 'ACTIVE' ? t('filterActive') : t('filterInactive')}
              </button>
            ))}
          </div>
        </div>

        {/* Resident Data Table (Desktop) / Cards (Mobile) */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">सभासद माहिती लोड होत आहे...</p>
          </div>
        ) : residents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm">{t('emptyResidents')}</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-4 w-14 text-center">{t('colSrNo')}</th>
                    <th className="py-3.5 px-4">{t('colName')}</th>
                    <th className="py-3.5 px-4">{t('colFlat')}</th>
                    <th className="py-3.5 px-4">{t('colWing')}</th>
                    <th className="py-3.5 px-4">{t('colContact')}</th>
                    <th className="py-3.5 px-4 text-center">{t('colStatus')}</th>
                    <th className="py-3.5 px-4 text-right">{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {residents.map((r, index) => (
                    <tr
                      key={r._id}
                      className="hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm">
                          {r.fullNameMarathi}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {r.flatNumber ? (
                          <span className="font-mono font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            {r.flatNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {t('notAvailable')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {r.wing || 'A Wing'}
                      </td>
                      <td className="py-3 px-4">
                        {r.mobileNumber ? (
                          <span className="font-mono text-slate-300">{r.mobileNumber}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {t('notAvailable')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {r.status === 'ACTIVE' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{r.status === 'ACTIVE' ? t('statusActive') : t('statusInactive')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenView(r)}
                            type="button"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title={t('btnView')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            type="button"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 transition-colors"
                            title={t('btnEdit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenStatusConfirm(r)}
                            type="button"
                            className={`p-1.5 rounded-lg transition-colors ${
                              r.status === 'ACTIVE'
                                ? 'bg-red-950/40 hover:bg-red-900/50 text-red-400'
                                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400'
                            }`}
                            title={r.status === 'ACTIVE' ? t('btnDeactivate') : t('btnActivate')}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD RESIDENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {t('modalAddTitle')}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              नवीन सभासदाची मूलभूत माहिती प्रविष्ट करा.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldFullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullNameMarathi}
                  onChange={(e) =>
                    setFormData({ ...formData, fullNameMarathi: e.target.value })
                  }
                  placeholder="उदा. श्री गणेश शिंदे"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldFlatNo')}
                  </label>
                  <input
                    type="text"
                    value={formData.flatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, flatNumber: e.target.value })
                    }
                    placeholder="उदा. 101"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldWing')}
                  </label>
                  <input
                    type="text"
                    value={formData.wing}
                    onChange={(e) =>
                      setFormData({ ...formData, wing: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldMobile')}
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldEmail')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="example@mail.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldAddress')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="पत्ता किंवा संपर्क माहिती"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldNotes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="प्रशासकीय शेरा किंवा नोंदी..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formSubmitting ? t('btnSaving') : t('btnSave')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RESIDENT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {t('modalEditTitle')}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              सभासदाची माहिती अद्यतनित करा.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldFullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullNameMarathi}
                  onChange={(e) =>
                    setFormData({ ...formData, fullNameMarathi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldFlatNo')}
                  </label>
                  <input
                    type="text"
                    value={formData.flatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, flatNumber: e.target.value })
                    }
                    placeholder="उदा. 101"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldWing')}
                  </label>
                  <input
                    type="text"
                    value={formData.wing}
                    onChange={(e) =>
                      setFormData({ ...formData, wing: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldMobile')}
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t('fieldEmail')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="example@mail.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldAddress')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t('fieldNotes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formSubmitting ? t('btnSaving') : t('btnSave')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW RESIDENT DETAILS */}
      {isViewModalOpen && selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedResident.fullNameMarathi}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                    selectedResident.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {selectedResident.status === 'ACTIVE'
                    ? t('statusActive')
                    : t('statusInactive')}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-5">
              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-orange-400" />
                  <span>सदनिका क्र. (Flat):</span>
                </span>
                <span className="font-mono text-white font-medium">
                  {selectedResident.flatNumber || t('notAvailable')}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>इमारत विंग:</span>
                </span>
                <span className="text-white font-medium">{selectedResident.wing || 'A Wing'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-400" />
                  <span>मोबाईल:</span>
                </span>
                <span className="font-mono text-white font-medium">
                  {selectedResident.mobileNumber || t('notAvailable')}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-400" />
                  <span>ईमेल:</span>
                </span>
                <span className="text-white font-medium">
                  {selectedResident.email || t('notAvailable')}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">पर्यायी पत्ता:</span>
                <span className="text-white text-right max-w-[60%]">
                  {selectedResident.address || t('notAvailable')}
                </span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                  <span>नोंद / शेरा:</span>
                </span>
                <span className="text-slate-300 text-right max-w-[60%]">
                  {selectedResident.notes || t('notAvailable')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsViewModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs"
            >
              बंद करा (Close)
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM STATUS TOGGLE */}
      {isStatusConfirmOpen && selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div
              className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${
                selectedResident.status === 'ACTIVE'
                  ? 'bg-red-950/60 text-red-400 border border-red-800/50'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              {selectedResident.status === 'ACTIVE'
                ? t('confirmDeactivate')
                : t('confirmActivate')}
            </h3>
            <p className="text-xs text-orange-400 font-medium mb-4">
              {selectedResident.fullNameMarathi}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsStatusConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold text-xs"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={handleToggleStatus}
                className={`px-4 py-2 rounded-xl font-semibold text-xs text-white ${
                  selectedResident.status === 'ACTIVE'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {formSubmitting
                  ? t('btnSaving')
                  : selectedResident.status === 'ACTIVE'
                  ? t('btnDeactivate')
                  : t('btnActivate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        शिवनेरी क्लासिक अपार्टमेंट (ए विंग) • औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र.
      </footer>
    </div>
  );
};

export default ResidentList;

