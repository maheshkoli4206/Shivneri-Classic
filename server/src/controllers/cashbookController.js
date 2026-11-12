import mongoose from 'mongoose';
import CashbookOpeningBalance from '../models/CashbookOpeningBalance.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';

/**
 * GET /api/v1/cashbook
 * Retrieve full society cashbook with opening, income, expense, and closing balances
 * broken down distinctly by Cash, Bank, UPI, and Cheque.
 */
export const getCashbook = async (req, res) => {
  try {
    const { month, year, startDate, endDate } = req.query;

    // 1. Fetch Opening Balance Configuration
    let openingConfig = await CashbookOpeningBalance.findOne({
      singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON'
    });

    if (!openingConfig) {
      openingConfig = {
        cashAmount: 0,
        bankAmount: 0,
        upiAmount: 0,
        chequeAmount: 0,
        isConfigured: false,
        effectiveDate: new Date()
      };
    }

    // 2. Build Date Filters
    const paymentFilter = { status: 'COMPLETED' };
    const expenseFilter = { status: 'COMPLETED' };

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      paymentFilter.month = Number(month);
      expenseFilter.month = Number(month);
    }

    if (year && Number(year) >= 2020) {
      paymentFilter.year = Number(year);
      expenseFilter.year = Number(year);
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

    // 3. Aggregate Collections / Income by Payment Mode
    const incomeAgg = await Payment.aggregate([
      { $match: paymentFilter },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amountReceived' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 4. Aggregate Expenses by Payment Mode (Cancelled entries are strictly excluded)
    const expenseAgg = await Expense.aggregate([
      { $match: expenseFilter },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Build Map for Incomes and Expenses per mode
    const incomeByMode = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, CHEQUE: 0 };
    incomeAgg.forEach(item => {
      if (incomeByMode[item._id] !== undefined) {
        incomeByMode[item._id] = item.totalAmount;
      }
    });

    const expenseByMode = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, CHEQUE: 0 };
    expenseAgg.forEach(item => {
      if (expenseByMode[item._id] !== undefined) {
        expenseByMode[item._id] = item.totalAmount;
      }
    });

    const totalIncome = Object.values(incomeByMode).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expenseByMode).reduce((a, b) => a + b, 0);

    // 6. Calculate Mode-wise Opening & Closing Balances (Preserving Strict Mode Separation)
    const openingBalances = {
      cash: openingConfig.cashAmount || 0,
      bank: openingConfig.bankAmount || 0,
      upi: openingConfig.upiAmount || 0,
      cheque: openingConfig.chequeAmount || 0,
      total:
        (openingConfig.cashAmount || 0) +
        (openingConfig.bankAmount || 0) +
        (openingConfig.upiAmount || 0) +
        (openingConfig.chequeAmount || 0)
    };

    const closingBalances = {
      cash: openingBalances.cash + incomeByMode.CASH - expenseByMode.CASH,
      bank: openingBalances.bank + incomeByMode.BANK_TRANSFER - expenseByMode.BANK_TRANSFER,
      upi: openingBalances.upi + incomeByMode.UPI - expenseByMode.UPI,
      cheque: openingBalances.cheque + incomeByMode.CHEQUE - expenseByMode.CHEQUE,
      total:
        openingBalances.total + totalIncome - totalExpenses
    };

    // 7. Chronological Transactions Timeline (Date-wise Ledger)
    const [paymentsList, expensesList] = await Promise.all([
      Payment.find(paymentFilter)
        .select('receiptNumber residentNameMarathi amountReceived paymentDate paymentMethod transactionRef')
        .lean(),
      Expense.find(expenseFilter)
        .select('voucherNumber titleMarathi amount expenseDate paymentMethod payeeName category transactionRef')
        .lean()
    ]);

    const transactions = [];

    paymentsList.forEach(p => {
      const amountVal = typeof p.amountReceived === 'number' ? p.amountReceived : (Number(p.amountReceived) || 0);
      transactions.push({
        id: p._id,
        date: p.paymentDate,
        type: 'INCOME',
        refNumber: p.receiptNumber,
        reference: p.receiptNumber,
        title: `देखभाल जमा: ${p.residentNameMarathi}`,
        party: p.residentNameMarathi,
        method: p.paymentMethod,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef,
        amount: amountVal,
        amountIn: amountVal,
        amountOut: 0
      });
    });

    expensesList.forEach(e => {
      const amountVal = typeof e.amount === 'number' ? e.amount : (Number(e.amount) || 0);
      transactions.push({
        id: e._id,
        date: e.expenseDate,
        type: 'EXPENSE',
        refNumber: e.voucherNumber,
        reference: e.voucherNumber,
        title: `${e.titleMarathi} (${e.category})`,
        party: e.payeeName,
        method: e.paymentMethod,
        paymentMethod: e.paymentMethod,
        transactionRef: e.transactionRef,
        amount: amountVal,
        amountIn: 0,
        amountOut: amountVal
      });
    });

    // Sort chronologically ascending
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance safely with finite checks
    let running = Number.isFinite(openingBalances.total) ? Number(openingBalances.total) : 0;
    const ledger = transactions.map(t => {
      const inVal = Number.isFinite(t.amountIn) ? t.amountIn : 0;
      const outVal = Number.isFinite(t.amountOut) ? t.amountOut : 0;
      running = Math.round((running + inVal - outVal) * 100) / 100;
      return {
        ...t,
        runningBalance: running
      };
    });

    const data = {
      openingBalances: {
        CASH: openingBalances.cash,
        BANK_TRANSFER: openingBalances.bank,
        UPI: openingBalances.upi,
        CHEQUE: openingBalances.cheque,
        total: openingBalances.total,
        effectiveDate: openingConfig.effectiveDate || null
      },
      byMode: {
        CASH: {
          opening: openingBalances.cash,
          income: incomeByMode.CASH,
          expense: expenseByMode.CASH,
          closing: closingBalances.cash
        },
        BANK_TRANSFER: {
          opening: openingBalances.bank,
          income: incomeByMode.BANK_TRANSFER,
          expense: expenseByMode.BANK_TRANSFER,
          closing: closingBalances.bank
        },
        UPI: {
          opening: openingBalances.upi,
          income: incomeByMode.UPI,
          expense: expenseByMode.UPI,
          closing: closingBalances.upi
        },
        CHEQUE: {
          opening: openingBalances.cheque,
          income: incomeByMode.CHEQUE,
          expense: expenseByMode.CHEQUE,
          closing: closingBalances.cheque
        }
      },
      summary: {
        totalOpeningBalance: openingBalances.total,
        totalIncome,
        totalExpense: totalExpenses,
        netSurplusDeficit: totalIncome - totalExpenses,
        totalClosingBalance: closingBalances.total
      },
      ledgerCount: ledger.length,
      ledger
    };

    return res.status(200).json({
      success: true,
      data,
      cashbook: {
        ...data,
        openingBalances,
        incomeByMode,
        expenseByMode,
        totalIncome,
        totalExpenses,
        netSurplus: totalIncome - totalExpenses,
        closingBalances,
        isOpeningConfigured: openingConfig.isConfigured || false,
        effectiveDate: openingConfig.effectiveDate || null
      }
    });
  } catch (error) {
    console.error('Error in getCashbook:', error.message);
    return res.status(500).json({
      success: false,
      message: 'कॅशबुक माहिती मिळवताना त्रुटी आली (Failed to fetch cashbook)'
    });
  }
};

/**
 * GET /api/v1/cashbook/opening-balance
 * Get opening balance configuration
 */
export const getOpeningBalance = async (req, res) => {
  try {
    const config = await CashbookOpeningBalance.findOne({
      singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON'
    }).populate('updatedByAdminId', 'fullNameMarathi designation');

    return res.status(200).json({
      success: true,
      config: config || {
        cashAmount: 0,
        bankAmount: 0,
        upiAmount: 0,
        chequeAmount: 0,
        isConfigured: false,
        effectiveDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error in getOpeningBalance:', error.message);
    return res.status(500).json({
      success: false,
      message: 'आरंभी शिल्लक मिळवताना त्रुटी आली'
    });
  }
};

/**
 * PUT /api/v1/cashbook/opening-balance
 * Update opening balance configuration with audit trail
 */
export const updateOpeningBalance = async (req, res) => {
  try {
    const {
      cashAmount = 0,
      bankAmount = 0,
      upiAmount = 0,
      chequeAmount = 0,
      effectiveDate,
      notes = ''
    } = req.body;

    const numCash = Math.max(0, Math.round(Number(cashAmount) * 100) / 100);
    const numBank = Math.max(0, Math.round(Number(bankAmount) * 100) / 100);
    const numUpi = Math.max(0, Math.round(Number(upiAmount) * 100) / 100);
    const numCheque = Math.max(0, Math.round(Number(chequeAmount) * 100) / 100);

    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    const snapshot = {
      cashAmount: numCash,
      bankAmount: numBank,
      upiAmount: numUpi,
      chequeAmount: numCheque,
      effectiveDate: effDate,
      notes: String(notes).trim(),
      updatedAt: new Date(),
      updatedByAdminId: req.admin._id
    };

    const config = await CashbookOpeningBalance.findOneAndUpdate(
      { singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON' },
      {
        $set: {
          singletonKey: 'CASHBOOK_OPENING_BALANCE_SINGLETON',
          cashAmount: numCash,
          bankAmount: numBank,
          upiAmount: numUpi,
          chequeAmount: numCheque,
          effectiveDate: effDate,
          isConfigured: true,
          notes: String(notes).trim(),
          updatedByAdminId: req.admin._id
        },
        $push: { history: snapshot }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Write Audit Log
    const auditLog = new AuditLog({
      action: 'MAINTENANCE_CONFIG_UPDATED',
      performedByAdminId: req.admin._id,
      entityType: 'ADMIN',
      entityId: req.admin._id,
      details: {
        operation: 'CASHBOOK_OPENING_BALANCE_UPDATED',
        cashAmount: numCash,
        bankAmount: numBank,
        upiAmount: numUpi,
        chequeAmount: numCheque,
        effectiveDate: effDate,
        notes: String(notes).trim()
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await auditLog.save();

    return res.status(200).json({
      success: true,
      message: 'कॅशबुक आरंभी शिल्लक यशस्वीरीत्या जतन केली गेली (Opening balance updated successfully)',
      config
    });
  } catch (error) {
    console.error('Error in updateOpeningBalance:', error.message);
    return res.status(500).json({
      success: false,
      message: 'आरंभी शिल्लक जतन करताना त्रुटी आली'
    });
  }
};
