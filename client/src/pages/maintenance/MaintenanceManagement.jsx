import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Calendar,
  Layers,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  IndianRupee,
  Loader2,
  Eye,
  Check,
  X,
  Home,
  Store,
  ShieldCheck,
  AlertTriangle,
  Tag,
  Building2,
  CheckSquare,
  Square,
  MinusCircle,
  Filter,
  Info,
  SlidersHorizontal,
  PlusCircle,
  Receipt
} from 'lucide-react';
import ReceiptModal from '../payments/ReceiptModal';

const MONTH_NAMES_MR = [
  'जानेवारी',
  'फेब्रुवारी',
  'मार्च',
  'एप्रिल',
  'मे',
  'जून',
  'जुलै',
  'ऑगस्ट',
  'सप्टेंबर',
  'ऑक्टोबर',
  'नोव्हेंबर',
  'डिसेंबर'
];

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const MaintenanceManagement = () => {
  const { t, lang } = useLanguage();
  const isMr = lang === 'mr';

  // Active Tab: 'dues', 'generate', 'config'
  const [activeTab, setActiveTab] = useState('dues');

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalBilledAmount: 0,
    totalOutstandingAmount: 0,
    unpaidCount: 0,
    partialCount: 0,
    paidCount: 0,
    totalBillsCount: 0
  });

  // Dues Listing & Filter State
  const [dues, setDues] = useState([]);
  const [loadingDues, setLoadingDues] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate Dues Workflow State
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectiveList, setSelectiveList] = useState([]);
  const [genSearch, setGenSearch] = useState('');
  const [genCategoryFilter, setGenCategoryFilter] = useState('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Category-Wise Configuration Form State
  const [configForm, setConfigForm] = useState({
    categoryRates: {
      residential: 1000,
      shop: 300,
      chairman: 500
    },
    dueDayOfMonth: 10,
    lateFeeEnabled: false,
    lateFeeAmount: 0,
    autoApplyAdvance: false
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [isRateConfirmOpen, setIsRateConfirmOpen] = useState(false);

  // Apply Advance Modal State
  const [applyAdvanceModalOpen, setApplyAdvanceModalOpen] = useState(false);
  const [targetDueForAdvance, setTargetDueForAdvance] = useState(null);
  const [advanceApplyAmount, setAdvanceApplyAmount] = useState('');
  const [advanceResidentProfile, setAdvanceResidentProfile] = useState(null);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Details Modal State
  const [selectedDue, setSelectedDue] = useState(null);

  // View Receipt Modal State
  const [receiptModalPayment, setReceiptModalPayment] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const handleOpenReceiptForDue = async (due) => {
    try {
      const res = await api.get(`/payments/due/${due._id}/receipt`);
      if (res.data?.success && res.data.payment) {
        setReceiptModalPayment(res.data.payment);
        setReceiptModalOpen(true);
        return;
      }
    } catch (err) {
      console.warn('Could not fetch due receipt from endpoint, synthesizing from due:', err.message);
    }
    // Fallback synthesis
    const primaryAdv = due.advanceAdjustmentDetails?.[0];
    const isFullyAdv = Boolean(due.advanceAdjustedAmount > 0 && (!due.amountPaid || due.amountPaid === 0));
    setReceiptModalPayment({
      _id: due._id,
      receiptNumber: primaryAdv?.receiptNumber ? `${primaryAdv.receiptNumber}-ADJ` : `SCA-${due.year}${String(due.month).padStart(2, '0')}-ADV`,
      residentNameMarathi: due.residentNameSnapshot,
      flatNumber: due.flatNumberSnapshot || '',
      wing: due.wing || 'A Wing',
      month: due.month,
      year: due.year,
      totalAmountDue: due.totalAmountDue,
      previousAmountPaid: 0,
      amountReceived: due.amountPaid || 0,
      advanceAdjustedAmount: due.advanceAdjustedAmount || 0,
      advanceAdjustmentDetails: due.advanceAdjustmentDetails || [],
      remainingBalance: due.outstandingBalance || 0,
      paymentDate: primaryAdv?.adjustedAt || due.updatedAt || new Date(),
      paymentMethod: isFullyAdv ? 'CASH' : 'UPI',
      status: 'COMPLETED',
      isFullyAdvanceSettled: isFullyAdv,
      remarks: isFullyAdv ? 'Paid Through Advance Adjustment (अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा)' : ''
    });
    setReceiptModalOpen(true);
  };

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/maintenance/summary');
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, []);

  // 2. Fetch Dues
  const fetchDues = useCallback(async () => {
    setLoadingDues(true);
    setErrorMessage('');
    try {
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/maintenance/dues', { params });
      if (res.data.success) {
        setDues(res.data.dues || []);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || (isMr ? 'देयक यादी आणताना त्रुटी आली.' : 'Failed to fetch maintenance bills.')
      );
    } finally {
      setLoadingDues(false);
    }
  }, [filterMonth, filterYear, filterStatus, searchQuery, isMr]);

  // 3. Fetch Config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/maintenance/config');
      if (res.data.success && res.data.config) {
        const catRates = res.data.config.categoryRates || {
          residential: res.data.config.defaultMonthlyAmount || 1000,
          shop: 300,
          chairman: 500
        };
        setConfigForm({
          categoryRates: {
            residential: Number(catRates.residential ?? 1000),
            shop: Number(catRates.shop ?? 300),
            chairman: Number(catRates.chairman ?? 500)
          },
          dueDayOfMonth: res.data.config.dueDay || 10,
          lateFeeEnabled: Boolean(res.data.config.lateFeeEnabled),
          lateFeeAmount: Number(res.data.config.lateFeeAmount || 0),
          autoApplyAdvance: Boolean(res.data.config.autoApplyAdvance)
        });
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchConfig();
  }, [fetchSummary, fetchConfig]);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  // Prompt confirmation modal before saving config
  const handleOpenRateConfirm = (e) => {
    e.preventDefault();
    setIsRateConfirmOpen(true);
  };

  // Execute Save Configuration
  const handleSaveConfig = async () => {
    setIsRateConfirmOpen(false);
    setSavingConfig(true);
    setErrorMessage('');
    try {
      const res = await api.put('/maintenance/config', {
        categoryRates: {
          residential: Number(configForm.categoryRates.residential),
          shop: Number(configForm.categoryRates.shop),
          chairman: Number(configForm.categoryRates.chairman)
        },
        dueDay: Number(configForm.dueDayOfMonth),
        lateFeeEnabled: Boolean(configForm.lateFeeEnabled),
        lateFeeAmount: Number(configForm.lateFeeAmount),
        autoApplyAdvance: Boolean(configForm.autoApplyAdvance)
      });
      if (res.data.success) {
        setSuccessMessage(
          isMr
            ? 'श्रेणीनिहाय देखभाल दर यशस्वीरीत्या जतन केले!'
            : 'Category-wise maintenance rates saved successfully!'
        );
        fetchConfig();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || (isMr ? 'सेटिंग्ज जतन करताना त्रुटी आली.' : 'Failed to save configuration.')
      );
    } finally {
      setSavingConfig(false);
    }
  };

  // Open Apply Advance Modal
  const handleOpenApplyAdvance = async (due) => {
    setTargetDueForAdvance(due);
    setApplyAdvanceModalOpen(true);
    setAdvanceApplyAmount('');
    setAdvanceResidentProfile(null);
    setAdvanceLoading(true);
    try {
      const resId = due.residentId?._id || due.residentId;
      const res = await api.get(`/payments/advance/resident/${resId}`);
      if (res.data?.success) {
        setAdvanceResidentProfile(res.data);
        const avail = res.data.advanceBalance || 0;
        const needed = due.outstandingBalance || 0;
        setAdvanceApplyAmount(String(Math.min(avail, needed)));
      }
    } catch (err) {
      console.error('Failed to fetch resident advance balance:', err);
    } finally {
      setAdvanceLoading(false);
    }
  };

  // Confirm Apply Advance
  const handleConfirmApplyAdvance = async () => {
    if (!targetDueForAdvance) return;
    const amt = Number(advanceApplyAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage(isMr ? 'कृपया वैध रक्कम प्रविष्ट करा' : 'Please enter valid amount');
      return;
    }
    const avail = advanceResidentProfile?.advanceBalance || 0;
    if (amt > avail) {
      setErrorMessage(isMr ? `अ‍ॅडव्हान्स शिल्लक (₹${avail}) पेक्षा जास्त रक्कम वापरता येत नाही` : `Amount exceeds available advance (₹${avail})`);
      return;
    }
    if (amt > targetDueForAdvance.outstandingBalance) {
      setErrorMessage(isMr ? `देयकातील शिल्लक थकबाकी (₹${targetDueForAdvance.outstandingBalance}) पेक्षा जास्त रक्कम लागू करता येत नाही` : `Amount exceeds outstanding balance`);
      return;
    }

    try {
      setAdvanceSubmitting(true);
      const res = await api.post('/payments/advance/apply', {
        maintenanceDueId: targetDueForAdvance._id,
        amountToApply: amt
      });
      if (res.data?.success) {
        setSuccessMessage(res.data.message || (isMr ? 'अ‍ॅडव्हान्स रक्कम यशस्वीरीत्या लागू केली!' : 'Advance applied successfully!'));
        setApplyAdvanceModalOpen(false);
        setTargetDueForAdvance(null);
        fetchDues();
        fetchSummary();
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || (isMr ? 'अ‍ॅडव्हान्स लागू करताना त्रुटी आली' : 'Failed to apply advance'));
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  // Handle Preview Dues Generation
  const handleFetchPreview = async () => {
    setPreviewLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/maintenance/preview', {
        params: { month: genMonth, year: genYear }
      });
      if (res.data.success) {
        setPreviewData(res.data.preview);
        const mappedList = (res.data.preview?.previewList || []).map(p => {
          const isStandardEligible = p.billingStatus === 'ELIGIBLE';
          const isUnassignedCustom = p.billingStatus === 'CUSTOM_RATE_ELIGIBLE' || p.isUnassignedCustomEligible;
          return {
            residentId: p.residentId,
            fullNameMarathi: p.fullNameMarathi,
            flatNumber: p.flatNumber || '',
            wing: p.wing || 'A Wing',
            propertyType: p.propertyType,
            maintenanceCategory: p.maintenanceCategory,
            defaultCategoryRate: p.defaultCategoryRate,
            customMasterRate: p.customMasterRate,
            hasCustomMasterRate: p.hasCustomMasterRate,
            baseApplicableRate: p.amountToBill,
            appliedAmount: p.amountToBill,
            selected: isStandardEligible,
            actionType: isStandardEligible ? 'FULL' : (isUnassignedCustom ? 'FULL' : 'SKIP'),
            overrideReason: '',
            alreadyBilled: p.alreadyBilled,
            isUnassigned: p.isUnassigned,
            isUnassignedCustomEligible: isUnassignedCustom,
            warning: p.warning,
            availableAdvanceBalance: p.availableAdvanceBalance || 0,
            billingStatus: p.billingStatus
          };
        });
        setSelectiveList(mappedList);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || (isMr ? 'पूर्वावलोकन आणताना त्रुटी आली.' : 'Failed to fetch generation preview.')
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Toggle selection for individual resident
  const handleToggleSelect = (residentId) => {
    setSelectiveList(prev => prev.map(item => {
      if (item.residentId === residentId) {
        if (item.alreadyBilled || (item.isUnassigned && !item.isUnassignedCustomEligible)) return item;
        const newSelected = !item.selected;
        return {
          ...item,
          selected: newSelected,
          actionType: newSelected
            ? (item.appliedAmount === 0 ? 'ZERO' : item.appliedAmount !== item.baseApplicableRate ? 'REDUCED' : 'FULL')
            : 'SKIP'
        };
      }
      return item;
    }));
  };

  // Select all eligible residents
  const handleSelectAll = () => {
    setSelectiveList(prev => prev.map(item => {
      if (item.alreadyBilled || item.isUnassigned) return item;
      return {
        ...item,
        selected: true,
        actionType: item.appliedAmount === 0 ? 'ZERO' : item.appliedAmount !== item.baseApplicableRate ? 'REDUCED' : 'FULL'
      };
    }));
  };

  // Deselect all eligible residents
  const handleDeselectAll = () => {
    setSelectiveList(prev => prev.map(item => {
      if (item.alreadyBilled) return item;
      return {
        ...item,
        selected: false,
        actionType: 'SKIP'
      };
    }));
  };

  // Change billing action type (FULL, REDUCED, ZERO, SKIP)
  const handleChangeActionType = (residentId, newAction) => {
    setSelectiveList(prev => prev.map(item => {
      if (item.residentId === residentId) {
        if (newAction === 'SKIP') {
          return { ...item, selected: false, actionType: 'SKIP' };
        }
        if (newAction === 'ZERO') {
          return { ...item, selected: true, actionType: 'ZERO', appliedAmount: 0 };
        }
        if (newAction === 'FULL') {
          return { ...item, selected: true, actionType: 'FULL', appliedAmount: item.baseApplicableRate };
        }
        if (newAction === 'REDUCED') {
          const initialReduced = item.appliedAmount === item.baseApplicableRate ? Math.max(0, item.baseApplicableRate - 100) : item.appliedAmount;
          return { ...item, selected: true, actionType: 'REDUCED', appliedAmount: initialReduced };
        }
      }
      return item;
    }));
  };

  // Change amount directly
  const handleChangeAmount = (residentId, newAmountStr) => {
    setSelectiveList(prev => prev.map(item => {
      if (item.residentId === residentId) {
        const val = newAmountStr === '' ? 0 : Math.max(0, Number(newAmountStr));
        let act = 'FULL';
        if (val === 0) act = 'ZERO';
        else if (val !== item.baseApplicableRate) act = 'REDUCED';
        return {
          ...item,
          appliedAmount: val,
          selected: true,
          actionType: act
        };
      }
      return item;
    }));
  };

  // Change reason
  const handleChangeReason = (residentId, reason) => {
    setSelectiveList(prev => prev.map(item => {
      if (item.residentId === residentId) {
        return { ...item, overrideReason: reason };
      }
      return item;
    }));
  };

  // Handle Generate Dues with Selective Payload
  const handleGenerateBills = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const billingPayload = selectiveList.map(item => ({
        residentId: item.residentId,
        selected: item.selected && !item.alreadyBilled && (!item.isUnassigned || item.isUnassignedCustomEligible),
        actionType: item.actionType,
        appliedAmount: item.appliedAmount,
        overrideReason: item.overrideReason
      }));

      const res = await api.post('/maintenance/generate', {
        month: genMonth,
        year: genYear,
        billingItems: billingPayload
      });
      if (res.data.success) {
        const sum = res.data.summary;
        setSuccessMessage(
          isMr
            ? `${genMonth}/${genYear} महिन्यासाठी ${sum.createdCount} देयके यशस्वीरीत्या तयार केली! (वगळलेले: ${sum.skippedCount || 0}, शून्य देयके: ${sum.zeroAmountCount || 0}, सवलत देयके: ${sum.reducedCount || 0})`
            : `Successfully generated ${sum.createdCount} dues for ${genMonth}/${genYear}! (Skipped: ${sum.skippedCount || 0}, Zero: ${sum.zeroAmountCount || 0}, Reduced: ${sum.reducedCount || 0})`
        );
        setIsConfirmModalOpen(false);
        setPreviewData(null);
        setSelectiveList([]);
        fetchSummary();
        fetchDues();
        setActiveTab('dues');
        setTimeout(() => setSuccessMessage(''), 6000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || (isMr ? 'देयके तयार करताना त्रुटी आली.' : 'Failed to generate bills.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const getMonthName = (monthNumber) => {
    const idx = Number(monthNumber) - 1;
    return isMr ? MONTH_NAMES_MR[idx] || monthNumber : MONTH_NAMES_EN[idx] || monthNumber;
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'RESIDENTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Home className="w-3 h-3 text-blue-500" />
            <span>{isMr ? 'निवासी (₹१,०००)' : 'Residential'}</span>
          </span>
        );
      case 'SHOP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Store className="w-3 h-3 text-purple-500" />
            <span>{isMr ? 'दुकान (₹३००)' : 'Shop'}</span>
          </span>
        );
      case 'CHAIRMAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>{isMr ? 'चेअरमन (₹५००)' : 'Chairman'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>{isMr ? 'श्रेणी अपूर्ण' : 'Unassigned'}</span>
          </span>
        );
    }
  };

  // Live computed metrics from selectiveList
  const eligibleItems = selectiveList.filter(i => !i.alreadyBilled && (!i.isUnassigned || i.isUnassignedCustomEligible));
  const selectedItems = eligibleItems.filter(i => i.selected && i.actionType !== 'SKIP');
  const fullRateItems = selectedItems.filter(i => (i.actionType === 'FULL' || (i.appliedAmount === i.baseApplicableRate && i.appliedAmount > 0)));
  const reducedRateItems = selectedItems.filter(i => i.actionType === 'REDUCED' || (i.appliedAmount !== i.baseApplicableRate && i.appliedAmount > 0));
  const zeroAmountItems = selectedItems.filter(i => i.actionType === 'ZERO' || i.appliedAmount === 0);
  const skippedItems = selectiveList.filter(i => (!i.selected || i.actionType === 'SKIP') && !i.alreadyBilled && (!i.isUnassigned || i.isUnassignedCustomEligible));
  const totalExpectedCollection = selectedItems.reduce((acc, curr) => acc + (curr.appliedAmount || 0), 0);

  // Missing reason check for overridden/skipped items
  const missingReasonItems = [
    ...reducedRateItems.filter(i => !i.overrideReason?.trim()),
    ...zeroAmountItems.filter(i => !i.overrideReason?.trim()),
    ...skippedItems.filter(i => !i.overrideReason?.trim())
  ];

  // Filtered view for the table
  const displayedSelectiveList = selectiveList.filter(item => {
    if (genSearch.trim()) {
      const q = genSearch.trim().toLowerCase();
      const matchName = item.fullNameMarathi?.toLowerCase().includes(q);
      const matchFlat = item.flatNumber?.toLowerCase().includes(q);
      if (!matchName && !matchFlat) return false;
    }
    if (genCategoryFilter !== 'ALL') {
      if (item.maintenanceCategory !== genCategoryFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t('maintenanceTitle')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {isMr ? 'श्रेणीनिहाय आकारणी इंजिन' : 'Category Billing Engine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('maintenanceSubtitle')}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('dues')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dues'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>{t('tabDues')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('generate');
              if (!previewData) handleFetchPreview();
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>{t('tabGenerate')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>{t('tabSettings')}</span>
          </button>
        </div>
      </div>

      {/* Global Toast Messages */}
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

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>{t('totalBilledLabel')}</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            ₹ {(summary.totalBilledAmount ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isMr
              ? `एकूण ${summary.totalBillsCount ?? 0} देयकांची आकारणी`
              : `${summary.totalBillsCount ?? 0} total bills generated`}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-700 font-medium mb-1">
            <span>{t('totalOutstandingLabel')}</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600 font-mono">
            ₹ {(summary.totalOutstandingAmount ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isMr ? 'थकीत येणे रक्कम' : 'Total balance pending'}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium mb-1">
            <span>{isMr ? 'श्रेणी दर संरचना' : 'Category Rates'}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-800 space-y-0.5 mt-1 font-mono">
            <div>{isMr ? 'निवासी' : 'Residential'}: ₹{configForm?.categoryRates?.residential ?? 1000}</div>
            <div>{isMr ? 'दुकान' : 'Shop'}: ₹{configForm?.categoryRates?.shop ?? 300} • {isMr ? 'चेअरमन' : 'Chairman'}: ₹{configForm?.categoryRates?.chairman ?? 500}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DUES LISTING                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'dues' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="">{t('allMonths')}</option>
                {MONTH_NAMES_MR.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {isMr ? m : MONTH_NAMES_EN[idx]}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="ALL">{t('filterAll')}</option>
                <option value="UNPAID">{t('statusUnpaid')}</option>
                <option value="PARTIAL">{t('statusPartial')}</option>
                <option value="PAID">{t('statusPaid')}</option>
              </select>
            </div>
          </div>

          {/* Dues Cards (Mobile) & Table (Desktop) */}
          {loadingDues ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">{isMr ? 'देयके लोड होत आहेत...' : 'Loading dues...'}</p>
            </div>
          ) : dues.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">{t('emptyDues')}</h3>
              <p className="text-xs text-slate-400">
                {isMr ? 'निवडलेल्या निकषांशी जुळणारे कोणतेही देयक आढळले नाही.' : 'No maintenance dues found.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Mobile Card Feed View (< md screens) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {dues.map((d, index) => (
                  <div key={d._id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 font-bold shrink-0">#{index + 1}</span>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{d.residentNameSnapshot}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-semibold">
                          <span>{getMonthName(d.month)} {d.year}</span>
                        </div>
                      </div>
                      {d.flatNumberSnapshot ? (
                        <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/70 text-xs shrink-0">
                          {d.flatNumberSnapshot}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded shrink-0">-</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <div>{getCategoryBadge(d.maintenanceCategorySnapshot || (d.flatNumberSnapshot?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL'))}</div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          d.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : d.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {d.status === 'PAID'
                          ? t('statusPaid')
                          : d.status === 'PARTIAL'
                          ? t('statusPartial')
                          : t('statusUnpaid')}
                      </span>
                    </div>

                    {/* Financial Numbers Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500">{t('colDueAmount')}</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          ₹{(d.totalAmountDue ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">{t('colPaidAmount')}</div>
                        <div className="font-mono font-bold text-emerald-600 mt-0.5">
                          ₹{(d.amountPaid ?? 0).toLocaleString('en-IN')}
                        </div>
                        {(d.advanceAdjustedAmount ?? 0) > 0 && (
                          <div className="text-[9px] text-orange-700 font-sans">
                            (₹{(d.advanceAdjustedAmount ?? 0).toLocaleString('en-IN')} {isMr ? 'अ‍ॅडव्हान्स' : 'Adv'})
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">{t('colOutstanding')}</div>
                        <div className="font-mono font-bold text-red-600 mt-0.5">
                          ₹{(d.outstandingBalance ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      {d.outstandingBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenApplyAdvance(d)}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-700 border border-orange-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>{isMr ? 'अ‍ॅडव्हान्स वापरा' : 'Apply Advance'}</span>
                        </button>
                      )}
                      {d.status === 'PAID' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReceiptForDue(d)}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{isMr ? 'पावती पहा' : 'View Receipt'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedDue(d)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{t('btnView')}</span>
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
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">{t('colName')}</th>
                      <th className="py-3 px-4">{t('colFlat')}</th>
                      <th className="py-3 px-4">{t('colCategory')}</th>
                      <th className="py-3 px-4">{t('colPeriod')}</th>
                      <th className="py-3 px-4 text-right">{t('colDueAmount')}</th>
                      <th className="py-3 px-4 text-right">{t('colPaidAmount')}</th>
                      <th className="py-3 px-4 text-right">{t('colOutstanding')}</th>
                      <th className="py-3 px-4 text-center">{t('colStatus')}</th>
                      <th className="py-3 px-4 text-right">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dues.map((d, index) => (
                      <tr key={d._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {d.residentNameSnapshot}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-[11px] border border-orange-200/70">
                            {d.flatNumberSnapshot || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getCategoryBadge(d.maintenanceCategorySnapshot || (d.flatNumberSnapshot?.toLowerCase().includes('shop') ? 'SHOP' : 'RESIDENTIAL'))}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {getMonthName(d.month)} {d.year}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹ {(d.totalAmountDue ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="font-bold text-emerald-600">
                            ₹ {(d.amountPaid ?? 0).toLocaleString('en-IN')}
                          </div>
                          {(d.advanceAdjustedAmount ?? 0) > 0 && (
                            <div className="text-[10px] text-orange-700 font-sans">
                              (₹{(d.advanceAdjustedAmount ?? 0).toLocaleString('en-IN')} {isMr ? 'अ‍ॅडव्हान्स' : 'Adv'})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                          ₹ {(d.outstandingBalance ?? 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              d.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : d.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {d.status === 'PAID'
                              ? t('statusPaid')
                              : d.status === 'PARTIAL'
                              ? t('statusPartial')
                              : t('statusUnpaid')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {d.outstandingBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenApplyAdvance(d)}
                                className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                title={isMr ? 'अ‍ॅडव्हान्स शिल्लक वापरा' : 'Apply Advance'}
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-orange-600" />
                                <span className="hidden sm:inline">{isMr ? 'अ‍ॅडव्हान्स वापरा' : 'Apply Advance'}</span>
                              </button>
                            )}
                            {d.status === 'PAID' && (
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptForDue(d)}
                                className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors cursor-pointer"
                                title={isMr ? 'पावती पहा / प्रिंट करा' : 'View / Print Receipt'}
                              >
                                <Receipt className="w-3.5 h-3.5 text-orange-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedDue(d)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                              title={t('btnView')}
                            >
                              <Eye className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERATE MONTHLY DUES (WITH CATEGORY PREVIEW & SUMMARY)            */}
      {/* ========================================================================= */}
      {activeTab === 'generate' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <span>{t('generateCardTitle')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isMr
                  ? 'सक्रिय सभासदांसाठी त्यांची श्रेणी (निवासी/दुकान/चेअरमन) तपासून देयके तयार करा.'
                  : 'Generate monthly bills for active residents based on their assigned category rates.'}
              </p>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('selectMonthLabel')}
              </label>
              <select
                value={genMonth}
                onChange={(e) => setGenMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {MONTH_NAMES_MR.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1}. {isMr ? m : MONTH_NAMES_EN[idx]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('selectYearLabel')}
              </label>
              <select
                value={genYear}
                onChange={(e) => setGenYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={previewLoading}
                className="w-full py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {previewLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{t('previewBtn')}</span>
              </button>
            </div>
          </div>

          {/* Preview Results Showcase & Selective Generation Interface */}
          {previewData && (
            <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {isMr ? 'मासिक निवडक देयक निर्मिती:' : 'Monthly Selective Bill Generation:'} {getMonthName(previewData.month)} {previewData.year}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMr
                      ? 'प्रत्येक सभासदाची निवड, या महिन्याची रक्कम (सवलत/शून्य/पूर्ण) आणि वगळण्याचे पर्याय तपासून देयके तयार करा.'
                      : 'Review resident selection, monthly amount overrides (reduced/zero/full), and skip options before confirming.'}
                  </p>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {isMr ? 'निवासी' : 'Residential'}: ₹{previewData.categoryRates?.residential}
                  </span>
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {isMr ? 'दुकान' : 'Shop'}: ₹{previewData.categoryRates?.shop}
                  </span>
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    {isMr ? 'चेअरमन' : 'Chairman'}: ₹{previewData.categoryRates?.chairman}
                  </span>
                </div>
              </div>

              {/* Unassigned Warning Alert Banner */}
              {previewData.unassignedCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>{isMr ? 'महत्त्वाची सूचना:' : 'Notice:'} </strong>
                    <span>
                      {isMr
                        ? `${previewData.unassignedCount} सभासदांची देखभाल श्रेणी निश्चित केलेली नाही. ते देयकांमधून वगळण्यात आले आहेत. कृपया 'सभासद नोंदवही' मधून त्यांची श्रेणी निश्चित करा.`
                        : `${previewData.unassignedCount} residents have no assigned category and are excluded from billing. Please assign their category first.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time 6 KPI Cards computed dynamically from selectiveList */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-slate-600 text-[10px] font-semibold">{t('selectedForBillingLabel')}</div>
                  <div className="text-base font-bold text-slate-900 mt-1">
                    {selectedItems.length} / {eligibleItems.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{isMr ? 'पात्र निवडलेले' : 'Eligible Selected'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                  <div className="text-blue-700 text-[10px] font-semibold">{t('fullRateBillsLabel')}</div>
                  <div className="text-base font-bold text-blue-700 mt-1">{fullRateItems.length}</div>
                  <div className="text-[10px] text-blue-500 mt-0.5">{isMr ? 'पूर्ण दर' : 'Standard Rate'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs">
                  <div className="text-amber-800 text-[10px] font-semibold">{t('reducedRateBillsLabel')}</div>
                  <div className="text-base font-bold text-amber-700 mt-1">{reducedRateItems.length}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">{isMr ? 'सवलत देयके' : 'Overrides'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs">
                  <div className="text-indigo-700 text-[10px] font-semibold">{t('zeroAmountBillsLabel')}</div>
                  <div className="text-base font-bold text-indigo-700 mt-1">{zeroAmountItems.length}</div>
                  <div className="text-[10px] text-indigo-500 mt-0.5">{isMr ? 'भरलेली दर्शवली जाईल' : 'Marked Paid'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
                  <div className="text-rose-700 text-[10px] font-semibold">{t('skippedResidentsLabel')}</div>
                  <div className="text-base font-bold text-rose-700 mt-1">{skippedItems.length}</div>
                  <div className="text-[10px] text-rose-500 mt-0.5">{isMr ? 'देयक तयार होणार नाही' : 'No Bill Created'}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs bg-gradient-to-br from-orange-50/50 to-white">
                  <div className="text-orange-700 text-[10px] font-semibold">{t('totalExpectedCollectionLabel')}</div>
                  <div className="text-base font-bold text-orange-600 font-mono mt-1">
                    ₹ {totalExpectedCollection.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-orange-600 font-semibold mt-0.5">{isMr ? 'अपेक्षित जमा' : 'Expected Total'}</div>
                </div>
              </div>

              {/* Action Toolbar: Select All / Deselect All / Search / Category Filter */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('selectAll')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('deselectAll')}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={genSearch}
                      onChange={(e) => setGenSearch(e.target.value)}
                      placeholder={isMr ? 'नाव किंवा सदनिका/दुकान क्र. शोधा...' : 'Search member or flat/shop...'}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <select
                    value={genCategoryFilter}
                    onChange={(e) => setGenCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="ALL">{t('filterAllCategories')}</option>
                    <option value="RESIDENTIAL">{t('filterResidential')}</option>
                    <option value="SHOP">{t('filterShop')}</option>
                    <option value="CHAIRMAN">{t('filterChairman')}</option>
                    <option value="UNASSIGNED">{t('filterUnassigned')}</option>
                  </select>
                </div>
              </div>

              {/* Unassigned with Custom Rate Notice */}
              {selectiveList.some(i => i.isUnassignedCustomEligible && !i.alreadyBilled) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {isMr
                        ? 'सूचना: विशेष दर उपलब्ध (श्रेणी अपूर्ण)'
                        : 'Notice: Custom Rate Available - Category Unassigned'}
                    </p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      {isMr
                        ? 'सदनिका १०१ (श्री संदीप पाटील) यांचा विशेष मासिक दर ₹१,२०० निश्चित आहे, परंतु त्यांची श्रेणी अद्याप अपूर्ण आहे. हे देयक तयार करण्यासाठी त्यांना डावीकडील चेकबॉक्सद्वारे स्पष्टपणे निवडा.'
                        : 'Flat 101 (Shri Sandeep Patil) has a custom rate of ₹1,200 but category is unassigned. To generate a bill for them, explicitly select their checkbox.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Missing Reason Warning Notice */}
              {missingReasonItems.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isMr
                      ? `सूचना: ${missingReasonItems.length} नोंदींमध्ये रक्कम बदलण्यात आली आहे किंवा वगळण्यात आली आहे. कृपया कारण नमूद करा.`
                      : `Notice: ${missingReasonItems.length} entries have modified amounts or are skipped. Please provide a reason.`}
                  </span>
                </div>
              )}

              {/* Interactive Selective Table */}
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 text-[11px] sticky top-0 border-b border-slate-200 z-10 font-semibold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="p-2.5">{t('colName')}</th>
                      <th className="p-2.5 w-20">{t('colFlat')}</th>
                      <th className="p-2.5 w-24">{t('colPropertyType')}</th>
                      <th className="p-2.5 w-28">{t('colCategory')}</th>
                      <th className="p-2.5 w-20 text-right">{t('defaultCategoryRateLabel')}</th>
                      <th className="p-2.5 w-24 text-right">{t('customMasterRateLabel')}</th>
                      <th className="p-2.5 w-32">{t('billingActionLabel')}</th>
                      <th className="p-2.5 w-28 text-right">{t('thisMonthAmount')}</th>
                      <th className="p-2.5 min-w-40">{t('overrideReasonLabel')}</th>
                      <th className="p-2.5 w-28 text-center">{t('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedSelectiveList.map((item, idx) => {
                      const isRowDisabled = item.alreadyBilled || (item.isUnassigned && !item.isUnassignedCustomEligible);
                      const isOverridden = item.selected && (item.actionType === 'REDUCED' || (item.appliedAmount !== item.baseApplicableRate && item.appliedAmount > 0));
                      const isZero = item.selected && (item.actionType === 'ZERO' || item.appliedAmount === 0);
                      const isSkipped = !item.selected || item.actionType === 'SKIP';

                      return (
                        <tr
                          key={item.residentId}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isRowDisabled
                              ? 'opacity-60 bg-slate-50/30'
                              : isZero
                              ? 'bg-indigo-50/20'
                              : isOverridden
                              ? 'bg-amber-50/25'
                              : isSkipped
                              ? 'bg-slate-100/40 text-slate-400'
                              : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected && !isRowDisabled}
                              onChange={() => handleToggleSelect(item.residentId)}
                              disabled={isRowDisabled}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Member Name */}
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900">{item.fullNameMarathi}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {item.hasCustomMasterRate && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
                                  {isMr ? 'विशेष दर' : 'Custom'}: ₹{item.customMasterRate}
                                </span>
                              )}
                              {item.availableAdvanceBalance > 0 && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                                  {isMr ? 'अ‍ॅडव्हान्स शिल्लक' : 'Advance Bal'}: ₹{item.availableAdvanceBalance}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Flat Number */}
                          <td className="p-2.5 font-mono font-bold text-slate-700">{item.flatNumber || '-'}</td>

                          {/* Property Type */}
                          <td className="p-2.5">
                            {item.propertyType === 'SHOP' ? (
                              <span className="text-purple-700 font-medium">{t('propShop')}</span>
                            ) : (
                              <span className="text-slate-700">{t('propResidential')}</span>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="p-2.5">
                            {item.isUnassignedCustomEligible ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{isMr ? 'विशेष दर (श्रेणी अपूर्ण)' : 'Custom Rate - Category Unassigned'}</span>
                                </span>
                                <span className="text-[9px] text-amber-700 font-medium">
                                  {isMr ? 'स्पष्ट निवड आवश्यक' : 'Explicit selection required'}
                                </span>
                              </div>
                            ) : (
                              getCategoryBadge(item.maintenanceCategory)
                            )}
                          </td>

                          {/* Default Category Rate */}
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            {item.isUnassignedCustomEligible ? '-' : `₹${item.defaultCategoryRate}`}
                          </td>

                          {/* Custom Master Rate */}
                          <td className="p-2.5 text-right font-mono">
                            {item.hasCustomMasterRate ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                                ₹{item.customMasterRate}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Billing Action Dropdown */}
                          <td className="p-2.5">
                            <select
                              value={isSkipped ? 'SKIP' : item.actionType}
                              onChange={(e) => handleChangeActionType(item.residentId, e.target.value)}
                              disabled={isRowDisabled}
                              className={`w-full px-2 py-1 bg-white border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                isZero
                                  ? 'border-indigo-300 text-indigo-800'
                                  : isOverridden
                                  ? 'border-amber-300 text-amber-800'
                                  : isSkipped
                                  ? 'border-slate-300 text-slate-500'
                                  : 'border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="FULL">{t('actionFull')}</option>
                              <option value="REDUCED">{t('actionReduced')}</option>
                              <option value="ZERO">{t('actionZero')}</option>
                              <option value="SKIP">{t('actionSkip')}</option>
                            </select>
                          </td>

                          {/* This Month's Amount (Editable Input) */}
                          <td className="p-2.5 text-right">
                            <div className="relative inline-block w-24">
                              <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={item.appliedAmount}
                                onChange={(e) => handleChangeAmount(item.residentId, e.target.value)}
                                disabled={isRowDisabled || isSkipped}
                                className={`w-full pl-6 pr-2 py-1 bg-white border rounded-lg text-right font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
                                  isZero
                                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50/30'
                                    : isOverridden
                                    ? 'border-amber-300 text-amber-800 bg-amber-50/30'
                                    : 'border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Override Reason Input */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.overrideReason}
                              onChange={(e) => handleChangeReason(item.residentId, e.target.value)}
                              placeholder={
                                (isOverridden || isZero || isSkipped) && !isRowDisabled
                                  ? isMr
                                    ? 'कारण आवश्यक...'
                                    : 'Reason required...'
                                  : t('overrideReasonPlaceholder')
                              }
                              disabled={isRowDisabled}
                              className={`w-full px-2 py-1 bg-white border rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                (isOverridden || isZero || isSkipped) && !item.overrideReason?.trim() && !isRowDisabled
                                  ? 'border-amber-300 bg-amber-50/20'
                                  : 'border-slate-200'
                              }`}
                            />
                          </td>

                          {/* Status Badge */}
                          <td className="p-2.5 text-center">
                            {item.alreadyBilled ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {isMr ? 'आधीच तयार' : 'Already Billed'}
                              </span>
                            ) : item.isUnassignedCustomEligible ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                item.selected
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}>
                                {item.selected
                                  ? (isMr ? 'निवडलेले (तयार होईल)' : 'Selected (Will Bill)')
                                  : (isMr ? 'निवड आवश्यक' : 'Selection Required')}
                              </span>
                            ) : item.isUnassigned ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                {isMr ? 'श्रेणी अपूर्ण' : 'Unassigned'}
                              </span>
                            ) : isSkipped ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {isMr ? 'वगळलेले' : 'Skipped'}
                              </span>
                            ) : isZero ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {isMr ? 'शून्य देयक (₹०)' : 'Zero (₹0)'}
                              </span>
                            ) : isOverridden ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                {isMr ? 'सवलत देयक' : 'Override'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isMr ? 'पात्र (पूर्ण)' : 'Eligible'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Generate Button Action Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {previewData.alreadyBilledCount > 0 && (
                    <span>
                      {isMr
                        ? `ℹ️ ${previewData.alreadyBilledCount} सभासदांची देयके आधीच तयार झालेली आहेत आणि ती पुन्हा तयार केली जाणार नाहीत.`
                        : `ℹ️ ${previewData.alreadyBilledCount} residents already have bills for this month.`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">{isMr ? 'एकूण निवडलेली देयके:' : 'Total Selected Bills:'} </span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{selectedItems.length}</span>
                    <span className="mx-2 text-slate-300">•</span>
                    <span className="text-[11px] text-slate-500">{isMr ? 'एकूण रक्कम:' : 'Total Amount:'} </span>
                    <span className="font-bold text-orange-600 font-mono text-xs">
                      ₹ {totalExpectedCollection.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={selectedItems.length === 0 || isGenerating}
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>{isMr ? `देयके तयार करा (${selectedItems.length})` : `Generate Bills (${selectedItems.length})`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURATION (CATEGORY-WISE RATES & DUE DATES)                    */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('categoryRatesTitle')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('categoryRatesSubtitle')}
                </p>
              </div>
            </div>

            <form onSubmit={handleOpenRateConfirm} className="space-y-4 text-xs">
              {/* Rate 1: Residential Flat */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('residentialRateLabel')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono">
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={configForm.categoryRates.residential}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        categoryRates: { ...configForm.categoryRates, residential: e.target.value }
                      })
                    }
                    placeholder="1000"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isMr ? 'सर्व निवासी सदनिकांसाठी लागू होणारे नियमित मासिक शुल्क.' : 'Standard monthly rate for residential flats.'}
                </span>
              </div>

              {/* Rate 2: Commercial Shop */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('shopRateLabel')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono">
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={configForm.categoryRates.shop}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        categoryRates: { ...configForm.categoryRates, shop: e.target.value }
                      })
                    }
                    placeholder="300"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isMr ? 'इमारतीतील व्यावसायिक दुकानांसाठी मासिक देखभाल शुल्क.' : 'Monthly rate for commercial ground-floor shops.'}
                </span>
              </div>

              {/* Rate 3: Chairman Special */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('chairmanRateLabel')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono">
                    ₹
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={configForm.categoryRates.chairman}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        categoryRates: { ...configForm.categoryRates, chairman: e.target.value }
                      })
                    }
                    placeholder="500"
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isMr ? 'सोसायटी चेअरमन पदासाठी निश्चित केलेला विशेष मासिक देखभाल दर.' : 'Special authorized rate for the society Chairman.'}
                </span>
              </div>

              {/* Due Day */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {t('dueDayLabel')} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="28"
                  value={configForm.dueDayOfMonth}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, dueDayOfMonth: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {isMr ? 'दरमहा कोणत्या तारखेला देय शुल्क भरणे अपेक्षित आहे.' : 'Calendar day of month when maintenance is due.'}
                </span>
              </div>

              {/* Auto Apply Advance Setting */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.autoApplyAdvance}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, autoApplyAdvance: e.target.checked })
                    }
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-slate-800 font-semibold text-xs sm:text-sm">
                      {isMr
                        ? 'मासिक देयके तयार करताना उपलब्ध अ‍ॅडव्हान्स शिल्लक आपोआप लागू करा'
                        : 'Automatically apply available advance balance when generating monthly bills'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block leading-relaxed">
                      {isMr
                        ? 'सक्रिय केल्यास, नवीन देयक तयार होताच सभासदाच्या खात्यावरील उपलब्ध अ‍ॅडव्हान्स रक्कम त्या देयकावर आपोआप समायोजित होईल.'
                        : 'When enabled, available advance credit will automatically adjust against new monthly bills.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('saveRatesBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: SAVING CATEGORY MAINTENANCE RATES                     */}
      {/* ========================================================================= */}
      {isRateConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              {t('confirmRatesChangeTitle')}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed text-center mb-4">
              {t('confirmRatesChangeMsg')}
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">निवासी सदनिका दर:</span>
                <span className="font-bold text-slate-900">₹ {configForm.categoryRates.residential}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">व्यावसायिक दुकान दर:</span>
                <span className="font-bold text-slate-900">₹ {configForm.categoryRates.shop}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">चेअरमन विशेष दर:</span>
                <span className="font-bold text-slate-900">₹ {configForm.categoryRates.chairman}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsRateConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                {t('btnCancel')}
              </button>
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isMr ? 'होय, दर बदला' : 'Confirm & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: SELECTIVE MONTHLY DUES GENERATION                     */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-left max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('confirmSelectiveGenTitle')}
                </h3>
                <p className="text-xs text-orange-600 font-semibold font-mono">
                  {getMonthName(genMonth)} {genYear}
                </p>
              </div>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {t('confirmSelectiveGenNotice')}
              </p>

              {/* 7 Required Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">{isMr ? 'एकूण सक्रिय सभासद' : 'Total Active'}</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{selectiveList.length}</div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500">{t('selectedForBillingLabel')}</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{selectedItems.length}</div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-blue-200 text-center">
                  <div className="text-[10px] text-blue-700">{t('fullRateBillsLabel')}</div>
                  <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">{fullRateItems.length}</div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-amber-300 text-center">
                  <div className="text-[10px] text-amber-800">{t('reducedRateBillsLabel')}</div>
                  <div className="text-sm font-bold text-amber-700 font-mono mt-0.5">{reducedRateItems.length}</div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-indigo-200 text-center">
                  <div className="text-[10px] text-indigo-700">{t('zeroAmountBillsLabel')}</div>
                  <div className="text-sm font-bold text-indigo-700 font-mono mt-0.5">{zeroAmountItems.length}</div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-rose-200 text-center">
                  <div className="text-[10px] text-rose-700">{t('skippedResidentsLabel')}</div>
                  <div className="text-sm font-bold text-rose-700 font-mono mt-0.5">{skippedItems.length}</div>
                </div>

                <div className="col-span-2 sm:col-span-3 bg-gradient-to-r from-orange-50 to-amber-50 p-2.5 rounded-lg border border-orange-200 flex items-center justify-between">
                  <span className="font-semibold text-orange-900 text-xs">{t('totalExpectedCollectionLabel')}:</span>
                  <span className="text-base font-extrabold text-orange-600 font-mono">
                    ₹ {totalExpectedCollection.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Reduced Rate Bills Detail */}
              {reducedRateItems.length > 0 && (
                <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/30 space-y-1.5">
                  <div className="font-bold text-amber-900 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{isMr ? 'सवलत देयके तपशील:' : 'Reduced Bills Details:'} ({reducedRateItems.length})</span>
                  </div>
                  <div className="space-y-1">
                    {reducedRateItems.map(item => (
                      <div key={item.residentId} className="flex items-center justify-between bg-white p-1.5 rounded border border-amber-100 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-800">{item.fullNameMarathi}</span>
                          <span className="text-slate-500 font-mono ml-1">({item.flatNumber})</span>
                          {item.overrideReason && <span className="text-slate-400 ml-2 italic text-[10px]">— {item.overrideReason}</span>}
                        </div>
                        <div className="font-mono font-bold text-amber-800">
                          ₹{item.baseApplicableRate} → ₹{item.appliedAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zero-Amount Bills Detail */}
              {zeroAmountItems.length > 0 && (
                <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50/30 space-y-1.5">
                  <div className="font-bold text-indigo-900 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>{isMr ? 'शून्य देयके तपशील (₹०, आपोआप भरलेली):' : 'Zero-Amount Bills (Marked Paid ₹0):'} ({zeroAmountItems.length})</span>
                  </div>
                  <div className="space-y-1">
                    {zeroAmountItems.map(item => (
                      <div key={item.residentId} className="flex items-center justify-between bg-white p-1.5 rounded border border-indigo-100 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-800">{item.fullNameMarathi}</span>
                          <span className="text-slate-500 font-mono ml-1">({item.flatNumber})</span>
                          {item.overrideReason && <span className="text-slate-400 ml-2 italic text-[10px]">— {item.overrideReason}</span>}
                        </div>
                        <div className="font-mono font-bold text-indigo-700">₹0</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Residents Detail */}
              {skippedItems.length > 0 && (
                <div className="border border-rose-200 rounded-xl p-3 bg-rose-50/30 space-y-1.5">
                  <div className="font-bold text-rose-900 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{isMr ? 'या महिन्यात वगळलेले सभासद (देयक तयार होणार नाही):' : 'Skipped Residents (No Bill Created):'} ({skippedItems.length})</span>
                  </div>
                  <div className="space-y-1">
                    {skippedItems.map(item => (
                      <div key={item.residentId} className="flex items-center justify-between bg-white p-1.5 rounded border border-rose-100 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-800">{item.fullNameMarathi}</span>
                          <span className="text-slate-500 font-mono ml-1">({item.flatNumber})</span>
                          {item.overrideReason && <span className="text-slate-400 ml-2 italic text-[10px]">— {item.overrideReason}</span>}
                        </div>
                        <div className="text-rose-600 font-semibold text-[10px]">{isMr ? 'वगळलेले' : 'Skipped'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning if missing reasons */}
              {missingReasonItems.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{t('reasonRequiredNotice')}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs cursor-pointer transition-colors"
              >
                {t('cancelGenBtn')}
              </button>
              <button
                type="button"
                disabled={isGenerating || selectedItems.length === 0}
                onClick={handleGenerateBills}
                className="px-5 py-2 rounded-xl font-semibold text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isGenerating ? t('generatingBtn') : t('confirmGenBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DUE DETAILS MODAL                                                         */}
      {/* ========================================================================= */}
      {/* MODAL: VIEW DETAILS                                                       */}
      {/* ========================================================================= */}
      {selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            <button
              onClick={() => setSelectedDue(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-10">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {selectedDue.residentNameSnapshot}
                </h3>
                <p className="text-xs text-orange-600 font-medium truncate">
                  {selectedDue.wing || 'A Wing'} • {selectedDue.flatNumberSnapshot ? `सदनिका / Shop: ${selectedDue.flatNumberSnapshot}` : ''}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 text-xs bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 mb-4">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colPropertyType')}</span>
                <span className="font-semibold text-slate-800">
                  {selectedDue.propertyTypeSnapshot === 'SHOP' ? t('propShop') : t('propResidential')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 items-center">
                <span className="text-slate-500">{t('colCategory')}</span>
                <div>{getCategoryBadge(selectedDue.maintenanceCategorySnapshot || 'RESIDENTIAL')}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colPeriod')}</span>
                <span className="font-semibold text-slate-900">{getMonthName(selectedDue.month)} {selectedDue.year}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colDueAmount')}</span>
                <span className="font-mono font-bold text-slate-900">₹ {(selectedDue.totalAmountDue ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colPaidAmount')}</span>
                <span className="font-mono font-bold text-emerald-600">₹ {(selectedDue.amountPaid ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {selectedDue.advanceAdjustedAmount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200/60 bg-amber-50/50 px-2 rounded">
                  <span className="text-amber-800 font-medium">{isMr ? 'वर्ग केलेला अ‍ॅडव्हान्स' : 'Advance Adjusted'}</span>
                  <span className="font-mono font-bold text-amber-700">₹ {(selectedDue.advanceAdjustedAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colOutstanding')}</span>
                <span className="font-mono font-bold text-red-600">₹ {(selectedDue.outstandingBalance ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t('colStatus')}</span>
                <span className={`font-bold ${
                  selectedDue.status === 'PAID' ? 'text-emerald-600' : selectedDue.status === 'PARTIAL' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {selectedDue.status === 'PAID' ? t('statusPaid') : selectedDue.status === 'PARTIAL' ? t('statusPartial') : t('statusUnpaid')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t('dueDateLabel')}</span>
                <span className="font-mono text-slate-700">{new Date(selectedDue.dueDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              {selectedDue.status === 'PAID' && (
                <button
                  type="button"
                  onClick={() => {
                    const dueToOpen = selectedDue;
                    setSelectedDue(null);
                    handleOpenReceiptForDue(dueToOpen);
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{isMr ? 'पावती पहा' : 'View Receipt'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDue(null)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer ml-auto"
              >
                {t('btnCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLY ADVANCE BALANCE TO MAINTENANCE DUE                            */}
      {/* ========================================================================= */}
      {applyAdvanceModalOpen && targetDueForAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm min-w-0">
                <PlusCircle className="w-5 h-5 text-orange-600 shrink-0" />
                <span className="truncate">{isMr ? 'अ‍ॅडव्हान्स शिल्लक देयकावर लागू करा' : 'Apply Advance Credit to Bill'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApplyAdvanceModalOpen(false);
                  setTargetDueForAdvance(null);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {advanceLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <Loader2 className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
                <span>{isMr ? 'माहिती लोड होत आहे...' : 'Loading advance profile...'}</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('colName')}:</span>
                    <span className="font-bold text-slate-900">{targetDueForAdvance.residentNameSnapshot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('colFlat')}:</span>
                    <span className="font-mono font-bold text-slate-800">{targetDueForAdvance.flatNumberSnapshot || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('colPeriod')}:</span>
                    <span className="font-semibold text-slate-800">{getMonthName(targetDueForAdvance.month)} {targetDueForAdvance.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('colOutstanding')}:</span>
                    <span className="font-mono font-bold text-red-600">₹ {(targetDueForAdvance.outstandingBalance ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-semibold">{isMr ? 'उपलब्ध अ‍ॅडव्हान्स शिल्लक:' : 'Available Advance Balance:'}</span>
                    <span className="font-mono font-bold text-emerald-700">₹ {(advanceResidentProfile?.advanceBalance || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {(advanceResidentProfile?.advanceBalance || 0) <= 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{isMr ? 'या सभासदाकडे कोणतीही अ‍ॅडव्हान्स शिल्लक उपलब्ध नाही.' : 'No available advance balance for this resident.'}</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isMr ? 'लागू करावयाची रक्कम (₹):' : 'Amount to Apply (₹):'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max={Math.min(advanceResidentProfile?.advanceBalance || 0, targetDueForAdvance.outstandingBalance)}
                        value={advanceApplyAmount}
                        onChange={(e) => setAdvanceApplyAmount(e.target.value)}
                        className="w-full min-h-[44px] pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {isMr ? `जास्तीत जास्त उपलब्ध: ₹${Math.min(advanceResidentProfile?.advanceBalance || 0, targetDueForAdvance.outstandingBalance)}` : `Max available: ₹${Math.min(advanceResidentProfile?.advanceBalance || 0, targetDueForAdvance.outstandingBalance)}`}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setApplyAdvanceModalOpen(false);
                      setTargetDueForAdvance(null);
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    {t('btnCancel')}
                  </button>
                  {(advanceResidentProfile?.advanceBalance || 0) > 0 && (
                    <button
                      type="button"
                      disabled={advanceSubmitting || !advanceApplyAmount || Number(advanceApplyAmount) <= 0}
                      onClick={handleConfirmApplyAdvance}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {advanceSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{isMr ? 'अ‍ॅडव्हान्स लागू करा' : 'Apply Advance'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* RECEIPT PREVIEW / PRINT MODAL */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setReceiptModalPayment(null);
        }}
        payment={receiptModalPayment}
      />
    </div>
  );
};

export default MaintenanceManagement;
