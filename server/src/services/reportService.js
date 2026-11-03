import mongoose from 'mongoose';
import MaintenanceDue from '../models/MaintenanceDue.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Resident from '../models/Resident.js';
import CashbookOpeningBalance from '../models/CashbookOpeningBalance.js';

const MONTH_NAMES_MR = [
  '',
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
  '',
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

const CATEGORY_NAMES_MR = {
  ELECTRICITY: 'विद्युत / वीज बिल (Electricity)',
  WATER: 'पाणीपुरवठा बिल (Water)',
  CLEANING: 'स्वच्छता व कचरा व्यवस्थापन (Cleaning)',
  SECURITY: 'सुरक्षा रक्षक मानधन (Security)',
  'REPAIRS AND MAINTENANCE': 'दुरुस्ती व देखभाल (Repairs)',
  PLUMBING: 'प्लंबिंग व ड्रेनेज (Plumbing)',
  'LIFT MAINTENANCE': 'लिफ्ट मेंटेनन्स (Lift AMC)',
  'GARDEN MAINTENANCE': 'बागकाम व बाग देखभाल (Garden)',
  OTHER: 'इतर किरकोळ खर्च (Other)'
};

/**
 * 1. Executive Overview / Dashboard Analytics
 * Computes live, aggregated financial KPIs from MongoDB without hardcoding
 */
export async function getDashboardOverview(filters = {}) {
  const { year, month, startDate, endDate } = filters;

  const dueMatch = {};
  const paymentMatch = { status: 'COMPLETED', isCancelled: { $ne: true } };
  const expenseMatch = { status: 'COMPLETED', isCancelled: { $ne: true } };

  if (year && Number(year) >= 2020) {
    dueMatch.year = Number(year);
    paymentMatch.year = Number(year);
    expenseMatch.year = Number(year);
  }

  if (month && Number(month) >= 1 && Number(month) <= 12) {
    dueMatch.month = Number(month);
    paymentMatch.month = Number(month);
    expenseMatch.month = Number(month);
  }

  if (startDate || endDate) {
    paymentMatch.paymentDate = {};
    expenseMatch.expenseDate = {};
    if (startDate) {
      paymentMatch.paymentDate.$gte = new Date(startDate);
      expenseMatch.expenseDate.$gte = new Date(startDate);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      paymentMatch.paymentDate.$lte = e;
      expenseMatch.expenseDate.$lte = e;
    }
  }

  // 1. Maintenance Dues Aggregation
  const [duesSummary] = await MaintenanceDue.aggregate([
    { $match: dueMatch },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: '$totalAmountDue' },
        totalPaidOnDues: { $sum: '$amountPaid' },
        totalOutstanding: { $sum: '$outstandingBalance' },
        totalBillsCount: { $sum: 1 },
        fullPaidBillsCount: {
          $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
        },
        partialPaidBillsCount: {
          $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] }
        },
        unpaidBillsCount: {
          $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] }
        }
      }
    }
  ]) || [{
    totalBilled: 0,
    totalPaidOnDues: 0,
    totalOutstanding: 0,
    totalBillsCount: 0,
    fullPaidBillsCount: 0,
    partialPaidBillsCount: 0,
    unpaidBillsCount: 0
  }];

  // 2. Payments (Actual Collections) Aggregation
  const [paymentSummary] = await Payment.aggregate([
    { $match: paymentMatch },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: '$amountReceived' },
        completedPaymentsCount: { $sum: 1 }
      }
    }
  ]) || [{ totalCollected: 0, completedPaymentsCount: 0 }];

  // 3. Expenses Aggregation (Strictly non-cancelled)
  const [expenseSummary] = await Expense.aggregate([
    { $match: expenseMatch },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' },
        activeExpensesCount: { $sum: 1 }
      }
    }
  ]) || [{ totalExpenses: 0, activeExpensesCount: 0 }];

  // 4. Cancelled Counts & Amounts
  const [cancelledPaymentsSummary] = await Payment.aggregate([
    { $match: { isCancelled: true } },
    {
      $group: {
        _id: null,
        totalCancelledPaymentsAmount: { $sum: '$amountReceived' },
        cancelledPaymentsCount: { $sum: 1 }
      }
    }
  ]) || [{ totalCancelledPaymentsAmount: 0, cancelledPaymentsCount: 0 }];

  const [cancelledExpensesSummary] = await Expense.aggregate([
    { $match: { isCancelled: true } },
    {
      $group: {
        _id: null,
        totalCancelledExpensesAmount: { $sum: '$amount' },
        cancelledExpensesCount: { $sum: 1 }
      }
    }
  ]) || [{ totalCancelledExpensesAmount: 0, cancelledExpensesCount: 0 }];

  const totalBilled = duesSummary?.totalBilled || 0;
  const totalCollected = paymentSummary?.totalCollected || 0;
  const totalOutstanding = duesSummary?.totalOutstanding || 0;
  const totalExpenses = expenseSummary?.totalExpenses || 0;

  const collectionPercentage = totalBilled > 0
    ? Math.round((totalCollected / totalBilled) * 10000) / 100
    : 0;

  const netSurplusDeficit = totalCollected - totalExpenses;

  // 5. Resident status breakdown (Distinct residents)
  const activeResidents = await Resident.find({ status: 'ACTIVE' }).select('_id fullNameMarathi flatNumber wing');
  const residentDuesSummary = await MaintenanceDue.aggregate([
    { $match: dueMatch },
    {
      $group: {
        _id: '$residentId',
        totalBilled: { $sum: '$totalAmountDue' },
        totalPaid: { $sum: '$amountPaid' },
        totalOutstanding: { $sum: '$outstandingBalance' }
      }
    }
  ]);

  let residentsFullyClearedCount = 0;
  let residentsWithPendingDuesCount = 0;
  let residentsWithPartialDuesCount = 0;

  activeResidents.forEach(res => {
    const summary = residentDuesSummary.find(d => d._id?.toString() === res._id?.toString());
    if (!summary || summary.totalOutstanding <= 0) {
      residentsFullyClearedCount++;
    } else if (summary.totalPaid > 0 && summary.totalOutstanding > 0) {
      residentsWithPartialDuesCount++;
    } else {
      residentsWithPendingDuesCount++;
    }
  });

  return {
    overview: {
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionPercentage,
      totalExpenses,
      netSurplusDeficit,
      duesCounts: {
        totalBills: duesSummary?.totalBillsCount || 0,
        fullPaidBills: duesSummary?.fullPaidBillsCount || 0,
        partialPaidBills: duesSummary?.partialPaidBillsCount || 0,
        unpaidBills: duesSummary?.unpaidBillsCount || 0
      },
      residentCounts: {
        totalActiveResidents: activeResidents.length,
        residentsFullyCleared: residentsFullyClearedCount,
        residentsWithPartialDues: residentsWithPartialDuesCount,
        residentsWithPendingDues: residentsWithPendingDuesCount
      },
      vouchers: {
        activeExpensesCount: expenseSummary?.activeExpensesCount || 0,
        completedPaymentsCount: paymentSummary?.completedPaymentsCount || 0
      },
      cancelled: {
        paymentsCount: cancelledPaymentsSummary?.cancelledPaymentsCount || 0,
        paymentsAmount: cancelledPaymentsSummary?.totalCancelledPaymentsAmount || 0,
        expensesCount: cancelledExpensesSummary?.cancelledExpensesCount || 0,
        expensesAmount: cancelledExpensesSummary?.totalCancelledExpensesAmount || 0
      }
    }
  };
}

/**
 * 2. Maintenance Reports Engine
 * Month-wise, resident-wise, pending, partial, and full payment reports
 */
export async function getMaintenanceReport(filters = {}) {
  const { year, month, residentId, status } = filters;

  const match = {};
  if (year && Number(year) >= 2020) match.year = Number(year);
  if (month && Number(month) >= 1 && Number(month) <= 12) match.month = Number(month);
  if (residentId && mongoose.Types.ObjectId.isValid(residentId)) {
    match.residentId = new mongoose.Types.ObjectId(residentId);
  }
  if (status && ['UNPAID', 'PARTIAL', 'PAID'].includes(status)) {
    match.status = status;
  }

  // 1. Month-wise Maintenance Collections
  const monthWiseCollections = await MaintenanceDue.aggregate([
    { $match: year ? { year: Number(year) } : {} },
    {
      $group: {
        _id: { year: '$year', month: '$month' },
        totalBilled: { $sum: '$totalAmountDue' },
        totalPaid: { $sum: '$amountPaid' },
        totalOutstanding: { $sum: '$outstandingBalance' },
        totalBills: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
        partialCount: { $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);

  const formattedMonthWise = monthWiseCollections.map(item => {
    const m = item._id.month;
    const y = item._id.year;
    const billed = item.totalBilled || 0;
    const paid = item.totalPaid || 0;
    const collPct = billed > 0 ? Math.round((paid / billed) * 10000) / 100 : 0;
    return {
      year: y,
      month: m,
      monthNameMarathi: MONTH_NAMES_MR[m] || `${m}`,
      monthNameEnglish: MONTH_NAMES_EN[m] || `${m}`,
      totalBilled: billed,
      totalPaid: paid,
      totalOutstanding: item.totalOutstanding || 0,
      collectionPercentage: collPct,
      totalBills: item.totalBills,
      paidCount: item.paidCount,
      partialCount: item.partialCount,
      unpaidCount: item.unpaidCount
    };
  });

  // 2. Resident-wise Roster Report (Preserves all 16 approved residents)
  const allResidents = await Resident.find().sort({ flatNumber: 1 });
  const allDues = await MaintenanceDue.find(match)
    .populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber')
    .sort({ year: -1, month: -1, flatNumber: 1 })
    .lean();

  const residentSummaries = await Promise.all(
    allResidents.map(async (resDoc) => {
      const resDues = await MaintenanceDue.find({
        residentId: resDoc._id,
        ...(year ? { year: Number(year) } : {})
      }).sort({ year: -1, month: -1 }).lean();

      const totalBilled = resDues.reduce((acc, d) => acc + (d.totalAmountDue || 0), 0);
      const totalPaid = resDues.reduce((acc, d) => acc + (d.amountPaid || 0), 0);
      const totalOutstanding = resDues.reduce((acc, d) => acc + (d.outstandingBalance || 0), 0);

      // Fetch resident payments
      const payments = await Payment.find({
        residentId: resDoc._id,
        status: 'COMPLETED',
        isCancelled: { $ne: true },
        ...(year ? { year: Number(year) } : {})
      }).sort({ paymentDate: -1 }).lean();

      return {
        residentId: resDoc._id,
        fullNameMarathi: resDoc.fullNameMarathi,
        flatNumber: resDoc.flatNumber,
        wing: resDoc.wing,
        status: resDoc.status,
        mobileNumber: resDoc.mobileNumber || '-',
        totalBilled,
        totalPaid,
        totalOutstanding,
        duesCount: resDues.length,
        paymentsCount: payments.length,
        overallStatus: totalOutstanding <= 0 ? 'CLEARED' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
        payments: payments.map(p => ({
          receiptNumber: p.receiptNumber,
          amountReceived: p.amountReceived,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          month: p.month,
          year: p.year
        }))
      };
    })
  );

  // 3. Year-wise Maintenance Summary
  const yearWiseSummary = await MaintenanceDue.aggregate([
    {
      $group: {
        _id: '$year',
        totalBilled: { $sum: '$totalAmountDue' },
        totalPaid: { $sum: '$amountPaid' },
        totalOutstanding: { $sum: '$outstandingBalance' },
        billsCount: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]).then(results =>
    results.map(r => ({
      year: r._id,
      totalBilled: r.totalBilled,
      totalPaid: r.totalPaid,
      totalOutstanding: r.totalOutstanding,
      collectionPercentage: r.totalBilled > 0
        ? Math.round((r.totalPaid / r.totalBilled) * 10000) / 100
        : 0,
      billsCount: r.billsCount
    }))
  );

  // 4. Pending, Partial, and Full Dues Collections
  const pendingDues = allDues.filter(d => d.status === 'UNPAID');
  const partialDues = allDues.filter(d => d.status === 'PARTIAL');
  const fullPaidDues = allDues.filter(d => d.status === 'PAID');

  return {
    monthWiseCollections: formattedMonthWise,
    residentSummaries,
    yearWiseSummary,
    pendingDues,
    partialDues,
    fullPaidDues,
    filteredDues: allDues
  };
}

/**
 * 3. Expense Reports Engine
 * Month-wise, category-wise, mode-wise, vendor-wise, and cancelled history
 */
export async function getExpenseReport(filters = {}) {
  const { year, month, category, paymentMethod, startDate, endDate } = filters;

  const match = { status: 'COMPLETED', isCancelled: { $ne: true } };

  if (year && Number(year) >= 2020) match.year = Number(year);
  if (month && Number(month) >= 1 && Number(month) <= 12) match.month = Number(month);
  if (category) match.category = String(category).trim().toUpperCase();
  if (paymentMethod) match.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      match.expenseDate.$lte = e;
    }
  }

  // 1. Month-wise Expenses
  const monthWiseExpenses = await Expense.aggregate([
    { $match: year ? { year: Number(year), status: 'COMPLETED', isCancelled: { $ne: true } } : { status: 'COMPLETED', isCancelled: { $ne: true } } },
    {
      $group: {
        _id: { year: '$year', month: '$month' },
        totalAmount: { $sum: '$amount' },
        vouchersCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]).then(res =>
    res.map(r => ({
      year: r._id.year,
      month: r._id.month,
      monthNameMarathi: MONTH_NAMES_MR[r._id.month] || `${r._id.month}`,
      monthNameEnglish: MONTH_NAMES_EN[r._id.month] || `${r._id.month}`,
      totalAmount: r.totalAmount,
      vouchersCount: r.vouchersCount
    }))
  );

  // Total active expense amount for percentage computation
  const totalActiveExpenseSum = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const grandTotalActiveExpenses = totalActiveExpenseSum[0]?.total || 0;

  // 2. Category-wise Breakdown
  const categoryBreakdown = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        vouchersCount: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]).then(res =>
    res.map(r => {
      const cat = r._id;
      const pct = grandTotalActiveExpenses > 0
        ? Math.round((r.totalAmount / grandTotalActiveExpenses) * 10000) / 100
        : 0;
      return {
        category: cat,
        categoryNameMarathi: CATEGORY_NAMES_MR[cat] || cat,
        totalAmount: r.totalAmount,
        vouchersCount: r.vouchersCount,
        percentage: pct
      };
    })
  );

  // 3. Payment-mode-wise Breakdown
  const modeBreakdown = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        vouchersCount: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]).then(res =>
    res.map(r => ({
      paymentMethod: r._id,
      totalAmount: r.totalAmount,
      vouchersCount: r.vouchersCount,
      percentage: grandTotalActiveExpenses > 0
        ? Math.round((r.totalAmount / grandTotalActiveExpenses) * 10000) / 100
        : 0
    }))
  );

  // 4. Vendor / Payee-wise Report
  const payeeBreakdown = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$payeeName',
        totalAmount: { $sum: '$amount' },
        vouchersCount: { $sum: 1 },
        lastExpenseDate: { $max: '$expenseDate' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]).then(res =>
    res.map(r => ({
      payeeName: r._id,
      totalAmount: r.totalAmount,
      vouchersCount: r.vouchersCount,
      lastExpenseDate: r.lastExpenseDate
    }))
  );

  // 5. Cancelled Expenses History (Strictly audited separate list)
  const cancelledExpenses = await Expense.find({
    $or: [{ status: 'CANCELLED' }, { isCancelled: true }]
  })
    .sort({ cancelledAt: -1, createdAt: -1 })
    .populate('cancelledByAdminId', 'fullNameMarathi designation')
    .lean();

  const totalCancelledAmount = cancelledExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 6. Active Expenses List
  const activeExpensesList = await Expense.find(match)
    .sort({ expenseDate: -1, createdAt: -1 })
    .lean();

  return {
    grandTotalActiveExpenses,
    monthWiseExpenses,
    categoryBreakdown,
    modeBreakdown,
    payeeBreakdown,
    cancelledExpenses: {
      count: cancelledExpenses.length,
      totalAmount: totalCancelledAmount,
      vouchers: cancelledExpenses
    },
    activeExpensesList
  };
}

/**
 * 4. Cashbook & Financial Reports Engine
 * Segregated mode-wise accounting (Cash, Bank, UPI, Cheque non-mingled)
 */
export async function getFinancialSummaryReport(filters = {}) {
  const { year, month, startDate, endDate } = filters;

  // 1. Fetch Opening Balance Config
  const openingConfig = await CashbookOpeningBalance.findOne({
    singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON'
  });

  const isConfigured = Boolean(openingConfig?.isConfigured);
  const openingBalances = {
    cash: openingConfig?.cashAmount || 0,
    bank: openingConfig?.bankAmount || 0,
    upi: openingConfig?.upiAmount || 0,
    cheque: openingConfig?.chequeAmount || 0,
    total:
      (openingConfig?.cashAmount || 0) +
      (openingConfig?.bankAmount || 0) +
      (openingConfig?.upiAmount || 0) +
      (openingConfig?.chequeAmount || 0),
    effectiveDate: openingConfig?.effectiveDate || null,
    isConfigured,
    notes: openingConfig?.notes || ''
  };

  // 2. Match filters for payments and expenses
  const paymentFilter = { status: 'COMPLETED', isCancelled: { $ne: true } };
  const expenseFilter = { status: 'COMPLETED', isCancelled: { $ne: true } };

  if (year && Number(year) >= 2020) {
    paymentFilter.year = Number(year);
    expenseFilter.year = Number(year);
  }

  if (month && Number(month) >= 1 && Number(month) <= 12) {
    paymentFilter.month = Number(month);
    expenseFilter.month = Number(month);
  }

  if (startDate || endDate) {
    paymentFilter.paymentDate = {};
    expenseFilter.expenseDate = {};
    if (startDate) {
      paymentFilter.paymentDate.$gte = new Date(startDate);
      expenseFilter.expenseDate.$gte = new Date(startDate);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      paymentFilter.paymentDate.$lte = e;
      expenseFilter.expenseDate.$lte = e;
    }
  }

  // 3. Aggregations by mode
  const [incomeByModeRaw, expenseByModeRaw] = await Promise.all([
    Payment.aggregate([
      { $match: paymentFilter },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amountReceived' }, count: { $sum: 1 } } }
    ]),
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const incomeMap = { CASH: 0, BANK_TRANSFER: 0, UPI: 0, CHEQUE: 0 };
  incomeByModeRaw.forEach(i => {
    if (incomeMap[i._id] !== undefined) incomeMap[i._id] = i.total;
  });

  const expenseMap = { CASH: 0, BANK_TRANSFER: 0, UPI: 0, CHEQUE: 0 };
  expenseByModeRaw.forEach(e => {
    if (expenseMap[e._id] !== undefined) expenseMap[e._id] = e.total;
  });

  const totalIncome = Object.values(incomeMap).reduce((a, b) => a + b, 0);
  const totalExpenses = Object.values(expenseMap).reduce((a, b) => a + b, 0);

  // 4. Segregated Mode-Wise Balances (STRICT NON-COMMINGLING)
  const modeWise = {
    CASH: {
      opening: openingBalances.cash,
      income: incomeMap.CASH,
      expense: expenseMap.CASH,
      closing: openingBalances.cash + incomeMap.CASH - expenseMap.CASH
    },
    BANK_TRANSFER: {
      opening: openingBalances.bank,
      income: incomeMap.BANK_TRANSFER,
      expense: expenseMap.BANK_TRANSFER,
      closing: openingBalances.bank + incomeMap.BANK_TRANSFER - expenseMap.BANK_TRANSFER
    },
    UPI: {
      opening: openingBalances.upi,
      income: incomeMap.UPI,
      expense: expenseMap.UPI,
      closing: openingBalances.upi + incomeMap.UPI - expenseMap.UPI
    },
    CHEQUE: {
      opening: openingBalances.cheque,
      income: incomeMap.CHEQUE,
      expense: expenseMap.CHEQUE,
      closing: openingBalances.cheque + incomeMap.CHEQUE - expenseMap.CHEQUE
    }
  };

  const totalClosingBalance =
    modeWise.CASH.closing +
    modeWise.BANK_TRANSFER.closing +
    modeWise.UPI.closing +
    modeWise.CHEQUE.closing;

  // 5. Monthly Financial Performance Matrix
  const performanceYears = year ? [Number(year)] : [2026, 2027];
  const monthlyPerformance = [];

  for (const y of performanceYears) {
    for (let m = 1; m <= 12; m++) {
      const [mInc] = await Payment.aggregate([
        { $match: { year: y, month: m, status: 'COMPLETED', isCancelled: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amountReceived' } } }
      ]);
      const [mExp] = await Expense.aggregate([
        { $match: { year: y, month: m, status: 'COMPLETED', isCancelled: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const inc = mInc?.total || 0;
      const exp = mExp?.total || 0;
      if (inc > 0 || exp > 0) {
        monthlyPerformance.push({
          year: y,
          month: m,
          monthNameMarathi: MONTH_NAMES_MR[m] || `${m}`,
          monthNameEnglish: MONTH_NAMES_EN[m] || `${m}`,
          income: inc,
          expense: exp,
          netSurplusDeficit: inc - exp
        });
      }
    }
  }

  return {
    openingBalances,
    modeWise,
    totals: {
      totalOpeningBalance: openingBalances.total,
      totalIncome,
      totalExpenses,
      netSurplusDeficit: totalIncome - totalExpenses,
      totalClosingBalance
    },
    monthlyPerformance
  };
}

/**
 * 5. Visual Charts Data Engine
 * Real MongoDB aggregated time series and distribution arrays
 */
export async function getChartsData(filters = {}) {
  const targetYear = filters.year ? Number(filters.year) : new Date().getFullYear();

  // 1. 12-Month Arrays for Collection, Expense, and Surplus
  const monthlyCollectionTrend = [];
  const monthlyExpenseTrend = [];
  const incomeVsExpense = [];

  for (let m = 1; m <= 12; m++) {
    // Dues billed in month
    const [dueAgg] = await MaintenanceDue.aggregate([
      { $match: { year: targetYear, month: m } },
      {
        $group: {
          _id: null,
          billed: { $sum: '$totalAmountDue' },
          paidOnBills: { $sum: '$amountPaid' },
          outstanding: { $sum: '$outstandingBalance' }
        }
      }
    ]);

    // Payments collected in month
    const [payAgg] = await Payment.aggregate([
      { $match: { year: targetYear, month: m, status: 'COMPLETED', isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amountReceived' } } }
    ]);

    // Expenses in month
    const [expAgg] = await Expense.aggregate([
      { $match: { year: targetYear, month: m, status: 'COMPLETED', isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const billed = dueAgg?.billed || 0;
    const collected = payAgg?.total || 0;
    const outstanding = dueAgg?.outstanding || 0;
    const expense = expAgg?.total || 0;
    const collPct = billed > 0 ? Math.round((collected / billed) * 10000) / 100 : 0;

    monthlyCollectionTrend.push({
      month: m,
      monthNameMarathi: MONTH_NAMES_MR[m],
      monthNameEnglish: MONTH_NAMES_EN[m],
      billed,
      collected,
      outstanding,
      collectionPercentage: collPct
    });

    monthlyExpenseTrend.push({
      month: m,
      monthNameMarathi: MONTH_NAMES_MR[m],
      monthNameEnglish: MONTH_NAMES_EN[m],
      expenseAmount: expense,
      voucherCount: expAgg?.count || 0
    });

    incomeVsExpense.push({
      month: m,
      monthNameMarathi: MONTH_NAMES_MR[m],
      monthNameEnglish: MONTH_NAMES_EN[m],
      income: collected,
      expense,
      surplus: collected - expense
    });
  }

  // 2. Category Distribution (Pie / Donut chart)
  const categoryAgg = await Expense.aggregate([
    { $match: { year: targetYear, status: 'COMPLETED', isCancelled: { $ne: true } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ]);

  const totalYearExpense = categoryAgg.reduce((acc, c) => acc + c.total, 0);
  const categoryDistribution = categoryAgg.map(c => ({
    category: c._id,
    categoryNameMarathi: CATEGORY_NAMES_MR[c._id] || c._id,
    amount: c.total,
    percentage: totalYearExpense > 0 ? Math.round((c.total / totalYearExpense) * 10000) / 100 : 0
  }));

  // 3. Status Breakdown (Paid vs Partial vs Unpaid)
  const [statusAgg] = await MaintenanceDue.aggregate([
    { $match: { year: targetYear } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
        partialCount: { $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] } }
      }
    }
  ]) || [{ total: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 }];

  const totalStatusBills = statusAgg?.total || 0;
  const statusBreakdown = {
    total: totalStatusBills,
    paidCount: statusAgg?.paidCount || 0,
    partialCount: statusAgg?.partialCount || 0,
    unpaidCount: statusAgg?.unpaidCount || 0,
    paidPercent: totalStatusBills > 0 ? Math.round(((statusAgg?.paidCount || 0) / totalStatusBills) * 10000) / 100 : 0,
    partialPercent: totalStatusBills > 0 ? Math.round(((statusAgg?.partialCount || 0) / totalStatusBills) * 10000) / 100 : 0,
    unpaidPercent: totalStatusBills > 0 ? Math.round(((statusAgg?.unpaidCount || 0) / totalStatusBills) * 10000) / 100 : 0
  };

  return {
    year: targetYear,
    monthlyCollectionTrend,
    monthlyExpenseTrend,
    incomeVsExpense,
    categoryDistribution,
    statusBreakdown
  };
}
