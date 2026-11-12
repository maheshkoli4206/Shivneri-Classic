import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useResidentContext } from '../../context/ResidentContext';
import api from '../../services/api';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  Power,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Phone,
  Mail,
  Home,
  FileText,
  Building2,
  Store,
  Tag,
  ShieldCheck,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const ResidentList = () => {
  const { t, lang } = useLanguage();
  const { refreshResidentCount, setTotalResidentsCount } = useResidentContext();
  const isMr = lang === 'mr';

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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
    status: 'ACTIVE',
    propertyType: 'RESIDENTIAL_FLAT',
    maintenanceCategory: 'RESIDENTIAL',
    customMaintenanceAmount: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Category Assignment Batch State
  const [batchAssignments, setBatchAssignments] = useState([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState('');
  const [batchError, setBatchError] = useState('');

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
        const list = res.data.residents || [];
        setResidents(list);
        if (!searchQuery.trim() && statusFilter === 'ALL') {
          setTotalResidentsCount(list.length);
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || (isMr ? 'सभासद यादी आणताना त्रुटी आली.' : 'Failed to fetch resident roster.')
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, isMr, setTotalResidentsCount]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  // Calculate unassigned count
  const unassignedCount = residents.filter(r => !r.maintenanceCategory || r.maintenanceCategory === 'UNASSIGNED').length;

  // Filtered residents list
  const filteredResidents = residents.filter(r => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'UNASSIGNED') return !r.maintenanceCategory || r.maintenanceCategory === 'UNASSIGNED';
    return r.maintenanceCategory === categoryFilter;
  });

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
      status: 'ACTIVE',
      propertyType: 'RESIDENTIAL_FLAT',
      maintenanceCategory: 'RESIDENTIAL',
      customMaintenanceAmount: ''
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
      status: resident.status || 'ACTIVE',
      propertyType: resident.propertyType || (resident.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL_FLAT'),
      maintenanceCategory: resident.maintenanceCategory || 'UNASSIGNED',
      customMaintenanceAmount: resident.customMaintenanceAmount != null ? String(resident.customMaintenanceAmount) : ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Category Assignment Batch Review Modal
  const handleOpenCategoryBatch = () => {
    const initialList = residents.map(r => ({
      residentId: r._id,
      fullNameMarathi: r.fullNameMarathi,
      flatNumber: r.flatNumber || '',
      propertyType: r.propertyType || (r.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL_FLAT'),
      maintenanceCategory: r.maintenanceCategory || (r.flatNumber?.toLowerCase().includes('shop') ? 'SHOP' : r.fullNameMarathi.includes('कोळी') ? 'CHAIRMAN' : 'RESIDENTIAL'),
      customMaintenanceAmount: r.customMaintenanceAmount != null ? String(r.customMaintenanceAmount) : ''
    }));
    setBatchAssignments(initialList);
    setBatchError('');
    setBatchSuccess('');
    setIsCategoryModalOpen(true);
  };

  // Quick preset helper inside Category Batch Modal
  const applySmartCategoryPresets = () => {
    setBatchAssignments(prev => prev.map(item => {
      const isShop = item.flatNumber.toLowerCase().includes('shop') || item.fullNameMarathi.includes('दुकान');
      const isChairman = item.fullNameMarathi.includes('कोळी') || item.flatNumber === '102';
      return {
        ...item,
        propertyType: isShop ? 'SHOP' : 'RESIDENTIAL_FLAT',
        maintenanceCategory: isShop ? 'SHOP' : isChairman ? 'CHAIRMAN' : 'RESIDENTIAL'
      };
    }));
  };

  const handleBatchItemChange = (index, field, value) => {
    setBatchAssignments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Sync propertyType if category is SHOP
      if (field === 'maintenanceCategory' && value === 'SHOP') {
        updated[index].propertyType = 'SHOP';
      }
      return updated;
    });
  };

  // Save Batch Categories
  const handleSaveBatchCategories = async () => {
    setSavingBatch(true);
    setBatchError('');
    setBatchSuccess('');

    try {
      const payload = batchAssignments.map(a => ({
        residentId: a.residentId,
        propertyType: a.propertyType,
        maintenanceCategory: a.maintenanceCategory,
        customMaintenanceAmount: a.customMaintenanceAmount !== '' ? Number(a.customMaintenanceAmount) : null
      }));

      const res = await api.put('/residents/batch-categories', { assignments: payload });
      if (res.data?.success) {
        setBatchSuccess(res.data.message);
        fetchResidents();
        refreshResidentCount();
        setTimeout(() => {
          setIsCategoryModalOpen(false);
          setBatchSuccess('');
        }, 1500);
      }
    } catch (err) {
      setBatchError(
        err.response?.data?.message || (isMr ? 'श्रेणी जतन करताना त्रुटी आली.' : 'Failed to save categories.')
      );
    } finally {
      setSavingBatch(false);
    }
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
      setFormError(isMr ? 'पूर्ण नाव आवश्यक आहे.' : 'Member full name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.post('/residents', {
        ...formData,
        customMaintenanceAmount: formData.customMaintenanceAmount !== '' ? Number(formData.customMaintenanceAmount) : null
      });
      if (res.data.success) {
        setSuccessMessage(isMr ? 'नवीन सभासद यशस्वीरीत्या नोंदवला गेला!' : 'New resident recorded successfully!');
        setIsAddModalOpen(false);
        fetchResidents();
        refreshResidentCount();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || (isMr ? 'नोंदणी करताना त्रुटी आली.' : 'Failed to record resident.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullNameMarathi.trim()) {
      setFormError(isMr ? 'पूर्ण नाव आवश्यक आहे.' : 'Member full name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.put(`/residents/${selectedResident._id}`, {
        ...formData,
        customMaintenanceAmount: formData.customMaintenanceAmount !== '' ? Number(formData.customMaintenanceAmount) : null
      });
      if (res.data.success) {
        setSuccessMessage(isMr ? 'सभासदाची माहिती यशस्वीरीत्या अद्यतनित केली!' : 'Resident details updated successfully!');
        setIsEditModalOpen(false);
        fetchResidents();
        refreshResidentCount();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || (isMr ? 'माहिती अद्यतनित करताना त्रुटी आली.' : 'Failed to update resident.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async () => {
    if (!selectedResident) return;
    try {
      const newStatus = selectedResident.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await api.patch(`/residents/${selectedResident._id}/status`, { status: newStatus });
      if (res.data.success) {
        setSuccessMessage(
          isMr
            ? `सभासद स्थिती यशस्वीरीत्या ${newStatus === 'ACTIVE' ? 'सक्रिय' : 'निष्क्रिय'} केली.`
            : `Resident status set to ${newStatus}.`
        );
        setIsStatusConfirmOpen(false);
        fetchResidents();
        refreshResidentCount();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || (isMr ? 'स्थिती बदलताना त्रुटी आली.' : 'Failed to toggle status.')
      );
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'RESIDENTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Home className="w-3 h-3 text-blue-500" />
            <span>{isMr ? 'निवासी (₹१,०००)' : 'Residential (₹1,000)'}</span>
          </span>
        );
      case 'SHOP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Store className="w-3 h-3 text-purple-500" />
            <span>{isMr ? 'दुकान (₹३००)' : 'Shop (₹300)'}</span>
          </span>
        );
      case 'CHAIRMAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>{isMr ? 'चेअरमन (₹५००)' : 'Chairman (₹500)'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>{isMr ? 'श्रेणी अपूर्ण' : 'Unassigned'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('residentsTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              {residents.length} {isMr ? 'सभासद' : 'Members'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('residentsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto flex-wrap w-full sm:w-auto">
          {/* Category Assignment Review Button */}
          <button
            onClick={handleOpenCategoryBatch}
            type="button"
            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span>{t('btnCategoryAssignment')}</span>
            {unassignedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white text-amber-800 rounded-full text-[10px] font-extrabold">
                {unassignedCount}
              </span>
            )}
          </button>

          {/* Add Member Button */}
          <button
            onClick={handleOpenAdd}
            type="button"
            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t('addResident')}</span>
          </button>
        </div>
      </div>

      {/* Unassigned Category Alert Banner */}
      {unassignedCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>{isMr ? 'महत्त्वाची नोंद:' : 'Notice:'} </strong>
              <span>
                {isMr
                  ? `${unassignedCount} सभासदांची देखभाल श्रेणी अद्याप निश्चित केलेली नाही. श्रेणी निश्चित होईपर्यंत त्यांची देयके तयार होणार नाहीत.`
                  : `${unassignedCount} residents do not have an assigned category. They are excluded from billing until classified.`}
              </span>
            </div>
          </div>
          <button
            onClick={handleOpenCategoryBatch}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center justify-center"
          >
            {isMr ? 'आताच श्रेणी निश्चित करा' : 'Assign Categories Now'}
          </button>
        </div>
      )}

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 flex-1 sm:flex-none"
          >
            <option value="ALL">{isMr ? 'सर्व श्रेणी (All Categories)' : 'All Categories'}</option>
            <option value="RESIDENTIAL">{isMr ? 'निवासी (₹१,०००)' : 'Residential (₹1,000)'}</option>
            <option value="SHOP">{isMr ? 'दुकान (₹३००)' : 'Shop (₹300)'}</option>
            <option value="CHAIRMAN">{isMr ? 'चेअरमन (₹५००)' : 'Chairman (₹500)'}</option>
            <option value="UNASSIGNED">{isMr ? 'श्रेणी अपूर्ण' : 'Category Unassigned'}</option>
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                type="button"
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === statusKey
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {statusKey === 'ALL'
                  ? t('filterAll')
                  : statusKey === 'ACTIVE'
                  ? t('filterActive')
                  : t('filterInactive')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Residents Table & Mobile Card View */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">{isMr ? 'माहिती लोड होत आहे...' : 'Loading resident roster...'}</p>
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">{t('emptyResidents')}</h3>
          <p className="text-xs text-slate-400">
            {isMr ? 'शोध निकषांशी जुळणारे कोणतेही सभासद आढळले नाहीत.' : 'No residents match your filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Mobile Card Feed View (< md screens) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredResidents.map((r, index) => (
              <div key={r._id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 font-bold shrink-0">#{index + 1}</span>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{r.fullNameMarathi}</h3>
                    </div>
                    {r.customMaintenanceAmount != null && (
                      <div className="mt-1">
                        <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-semibold">
                          {isMr ? 'विशेष दर:' : 'Override:'} ₹{r.customMaintenanceAmount}
                        </span>
                      </div>
                    )}
                  </div>
                  {r.flatNumber ? (
                    <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/70 text-xs shrink-0">
                      {r.flatNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded shrink-0">
                      {t('notAvailable')}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <div>{getCategoryBadge(r.maintenanceCategory)}</div>
                  {r.propertyType === 'SHOP' ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-purple-700 text-[11px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      <Store className="w-3 h-3 text-purple-600" />
                      <span>{t('propShop')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Home className="w-3 h-3 text-slate-500" />
                      <span>{t('propResidential')}</span>
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {r.status === 'ACTIVE' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-500" />
                    )}
                    <span>
                      {r.status === 'ACTIVE'
                        ? t('statusActive')
                        : t('statusInactive')}
                    </span>
                  </span>
                </div>

                {r.mobileNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${r.mobileNumber}`} className="text-orange-600 font-semibold hover:underline">
                      {r.mobileNumber}
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenView(r)}
                    type="button"
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>{t('btnView')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(r)}
                    type="button"
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-700 text-xs font-semibold transition-colors border border-orange-200/60"
                  >
                    <Edit2 className="w-4 h-4 text-orange-600" />
                    <span>{t('btnEdit')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenStatusConfirm(r)}
                    type="button"
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors ${
                      r.status === 'ACTIVE'
                        ? 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border border-red-200/60'
                        : 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-600 border border-emerald-200/60'
                    }`}
                    title={r.status === 'ACTIVE' ? t('btnDeactivate') : t('btnActivate')}
                    aria-label={r.status === 'ACTIVE' ? t('btnDeactivate') : t('btnActivate')}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">{t('colSrNo')}</th>
                  <th className="py-3 px-4">{t('colName')}</th>
                  <th className="py-3 px-4">{t('colFlat')}</th>
                  <th className="py-3 px-4">{t('colPropertyType')}</th>
                  <th className="py-3 px-4">{t('colCategory')}</th>
                  <th className="py-3 px-4">{t('colContact')}</th>
                  <th className="py-3 px-4 text-center">{t('colStatus')}</th>
                  <th className="py-3 px-4 text-right">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidents.map((r, index) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {r.fullNameMarathi}
                      </div>
                      {r.customMaintenanceAmount != null && (
                        <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {isMr ? 'विशेष दर:' : 'Override:'} ₹{r.customMaintenanceAmount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.flatNumber ? (
                        <span className="font-mono font-semibold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200/70 text-xs">
                          {r.flatNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {t('notAvailable')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.propertyType === 'SHOP' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-700 text-xs">
                          <Store className="w-3.5 h-3.5 text-purple-600" />
                          <span>{t('propShop')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 text-xs">
                          <Home className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('propResidential')}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getCategoryBadge(r.maintenanceCategory)}
                    </td>
                    <td className="py-3 px-4">
                      {r.mobileNumber ? (
                        <span className="font-mono text-slate-700">{r.mobileNumber}</span>
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
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {r.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-500" />
                        )}
                        <span>
                          {r.status === 'ACTIVE'
                            ? t('statusActive')
                            : t('statusInactive')}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(r)}
                          type="button"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title={t('btnView')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          type="button"
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors cursor-pointer"
                          title={t('btnEdit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusConfirm(r)}
                          type="button"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            r.status === 'ACTIVE'
                              ? 'bg-red-50 hover:bg-red-100 text-red-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                          }`}
                          title={
                            r.status === 'ACTIVE'
                              ? t('btnDeactivate')
                              : t('btnActivate')
                          }
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

      {/* ========================================================================= */}
      {/* MODAL: CATEGORY ASSIGNMENT BATCH REVIEW SCREEN                            */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {t('categoryAssignmentTitle')}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {t('categoryAssignmentSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Presets Bar */}
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2.5 my-3 shrink-0">
              <span className="text-amber-900 font-medium">
                {isMr
                  ? 'सोसायटी मानक: निवासी सदनिका (₹१,०००), दुकान (₹३००), चेअरमन (₹५००).'
                  : 'Standards: Residential (₹1,000), Shop (₹300), Chairman (₹500).'}
              </span>
              <button
                type="button"
                onClick={applySmartCategoryPresets}
                className="min-h-[40px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              >
                {isMr ? '⚡ सदनिका / दुकान स्मार्ट वर्गीकरण भरा' : '⚡ Auto-Detect by Flat/Shop'}
              </button>
            </div>

            {batchError && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{batchError}</span>
              </div>
            )}
            {batchSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{batchSuccess}</span>
              </div>
            )}

            {/* Batch Table */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">{t('colName')}</th>
                    <th className="p-2.5">{t('colFlat')}</th>
                    <th className="p-2.5">{t('colPropertyType')}</th>
                    <th className="p-2.5">{t('colCategory')}</th>
                    <th className="p-2.5">{t('customAmountLabel')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchAssignments.map((item, idx) => (
                    <tr key={item.residentId} className="hover:bg-slate-50/60">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{item.fullNameMarathi}</td>
                      <td className="p-2.5 font-mono text-slate-700 font-semibold">{item.flatNumber || '-'}</td>
                      <td className="p-2.5">
                        <select
                          value={item.propertyType}
                          onChange={(e) => handleBatchItemChange(idx, 'propertyType', e.target.value)}
                          className="min-h-[38px] px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="RESIDENTIAL_FLAT">{t('propResidential')}</option>
                          <option value="SHOP">{t('propShop')}</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.maintenanceCategory}
                          onChange={(e) => handleBatchItemChange(idx, 'maintenanceCategory', e.target.value)}
                          className={`min-h-[38px] px-2 py-1.5 font-semibold rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                            item.maintenanceCategory === 'RESIDENTIAL'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : item.maintenanceCategory === 'SHOP'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : item.maintenanceCategory === 'CHAIRMAN'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="RESIDENTIAL">{t('catResidential')}</option>
                          <option value="SHOP">{t('catShop')}</option>
                          <option value="CHAIRMAN">{t('catChairman')}</option>
                          <option value="UNASSIGNED">{t('catUnassigned')}</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder={isMr ? 'उदा. ५००' : 'Optional override'}
                          value={item.customMaintenanceAmount}
                          onChange={(e) => handleBatchItemChange(idx, 'customMaintenanceAmount', e.target.value)}
                          className="min-h-[38px] w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 sm:pt-4 border-t border-slate-200 mt-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveBatchCategories}
                disabled={savingBatch}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('savingCategories')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('btnSaveAllCategories')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD RESIDENT                                                     */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 relative my-auto overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {t('modalAddTitle')}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {isMr ? 'नवीन सभासदाची मूलभूत माहिती प्रविष्ट करा.' : 'Enter basic details for the new resident.'}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldFullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullNameMarathi}
                  onChange={(e) =>
                    setFormData({ ...formData, fullNameMarathi: e.target.value })
                  }
                  placeholder={isMr ? 'उदा. श्री विलास शिरसाठ' : 'e.g. Shri Vilas Shirsath'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldFlatNo')}
                  </label>
                  <input
                    type="text"
                    value={formData.flatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, flatNumber: e.target.value })
                    }
                    placeholder={isMr ? 'उदा. १०१ किंवा Shop No - 1' : 'e.g. 101 or Shop No - 1'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldWing')}
                  </label>
                  <input
                    type="text"
                    value={formData.wing}
                    onChange={(e) =>
                      setFormData({ ...formData, wing: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Property Type & Maintenance Category */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('colPropertyType')} *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => {
                      const pType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        propertyType: pType,
                        maintenanceCategory: pType === 'SHOP' ? 'SHOP' : prev.maintenanceCategory === 'SHOP' ? 'RESIDENTIAL' : prev.maintenanceCategory
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="RESIDENTIAL_FLAT">{t('propResidential')}</option>
                    <option value="SHOP">{t('propShop')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('colCategory')} *
                  </label>
                  <select
                    value={formData.maintenanceCategory}
                    onChange={(e) => setFormData({ ...formData, maintenanceCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="RESIDENTIAL">{t('catResidential')}</option>
                    <option value="SHOP">{t('catShop')}</option>
                    <option value="CHAIRMAN">{t('catChairman')}</option>
                    <option value="UNASSIGNED">{t('catUnassigned')}</option>
                  </select>
                </div>
              </div>

              {/* Custom Maintenance Override */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('customAmountLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.customMaintenanceAmount}
                    onChange={(e) => setFormData({ ...formData, customMaintenanceAmount: e.target.value })}
                    placeholder={isMr ? 'रिक्त ठेवल्यास श्रेणीचा मूळ दर लागू होईल' : 'Blank uses category rate'}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{t('customAmountHint')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldMobile')}
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldEmail')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="example@mail.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldAddress')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={isMr ? 'पर्यायी पत्ता...' : 'Permanent address...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldNotes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={isMr ? 'प्रशासकीय शेरा किंवा नोंदी...' : 'Administrative notes or remarks...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 font-semibold cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formSubmitting ? t('btnSaving') : t('btnSave')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT RESIDENT                                                    */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 relative my-auto overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {t('modalEditTitle')}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {isMr ? 'सभासदाची माहिती अद्यतनित करा.' : 'Update resident profile details.'}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldFullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullNameMarathi}
                  onChange={(e) =>
                    setFormData({ ...formData, fullNameMarathi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldFlatNo')}
                  </label>
                  <input
                    type="text"
                    value={formData.flatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, flatNumber: e.target.value })
                    }
                    placeholder={isMr ? 'उदा. १०१' : 'e.g. 101'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldWing')}
                  </label>
                  <input
                    type="text"
                    value={formData.wing}
                    onChange={(e) =>
                      setFormData({ ...formData, wing: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Property Type & Maintenance Category */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('colPropertyType')} *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => {
                      const pType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        propertyType: pType,
                        maintenanceCategory: pType === 'SHOP' ? 'SHOP' : prev.maintenanceCategory === 'SHOP' ? 'RESIDENTIAL' : prev.maintenanceCategory
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="RESIDENTIAL_FLAT">{t('propResidential')}</option>
                    <option value="SHOP">{t('propShop')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('colCategory')} *
                  </label>
                  <select
                    value={formData.maintenanceCategory}
                    onChange={(e) => setFormData({ ...formData, maintenanceCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="RESIDENTIAL">{t('catResidential')}</option>
                    <option value="SHOP">{t('catShop')}</option>
                    <option value="CHAIRMAN">{t('catChairman')}</option>
                    <option value="UNASSIGNED">{t('catUnassigned')}</option>
                  </select>
                </div>
              </div>

              {/* Custom Maintenance Override */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('customAmountLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.customMaintenanceAmount}
                    onChange={(e) => setFormData({ ...formData, customMaintenanceAmount: e.target.value })}
                    placeholder={isMr ? 'रिक्त ठेवल्यास श्रेणीचा मूळ दर लागू होईल' : 'Blank uses category rate'}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{t('customAmountHint')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldMobile')}
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {t('fieldEmail')}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="example@mail.com"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldAddress')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('fieldNotes')}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 font-semibold cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formSubmitting ? t('btnSaving') : t('btnSave')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW RESIDENT DETAILS                                            */}
      {/* ========================================================================= */}
      {isViewModalOpen && selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 relative my-auto overflow-hidden">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 pr-8">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {selectedResident.fullNameMarathi}
                </h3>
                <p className="text-xs text-orange-600 font-medium truncate">
                  {selectedResident.wing || 'A Wing'} • {selectedResident.flatNumber ? `सदनिका / Shop: ${selectedResident.flatNumber}` : (isMr ? 'सदनिका प्रलंबित' : 'Flat unassigned')}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4 overflow-y-auto flex-1">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colPropertyType')}</span>
                <span className="font-semibold text-slate-800">
                  {selectedResident.propertyType === 'SHOP' ? t('propShop') : t('propResidential')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 items-center">
                <span className="text-slate-500">{t('colCategory')}</span>
                <div>{getCategoryBadge(selectedResident.maintenanceCategory)}</div>
              </div>
              {selectedResident.customMaintenanceAmount != null && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{t('customAmountLabel')}</span>
                  <span className="font-mono font-bold text-orange-600">
                    ₹{selectedResident.customMaintenanceAmount}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('fieldMobile')}</span>
                <span className="font-mono text-slate-800">{selectedResident.mobileNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('fieldEmail')}</span>
                <span className="text-slate-800">{selectedResident.email || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colStatus')}</span>
                <span className={selectedResident.status === 'ACTIVE' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                  {selectedResident.status === 'ACTIVE' ? t('statusActive') : t('statusInactive')}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block mb-0.5">{t('fieldNotes')}</span>
                <p className="text-slate-700 italic">{selectedResident.notes || (isMr ? 'नोंद नाही.' : 'No notes.')}</p>
              </div>
            </div>

            <div className="flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold"
              >
                {t('btnCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM STATUS TOGGLE                                            */}
      {/* ========================================================================= */}
      {isStatusConfirmOpen && selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
              selectedResident.status === 'ACTIVE' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Power className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              {selectedResident.status === 'ACTIVE'
                ? t('confirmDeactivate')
                : t('confirmActivate')}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              <strong>{selectedResident.fullNameMarathi}</strong> ({selectedResident.flatNumber || 'Flat N/A'})
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsStatusConfirmOpen(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 text-xs font-semibold"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs ${
                  selectedResident.status === 'ACTIVE'
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                }`}
              >
                {selectedResident.status === 'ACTIVE'
                  ? t('btnDeactivate')
                  : t('btnActivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentList;
