import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import ExpenseCategory, { DEFAULT_EXPENSE_CATEGORIES } from '../models/ExpenseCategory.js';
import AuditLog from '../models/AuditLog.js';
import { generateAtomicVoucherNumber } from '../services/voucherNumberService.js';

/**
 * POST /api/v1/expenses
 * Record an official society expenditure voucher
 */
export const createExpense = async (req, res) => {
  try {
    const {
      titleMarathi,
      titleEnglish,
      category,
      amount,
      expenseDate,
      paymentMethod,
      payeeName,
      transactionRef,
      description,
      attachmentUrl,
      idempotencyKey
    } = req.body;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await Expense.findOne({ idempotencyKey: String(idempotencyKey).trim() });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'हा खर्च व्यवहार आधीच यशस्वीरीत्या नोंदवला गेला आहे (Expense already recorded via idempotency)',
          isDuplicate: true,
          expense: existing
        });
      }
    }

    // 2. Validate Amount
    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'खर्च रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)'
      });
    }

    // 3. Resolve Date, Month, Year
    const dateObj = expenseDate ? new Date(expenseDate) : new Date();
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'अवैध खर्च दिनांक (Invalid expense date)'
      });
    }

    const month = dateObj.getMonth() + 1; // 1-12
    const year = dateObj.getFullYear();

    // 4. Generate Atomic Sequential Voucher Number: EXP-YYYYMM-XXXX
    const voucherNumber = await generateAtomicVoucherNumber(year, month);

    // 5. Persist Expense Document
    const expense = new Expense({
      voucherNumber,
      titleMarathi: String(titleMarathi).trim(),
      titleEnglish: titleEnglish ? String(titleEnglish).trim() : '',
      category: String(category).trim().toUpperCase(),
      amount: numAmount,
      expenseDate: dateObj,
      month,
      year,
      paymentMethod,
      payeeName: String(payeeName).trim(),
      transactionRef: transactionRef ? String(transactionRef).trim() : '',
      description: description ? String(description).trim() : '',
      attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : '',
      idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
      status: 'COMPLETED',
      recordedByAdminId: req.admin._id
    });

    await expense.save();

    // 6. Write Immutable Audit Log
    const auditLog = new AuditLog({
      action: 'EXPENSE_CREATED',
      performedByAdminId: req.admin._id,
      entityType: 'EXPENSE',
      entityId: expense._id,
      details: {
        voucherNumber,
        title: expense.titleMarathi,
        amount: numAmount,
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        payeeName: expense.payeeName,
        expenseDate: dateObj
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await auditLog.save();

    return res.status(201).json({
      success: true,
      message: `व्हाउचर क्रमांक ${voucherNumber} सह खर्च यशस्वीरीत्या नोंदवला गेला (Expense recorded successfully)`,
      expense
    });
  } catch (error) {
    console.error('Error in createExpense:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'खर्च नोंदवताना त्रुटी आली (Failed to record expense)'
    });
  }
};

/**
 * GET /api/v1/expenses
 * List expenses with search, filters, and pagination
 */
export const getExpenses = async (req, res) => {
  try {
    const {
      category,
      paymentMethod,
      status,
      startDate,
      endDate,
      month,
      year,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = String(category).trim().toUpperCase();
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (status) {
      filter.status = status;
    }

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      filter.month = Number(month);
    }

    if (year && Number(year) >= 2020) {
      filter.year = Number(year);
    }

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) {
        filter.expenseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = e;
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { voucherNumber: { $regex: q, $options: 'i' } },
        { titleMarathi: { $regex: q, $options: 'i' } },
        { titleEnglish: { $regex: q, $options: 'i' } },
        { payeeName: { $regex: q, $options: 'i' } },
        { transactionRef: { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, totalCount] = await Promise.all([
      Expense.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('recordedByAdminId', 'fullNameMarathi designation'),
      Expense.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      expenses,
      pagination: {
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error in getExpenses:', error.message);
    return res.status(500).json({
      success: false,
      message: 'खर्च नोंदवही मिळवताना त्रुटी आली (Failed to fetch expenses)'
    });
  }
};

/**
 * GET /api/v1/expenses/:id
 * Retrieve details of an individual expense
 */
export const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध खर्च ओळख क्रमांक (Invalid expense ID)'
      });
    }

    const expense = await Expense.findById(id)
      .populate('recordedByAdminId', 'fullNameMarathi designation')
      .populate('cancelledByAdminId', 'fullNameMarathi designation');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'खर्च नोंद आढळली नाही (Expense record not found)'
      });
    }

    return res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    console.error('Error in getExpenseById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'खर्च तपशील मिळवताना त्रुटी आली (Failed to fetch expense details)'
    });
  }
};

/**
 * PATCH /api/v1/expenses/:id/cancel
 * Audited soft cancellation of an expense with mandatory reason
 */
export const cancelExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const cancellationReason = req.body.cancellationReason || req.body.reason;

    if (!cancellationReason || String(cancellationReason).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'रद्द करण्याचे वैध कारण आवश्यक आहे (किमान ५ अक्षरे) (Mandatory cancellation reason required)'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध खर्च ओळख क्रमांक'
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'खर्च नोंद आढळली नाही'
      });
    }

    if (expense.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'हा खर्च आधीच रद्द करण्यात आलेला आहे (Expense already cancelled)'
      });
    }

    expense.status = 'CANCELLED';
    expense.isCancelled = true;
    expense.cancellationReason = String(cancellationReason).trim();
    expense.cancelledAt = new Date();
    expense.cancelledByAdminId = req.admin._id;

    await expense.save();

    // Write Audit Log
    const auditLog = new AuditLog({
      action: 'EXPENSE_CANCELLED',
      performedByAdminId: req.admin._id,
      entityType: 'EXPENSE',
      entityId: expense._id,
      details: {
        voucherNumber: expense.voucherNumber,
        title: expense.titleMarathi,
        amount: expense.amount,
        cancellationReason: expense.cancellationReason
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await auditLog.save();

    return res.status(200).json({
      success: true,
      message: `व्हाउचर क्रमांक ${expense.voucherNumber} यशस्वीरीत्या रद्द केला गेला (Expense cancelled with audit record)`,
      expense
    });
  } catch (error) {
    console.error('Error in cancelExpense:', error.message);
    return res.status(500).json({
      success: false,
      message: 'खर्च रद्द करताना त्रुटी आली (Failed to cancel expense)'
    });
  }
};

/**
 * GET /api/v1/expenses/categories
 * Get all configurable categories (auto-seeds defaults if empty)
 */
export const getCategories = async (req, res) => {
  try {
    let categories = await ExpenseCategory.find({ isActive: true }).sort({ createdAt: 1 });

    if (categories.length === 0) {
      await ExpenseCategory.insertMany(DEFAULT_EXPENSE_CATEGORIES);
      categories = await ExpenseCategory.find({ isActive: true }).sort({ createdAt: 1 });
    }

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error in getCategories:', error.message);
    return res.status(500).json({
      success: false,
      message: 'वर्गवारी मिळवताना त्रुटी आली'
    });
  }
};

/**
 * POST /api/v1/expenses/categories
 * Add a custom category
 */
export const addCategory = async (req, res) => {
  try {
    const { nameMarathi, nameEnglish, code } = req.body;

    if (!nameMarathi || !code) {
      return res.status(400).json({
        success: false,
        message: 'मराठी नाव आणि वर्गवारी कोड आवश्यक आहे'
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await ExpenseCategory.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'हा वर्गवारी कोड आधीपासून अस्तित्वात आहे'
      });
    }

    const category = await ExpenseCategory.create({
      code: cleanCode,
      nameMarathi: String(nameMarathi).trim(),
      nameEnglish: nameEnglish ? String(nameEnglish).trim() : cleanCode,
      isCustom: true,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'नवीन खर्च वर्गवारी यशस्वीरीत्या जोडली',
      category
    });
  } catch (error) {
    console.error('Error in addCategory:', error.message);
    return res.status(500).json({
      success: false,
      message: 'वर्गवारी जोडताना त्रुटी आली'
    });
  }
};
