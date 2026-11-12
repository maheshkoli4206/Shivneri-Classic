import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  IndianRupee,
  Calendar,
  Users,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  PlusCircle,
  Tag,
  CreditCard,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

const MONTH_NAMES_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const METHOD_LABELS_MR = {
  CASH: 'रोख (Cash)',
  UPI: 'यूपीआय (UPI)',
  BANK_TRANSFER: 'बँक ट्रान्सफर (Bank)',
  CHEQUE: 'धनादेश (Cheque)'
};

const METHOD_LABELS_EN = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque'
};

const FinancialDrilldownModal = ({
  isOpen,
  onClose,
  viewType, // 'billed' | 'collected' | 'outstanding' | 'advance'
  summary,
  onSelectResidentForHistory,
  onSelectReceipt,
  onNavigateToPayBill
}) => {
  const { lang, t } = useLanguage();
  const isMr = lang === 'mr';

  // State
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);

  // Sub-view Toggles
  const [outstandingViewMode, setOutstandingViewMode] = useState('billWise'); // 'billWise' | 'memberWise'
  const [advanceViewMode, setAdvanceViewMode] = useState('ledger'); // 'ledger' | 'receipts'

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset page when filters change or viewType changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilterMonth('');
    setFilterYear('');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setFilterMethod('ALL');
    setSortBy('default');
  }, [viewType, isOpen]);

  // Fetch Data based on viewType
  const fetchData = async () => {
    if (!isOpen || !viewType) return;
    try {
      setLoading(true);

      if (viewType === 'billed') {
        const res = await api.get('/maintenance/dues');
        if (res.data?.success) {
          setDataList(res.data.dues || []);
        }
      } else if (viewType === 'collected') {
        const res = await api.get('/payments?limit=100');
        if (res.data?.success) {
          setDataList(res.data.payments || []);
        }
      } else if (viewType === 'outstanding') {
        // Query pending dues directly
        const res = await api.get('/maintenance/dues?status=PENDING');
        if (res.data?.success) {
          // Strictly exclude any dues with 0 balance
          const pendingOnly = (res.data.dues || []).filter((d) => (d.outstandingBalance || 0) > 0);
          setDataList(pendingOnly);
        }
      } else if (viewType === 'advance') {
        const res = await api.get('/payments/advance/ledger');
        if (res.data?.success) {
          setDataList(res.data.ledger || []);
          if (res.data.summary) setLedgerSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch drill-down data for ${viewType}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOpen, viewType]);

  const getMonthName = (m) => {
    return isMr ? MONTH_NAMES_MR[m - 1] || m : MONTH_NAMES_EN[m - 1] || m;
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'RESIDENTIAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{isMr ? 'निवासी' : 'Residential'}</span>;
      case 'SHOP':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">{isMr ? 'दुकान' : 'Shop'}</span>;
      case 'CHAIRMAN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">{isMr ? 'चेअरमन' : 'Chairman'}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{isMr ? 'नियुक्त नाही' : 'Unassigned'}</span>;
    }
  };

  // Filtered and Processed Data
  const processedData = useMemo(() => {
    let list = [...dataList];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        if (viewType === 'billed' || viewType === 'outstanding') {
          const name = (item.residentNameSnapshot || '').toLowerCase();
          const flat = (item.flatNumberSnapshot || '').toLowerCase();
          return name.includes(q) || flat.includes(q);
        } else if (viewType === 'collected') {
          const name = (item.residentNameMarathi || '').toLowerCase();
          const flat = (item.flatNumber || '').toLowerCase();
          const receipt = (item.receiptNumber || '').toLowerCase();
          const ref = (item.transactionRef || '').toLowerCase();
          return name.includes(q) || flat.includes(q) || receipt.includes(q) || ref.includes(q);
        } else if (viewType === 'advance') {
          const name = (item.fullNameMarathi || '').toLowerCase();
          const flat = (item.flatNumber || '').toLowerCase();
          const receipts = (item.receiptNumbers || []).join(' ').toLowerCase();
          return name.includes(q) || flat.includes(q) || receipts.includes(q);
        }
        return true;
      });
    }

    // Month Filter
    if (filterMonth) {
      const m = parseInt(filterMonth, 10);
      list = list.filter((item) => item.month === m);
    }

    // Year Filter
    if (filterYear) {
      const y = parseInt(filterYear, 10);
      list = list.filter((item) => item.year === y);
    }

    // Category Filter (for billed, outstanding, advance)
    if (filterCategory !== 'ALL') {
      list = list.filter((item) => {
        const cat = item.maintenanceCategorySnapshot || item.maintenanceCategory;
        return cat === filterCategory;
      });
    }

    // Payment Status Filter
    if (filterStatus !== 'ALL') {
      list = list.filter((item) => {
        if (viewType === 'billed' || viewType === 'outstanding') {
          return item.status === filterStatus;
        } else if (viewType === 'collected') {
          return item.status === filterStatus;
        } else if (viewType === 'advance') {
          if (filterStatus === 'ACTIVE') return item.availableBalance > 0;
          if (filterStatus === 'UTILIZED') return item.totalAdvanceReceived > 0 && item.availableBalance === 0;
          if (filterStatus === 'ZERO') return item.totalAdvanceReceived === 0;
        }
        return true;
      });
    }

    // Payment Method Filter
    if (filterMethod !== 'ALL') {
      list = list.filter((item) => item.paymentMethod === filterMethod);
    }

    // Sorting
    if (sortBy === 'amountDesc') {
      list.sort((a, b) => (b.totalAmountDue || b.amountReceived || b.totalAdvanceReceived || 0) - (a.totalAmountDue || a.amountReceived || a.totalAdvanceReceived || 0));
    } else if (sortBy === 'amountAsc') {
      list.sort((a, b) => (a.totalAmountDue || a.amountReceived || a.totalAdvanceReceived || 0) - (b.totalAmountDue || b.amountReceived || b.totalAdvanceReceived || 0));
    } else if (sortBy === 'balanceDesc') {
      list.sort((a, b) => (b.outstandingBalance || b.availableBalance || 0) - (a.outstandingBalance || a.availableBalance || 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.residentNameSnapshot || a.residentNameMarathi || a.fullNameMarathi || '').localeCompare(b.residentNameSnapshot || b.residentNameMarathi || b.fullNameMarathi || ''));
    }

    return list;
  }, [dataList, viewType, searchQuery, filterMonth, filterYear, filterCategory, filterStatus, filterMethod, sortBy]);

  // Member-wise Combined View grouping for Outstanding
  const memberWiseOutstanding = useMemo(() => {
    if (viewType !== 'outstanding') return [];
    const grouped = {};
    for (const item of processedData) {
      const rId = item.residentId?._id || item.residentId;
      if (!grouped[rId]) {
        grouped[rId] = {
          residentId: rId,
          residentName: item.residentNameSnapshot,
          flatNumber: item.flatNumberSnapshot,
          wing: item.wing || 'A Wing',
          category: item.maintenanceCategorySnapshot,
          availableAdvance: item.residentId?.advanceBalance || 0,
          bills: [],
          totalBilled: 0,
          totalPaid: 0,
          totalAdvanceAdjusted: 0,
          combinedOutstanding: 0
        };
      }
      grouped[rId].bills.push(item);
      grouped[rId].totalBilled += item.totalAmountDue || 0;
      grouped[rId].totalPaid += item.amountPaid || 0;
      grouped[rId].totalAdvanceAdjusted += item.advanceAdjustedAmount || 0;
      grouped[rId].combinedOutstanding += item.outstandingBalance || 0;
    }
    return Object.values(grouped).sort((a, b) => b.combinedOutstanding - a.combinedOutstanding);
  }, [processedData, viewType]);

  // Derived Totals for the Active View
  const viewCalculatedTotals = useMemo(() => {
    if (viewType === 'billed') {
      const totalBilled = processedData.reduce((acc, d) => acc + (d.totalAmountDue || 0), 0);
      const totalPaid = processedData.reduce((acc, d) => acc + (d.amountPaid || 0), 0);
      const totalAdv = processedData.reduce((acc, d) => acc + (d.advanceAdjustedAmount || 0), 0);
      const totalBal = processedData.reduce((acc, d) => acc + (d.outstandingBalance || 0), 0);
      const uniqueMembers = new Set(processedData.map((d) => d.residentId?._id || d.residentId)).size;
      return { totalBilled, totalPaid, totalAdv, totalBal, count: processedData.length, uniqueMembers };
    } else if (viewType === 'collected') {
      const totalCollected = processedData.filter((p) => p.status === 'COMPLETED').reduce((acc, p) => acc + (p.amountReceived || 0), 0);
      const uniqueMembers = new Set(processedData.filter((p) => p.status === 'COMPLETED').map((p) => p.residentId)).size;
      return { totalCollected, count: processedData.length, uniqueMembers };
    } else if (viewType === 'outstanding') {
      const totalOutstanding = processedData.reduce((acc, d) => acc + (d.outstandingBalance || 0), 0);
      const totalOriginalBilled = processedData.reduce((acc, d) => acc + (d.totalAmountDue || 0), 0);
      const uniqueMembers = new Set(processedData.map((d) => d.residentId?._id || d.residentId)).size;
      return { totalOutstanding, totalOriginalBilled, count: processedData.length, uniqueMembers };
    } else if (viewType === 'advance') {
      const totalAvailable = processedData.reduce((acc, l) => acc + (l.availableBalance || 0), 0);
      const totalReceived = processedData.reduce((acc, l) => acc + (l.totalAdvanceReceived || 0), 0);
      const totalUtilized = processedData.reduce((acc, l) => acc + (l.totalAdvanceUtilized || 0), 0);
      const membersWithBalance = processedData.filter((l) => l.availableBalance > 0).length;
      return { totalAvailable, totalReceived, totalUtilized, count: processedData.length, membersWithBalance };
    }
    return {};
  }, [processedData, viewType]);

  // Pagination Slice
  const activeDataset = viewType === 'outstanding' && outstandingViewMode === 'memberWise'
    ? memberWiseOutstanding
    : processedData;

  const totalPages = Math.ceil(activeDataset.length / pageSize) || 1;
  const paginatedData = activeDataset.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="shrink-0 bg-slate-900 px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              viewType === 'billed'
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : viewType === 'collected'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : viewType === 'outstanding'
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
            }`}>
              {viewType === 'billed' && <FileText className="w-5 h-5" />}
              {viewType === 'collected' && <CheckCircle2 className="w-5 h-5" />}
              {viewType === 'outstanding' && <Clock className="w-5 h-5" />}
              {viewType === 'advance' && <ShieldCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">
                {viewType === 'billed' && (isMr ? 'एकूण देयके आकारणी तपशील' : 'Total Billed Amount Breakdown')}
                {viewType === 'collected' && (isMr ? 'एकूण जमा रक्कम व अधिकृत पावत्या' : 'Total Collections & Official Receipts')}
                {viewType === 'outstanding' && (isMr ? 'एकूण शिल्लक बाकी (थकीत देयके)' : 'Total Outstanding Maintenance Dues')}
                {viewType === 'advance' && (isMr ? 'उपलब्ध अ‍ॅडव्हान्स शिल्लक खतावणी' : 'Available Advance Credit Ledger')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {viewType === 'billed' && (isMr ? 'प्रत्येक सभासदाचे मासिक आकारणी, भरणा व उर्वरित शिल्लक' : 'Member-wise billed maintenance, direct paid & balances')}
                {viewType === 'collected' && (isMr ? 'अधिकृत पावत्या, भरणा पद्धत व व्यवहार संदर्भ तपशील' : 'All confirmed payment receipts with payment modes & UTR')}
                {viewType === 'outstanding' && (isMr ? 'अंशतः व थकीत राहिलेल्या देयकांची सभासदनिहाय यादी' : 'Members with unpaid or partial maintenance balances')}
                {viewType === 'advance' && (isMr ? 'सभासदांचे आगाऊ जमा, वापरलेले समायोजन व शिल्लक खतावणी' : 'Resident advance deposits, utilized adjustments & credit balances')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TOP SUMMARY METRIC PILLS                                                  */}
        {/* ========================================================================= */}
        <div className="shrink-0 bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          {viewType === 'billed' && (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'एकूण आकारणी:' : 'Total Billed:'}</span>
                <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalBilled ?? summary.totalBilledAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'एकूण देयके संख्या:' : 'Total Bills:'}</span>
                <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">{viewCalculatedTotals.count || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'आकारलेले सभासद:' : 'Billed Members:'}</span>
                <span className="font-mono font-bold text-blue-700 text-sm sm:text-base">{viewCalculatedTotals.uniqueMembers || summary.billedResidentsCount || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'शिल्लक बाकी:' : 'Pending Balance:'}</span>
                <span className="font-mono font-bold text-orange-600 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalBal || 0).toLocaleString('en-IN')}</span>
              </div>
            </>
          )}

          {viewType === 'collected' && (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'एकूण जमा रक्कम:' : 'Total Collected:'}</span>
                <span className="font-mono font-bold text-emerald-700 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalCollected ?? summary.totalCollectedAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'अधिकृत पावत्या:' : 'Valid Receipts:'}</span>
                <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">{viewCalculatedTotals.count || summary.completedPaymentsCount || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'भरणा केलेले सभासद:' : 'Paying Members:'}</span>
                <span className="font-mono font-bold text-emerald-700 text-sm sm:text-base">{viewCalculatedTotals.uniqueMembers || summary.payingResidentsCount || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'अ‍ॅडव्हान्स वगळून थेट जमा:' : 'Direct Collection:'}</span>
                <span className="font-bold text-emerald-600 text-xs mt-1 block">१००% अधिकृत</span>
              </div>
            </>
          )}

          {viewType === 'outstanding' && (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 shadow-2xs bg-rose-50/20">
                <span className="text-rose-800 text-[11px] font-semibold block">{isMr ? 'एकूण बाकी रक्कम:' : 'Total Outstanding:'}</span>
                <span className="font-mono font-bold text-rose-600 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalOutstanding ?? summary.totalOutstandingAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'थकीत देयके संख्या:' : 'Pending Bills:'}</span>
                <span className="font-mono font-bold text-rose-700 text-sm sm:text-base">{viewCalculatedTotals.count || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'थकीत असलेले सभासद:' : 'Members with Dues:'}</span>
                <span className="font-mono font-bold text-rose-700 text-sm sm:text-base">{viewCalculatedTotals.uniqueMembers || summary.pendingResidentsCount || 0}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'मूळ आकारणी:' : 'Original Billed:'}</span>
                <span className="font-mono font-bold text-slate-700 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalOriginalBilled || 0).toLocaleString('en-IN')}</span>
              </div>
            </>
          )}

          {viewType === 'advance' && (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-blue-200/80 shadow-2xs bg-blue-50/20">
                <span className="text-blue-800 text-[11px] font-semibold block">{isMr ? 'उपलब्ध अ‍ॅडव्हान्स शिल्लक:' : 'Available Balance:'}</span>
                <span className="font-mono font-bold text-blue-700 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalAvailable ?? summary.totalAdvanceBalance ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'एकूण जमा अ‍ॅडव्हान्स:' : 'Total Received:'}</span>
                <span className="font-mono font-bold text-slate-800 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalReceived ?? summary.totalAdvanceReceived ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'देयकांवर वापरलेली रक्कम:' : 'Utilized on Bills:'}</span>
                <span className="font-mono font-bold text-slate-700 text-sm sm:text-base">₹ {(viewCalculatedTotals.totalUtilized ?? summary.totalAdvanceUtilized ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 text-[11px] block">{isMr ? 'शिल्लक असलेले सभासद:' : 'Active Credit Accounts:'}</span>
                <span className="font-mono font-bold text-blue-700 text-sm sm:text-base">{viewCalculatedTotals.membersWithBalance || summary.advanceResidentsCount || 0}</span>
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FILTER & SEARCH CONTROLS                                                  */}
        {/* ========================================================================= */}
        <div className="shrink-0 p-3 sm:p-4 bg-white border-b border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Real-time Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={
                  viewType === 'billed' || viewType === 'outstanding'
                    ? (isMr ? 'नाव किंवा सदनिका क्र. शोधा...' : 'Search by name or flat number...')
                    : viewType === 'collected'
                    ? (isMr ? 'पावती क्र., नाव, सदनिका क्र., UTR शोधा...' : 'Search by receipt, name, flat, UTR...')
                    : (isMr ? 'सभासद नाव, सदनिका किंवा पावती क्र. शोधा...' : 'Search by member name, flat, receipt...')
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Sub-view View Toggles (For Outstanding and Advance) */}
            {viewType === 'outstanding' && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setOutstandingViewMode('billWise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    outstandingViewMode === 'billWise'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isMr ? 'देयकनिहाय यादी' : 'Bill-wise List'}
                </button>
                <button
                  type="button"
                  onClick={() => setOutstandingViewMode('memberWise')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    outstandingViewMode === 'memberWise'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isMr ? 'सभासदनिहाय एकत्रित शिल्लक' : 'Member-wise Combined'}
                </button>
              </div>
            )}
          </div>

          {/* Secondary Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Month Filter */}
            {(viewType === 'billed' || viewType === 'outstanding' || viewType === 'collected') && (
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="">{isMr ? 'सर्व महिने (All Months)' : 'All Months'}</option>
                {MONTH_NAMES_MR.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {isMr ? m : MONTH_NAMES_EN[idx]}
                  </option>
                ))}
              </select>
            )}

            {/* Year Filter */}
            {(viewType === 'billed' || viewType === 'outstanding' || viewType === 'collected') && (
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="">{isMr ? 'सर्व वर्षे (All Years)' : 'All Years'}</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            )}

            {/* Category Filter */}
            {(viewType === 'billed' || viewType === 'outstanding' || viewType === 'advance') && (
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="ALL">{isMr ? 'सर्व श्रेणी (All Categories)' : 'All Categories'}</option>
                <option value="RESIDENTIAL">{isMr ? 'निवासी (Residential)' : 'Residential'}</option>
                <option value="SHOP">{isMr ? 'दुकान (Shop)' : 'Shop'}</option>
                <option value="CHAIRMAN">{isMr ? 'चेअरमन (Chairman)' : 'Chairman'}</option>
                <option value="UNASSIGNED">{isMr ? 'नियुक्त नाही (Unassigned)' : 'Unassigned'}</option>
              </select>
            )}

            {/* Status Filter */}
            {viewType === 'billed' && (
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="ALL">{isMr ? 'सर्व स्थिती (All Status)' : 'All Status'}</option>
                <option value="PAID">{isMr ? 'पूर्ण भरलेले (PAID)' : 'Paid'}</option>
                <option value="PARTIAL">{isMr ? 'अंशतः भरलेले (PARTIAL)' : 'Partial'}</option>
                <option value="UNPAID">{isMr ? 'थकीत (UNPAID)' : 'Unpaid'}</option>
              </select>
            )}

            {/* Method Filter for Collections */}
            {viewType === 'collected' && (
              <select
                value={filterMethod}
                onChange={(e) => {
                  setFilterMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="ALL">{isMr ? 'सर्व पद्धती (All Methods)' : 'All Methods'}</option>
                <option value="UPI">UPI</option>
                <option value="CASH">{isMr ? 'रोख (Cash)' : 'Cash'}</option>
                <option value="BANK_TRANSFER">{isMr ? 'बँक ट्रान्सफर' : 'Bank Transfer'}</option>
                <option value="CHEQUE">{isMr ? 'धनादेश (Cheque)' : 'Cheque'}</option>
              </select>
            )}

            {/* Advance Status Filter */}
            {viewType === 'advance' && (
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              >
                <option value="ALL">{isMr ? 'सर्व सभासद (All Members)' : 'All Members'}</option>
                <option value="ACTIVE">{isMr ? 'शिल्लक असलेले (Available Balance > 0)' : 'With Available Balance'}</option>
                <option value="UTILIZED">{isMr ? 'पूर्ण वापरलेले (Fully Utilized)' : 'Fully Utilized'}</option>
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs ml-auto"
            >
              <option value="default">{isMr ? 'क्रमवारी: मूळ (Default)' : 'Sort: Default'}</option>
              <option value="amountDesc">{isMr ? 'रक्कम: जास्त ते कमी' : 'Amount: High to Low'}</option>
              <option value="amountAsc">{isMr ? 'रक्कम: कमी ते जास्त' : 'Amount: Low to High'}</option>
              <option value="name">{isMr ? 'नावानुसार (Name)' : 'By Name'}</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DATA TABLE / LIST BODY                                                    */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-600" />
              <p className="text-xs font-semibold">{isMr ? 'डेटा लोड होत आहे...' : 'Loading financial breakdown...'}</p>
            </div>
          ) : activeDataset.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">
                {isMr ? 'कोणतेही रेकॉर्ड आढळले नाहीत.' : 'No records match the current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* VIEW 1: TOTAL BILLED TABLE */}
              {viewType === 'billed' && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">{isMr ? 'सभासद / सदनिका' : 'Member / Flat'}</th>
                        <th className="p-3">{isMr ? 'श्रेणी' : 'Category'}</th>
                        <th className="p-3">{isMr ? 'महिना / वर्ष' : 'Period'}</th>
                        <th className="p-3 text-right">{isMr ? 'आकारणी (₹)' : 'Billed (₹)'}</th>
                        <th className="p-3 text-right">{isMr ? 'थेट भरणा (₹)' : 'Paid (₹)'}</th>
                        <th className="p-3 text-right">{isMr ? 'अ‍ॅडव्हान्स (₹)' : 'Adv Applied (₹)'}</th>
                        <th className="p-3 text-right">{isMr ? 'उर्वरित बाकी (₹)' : 'Remaining (₹)'}</th>
                        <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                        <th className="p-3 text-center">{isMr ? 'कृती' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => onSelectResidentForHistory(item.residentId?._id || item.residentId)}
                              className="font-bold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{item.residentNameSnapshot}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.flatNumberSnapshot || '-'} ({item.wing || 'A Wing'})
                            </span>
                          </td>
                          <td className="p-3">
                            {getCategoryBadge(item.maintenanceCategorySnapshot)}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {getMonthName(item.month)} {item.year}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹ {(item.totalAmountDue || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-700">
                            ₹ {(item.amountPaid || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-blue-700">
                            {item.advanceAdjustedAmount > 0 ? `₹ ${(item.advanceAdjustedAmount).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className={`p-3 text-right font-mono font-bold ${item.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            ₹ {(item.outstandingBalance || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            {item.status === 'PAID' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isMr ? 'पूर्ण पेड' : 'PAID'}
                              </span>
                            ) : item.status === 'PARTIAL' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {isMr ? 'अंशतः भरणा' : 'PARTIAL'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {isMr ? 'थकीत' : 'UNPAID'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.outstandingBalance > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  if (onNavigateToPayBill) onNavigateToPayBill(item);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                              >
                                {isMr ? 'पेमेंट भरा' : 'Pay'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectResidentForHistory(item.residentId?._id || item.residentId)}
                                className="p-1 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                title={isMr ? 'इतिहास पहा' : 'View History'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: TOTAL COLLECTED (PAYMENTS) TABLE */}
              {viewType === 'collected' && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">{isMr ? 'पावती क्रमांक' : 'Receipt No'}</th>
                        <th className="p-3">{isMr ? 'सभासद नाव' : 'Resident Name'}</th>
                        <th className="p-3">{isMr ? 'सदनिका क्र.' : 'Flat'}</th>
                        <th className="p-3">{isMr ? 'देयक महिना' : 'Billing Month'}</th>
                        <th className="p-3 text-right">{isMr ? 'जमा रक्कम (₹)' : 'Amount (₹)'}</th>
                        <th className="p-3">{isMr ? 'भरणा दिनांक' : 'Payment Date'}</th>
                        <th className="p-3">{isMr ? 'पद्धत' : 'Method'}</th>
                        <th className="p-3">{isMr ? 'संदर्भ / UTR' : 'Txn Ref / UTR'}</th>
                        <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                        <th className="p-3 text-center">{isMr ? 'पावती' : 'Receipt'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => onSelectReceipt(item)}
                              className="font-mono font-bold text-orange-600 hover:underline cursor-pointer"
                            >
                              {item.receiptNumber}
                            </button>
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            <button
                              type="button"
                              onClick={() => onSelectResidentForHistory(item.residentId)}
                              className="hover:text-orange-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                            >
                              <span>{item.residentNameMarathi}</span>
                              <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                            </button>
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {item.flatNumber || '-'} ({item.wing || 'A Wing'})
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {getMonthName(item.month)} {item.year}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            ₹ {(item.amountReceived || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {new Date(item.paymentDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB')}
                          </td>
                          <td className="p-3 text-slate-700">
                            {isMr ? METHOD_LABELS_MR[item.paymentMethod] || item.paymentMethod : METHOD_LABELS_EN[item.paymentMethod] || item.paymentMethod}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {item.transactionRef || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {item.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isMr ? 'सक्रिय' : 'COMPLETED'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {isMr ? 'रद्द' : 'CANCELLED'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectReceipt(item)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                              title={isMr ? 'पावती प्रिंट करा' : 'Print Receipt'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 3: OUTSTANDING BALANCES */}
              {viewType === 'outstanding' && (
                <>
                  {outstandingViewMode === 'billWise' ? (
                    /* Bill-wise List */
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-50/50 text-slate-700 font-semibold border-b border-rose-100">
                          <tr>
                            <th className="p-3">{isMr ? 'सभासद / सदनिका' : 'Member / Flat'}</th>
                            <th className="p-3">{isMr ? 'श्रेणी' : 'Category'}</th>
                            <th className="p-3">{isMr ? 'देयक महिना' : 'Billing Month'}</th>
                            <th className="p-3 text-right">{isMr ? 'एकूण आकारणी (₹)' : 'Total Billed (₹)'}</th>
                            <th className="p-3 text-right">{isMr ? 'भरलेली रक्कम (₹)' : 'Paid (₹)'}</th>
                            <th className="p-3 text-right">{isMr ? 'थकीत शिल्लक (₹)' : 'Pending Balance (₹)'}</th>
                            <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Status'}</th>
                            <th className="p-3">{isMr ? 'देय दिनांक' : 'Due Date'}</th>
                            <th className="p-3 text-center">{isMr ? 'कृती' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedData.map((item) => (
                            <tr key={item._id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => onSelectResidentForHistory(item.residentId?._id || item.residentId)}
                                  className="font-bold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                                >
                                  <span>{item.residentNameSnapshot}</span>
                                  <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </button>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {item.flatNumberSnapshot || '-'} ({item.wing || 'A Wing'})
                                </span>
                              </td>
                              <td className="p-3">
                                {getCategoryBadge(item.maintenanceCategorySnapshot)}
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                {getMonthName(item.month)} {item.year}
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700">
                                ₹ {(item.totalAmountDue || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-mono text-emerald-700">
                                ₹ {(item.amountPaid || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-rose-600 text-sm">
                                ₹ {(item.outstandingBalance || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-center">
                                {item.status === 'PARTIAL' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    {isMr ? 'अंशतः बाकी' : 'PARTIAL'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    {isMr ? 'थकीत' : 'UNPAID'}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500 font-mono text-[11px]">
                                {item.dueDate ? new Date(item.dueDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-GB') : '-'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onNavigateToPayBill) onNavigateToPayBill(item);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                >
                                  {isMr ? 'पेमेंट भरा' : 'Pay Now'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Member-wise Combined View */
                    <div className="space-y-3">
                      {paginatedData.map((m) => (
                        <div key={m.residentId} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-300 transition-all shadow-xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => onSelectResidentForHistory(m.residentId)}
                                className="font-bold text-sm text-slate-900 hover:text-orange-600 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>{m.residentName}</span>
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {m.flatNumber || '-'} ({m.wing})
                              </span>
                              {getCategoryBadge(m.category)}
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 mr-2">{isMr ? 'एकत्रित बाकी:' : 'Combined Due:'}</span>
                              <span className="font-mono font-bold text-rose-600 text-base">
                                ₹ {m.combinedOutstanding.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500 text-[11px] block">{isMr ? 'थकीत महिने:' : 'Pending Months:'}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.bills.map((b) => (
                                  <span key={b._id} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    {getMonthName(b.month)} {b.year} (₹{b.outstandingBalance})
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-500 text-[11px] block">{isMr ? 'एकूण आकारणी / थेट भरणा:' : 'Total Billed / Paid:'}</span>
                              <div className="font-mono text-slate-700 mt-1">
                                ₹ {m.totalBilled.toLocaleString('en-IN')} / <span className="text-emerald-700">₹ {m.totalPaid.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            <div className="flex items-center sm:justify-end gap-2 pt-1 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => onSelectResidentForHistory(m.residentId)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {isMr ? 'इतिहास पहा' : 'View History'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  if (onNavigateToPayBill && m.bills.length > 0) {
                                    onNavigateToPayBill(m.bills[0]);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                {isMr ? 'देयक भरा' : 'Pay Due'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* VIEW 4: AVAILABLE ADVANCE LEDGER */}
              {viewType === 'advance' && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/50 text-slate-700 font-semibold border-b border-blue-100">
                      <tr>
                        <th className="p-3">{isMr ? 'सभासद / सदनिका' : 'Member / Flat'}</th>
                        <th className="p-3">{isMr ? 'श्रेणी' : 'Category'}</th>
                        <th className="p-3 text-right">{isMr ? 'एकूण जमा अ‍ॅडव्हान्स (₹)' : 'Total Received (₹)'}</th>
                        <th className="p-3 text-right">{isMr ? 'देयकांवर वापर (₹)' : 'Adjusted (₹)'}</th>
                        <th className="p-3 text-right">{isMr ? 'उपलब्ध शिल्लक (₹)' : 'Available Balance (₹)'}</th>
                        <th className="p-3 text-center">{isMr ? 'स्थिती' : 'Credit Status'}</th>
                        <th className="p-3">{isMr ? 'मूळ पावती संदर्भ' : 'Original Receipts'}</th>
                        <th className="p-3 text-center">{isMr ? 'कृती' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.map((item) => (
                        <tr key={item.residentId} className="hover:bg-blue-50/20 transition-colors">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => onSelectResidentForHistory(item.residentId)}
                              className="font-bold text-slate-900 hover:text-orange-600 transition-colors text-left cursor-pointer flex items-center gap-1"
                            >
                              <span>{item.fullNameMarathi}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {item.flatNumber || '-'} ({item.wing || 'A Wing'})
                            </span>
                          </td>
                          <td className="p-3">
                            {getCategoryBadge(item.maintenanceCategory)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">
                            ₹ {(item.totalAdvanceReceived || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹ {(item.totalAdvanceUtilized || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-blue-700 text-sm">
                            ₹ {(item.availableBalance || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center">
                            {item.availableBalance > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {isMr ? 'सक्रिय शिल्लक' : 'ACTIVE CREDIT'}
                              </span>
                            ) : item.totalAdvanceReceived > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {isMr ? 'पूर्ण वापर' : 'FULLY UTILIZED'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                {isMr ? 'निरंक' : 'NIL'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.receiptNumbers && item.receiptNumbers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.advanceRecords?.map((adv) => (
                                  <button
                                    key={adv._id}
                                    type="button"
                                    onClick={() => onSelectReceipt({ ...adv, isAdvancePayment: true })}
                                    className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                                    title={isMr ? 'अ‍ॅडव्हान्स पावती पहा' : 'View Advance Receipt'}
                                  >
                                    {adv.receiptNumber}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onSelectResidentForHistory(item.residentId)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              {isMr ? 'खतावणी पहा' : 'View Ledger'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER & PAGINATION                                                 */}
        {/* ========================================================================= */}
        <div className="shrink-0 bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            {isMr ? 'दाखवत आहे:' : 'Showing:'} <span className="font-semibold text-slate-800">{activeDataset.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> - <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, activeDataset.length)}</span> {isMr ? 'पैकी' : 'of'} <span className="font-bold text-slate-900">{activeDataset.length}</span> {isMr ? 'नोंदी' : 'records'}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
            >
              {isMr ? 'मागे जा / बंद करा' : 'Back / Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDrilldownModal;

