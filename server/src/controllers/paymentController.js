import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import AdvancePayment from '../models/AdvancePayment.js';
import MaintenanceDue from '../models/MaintenanceDue.js';
import Resident from '../models/Resident.js';
import AuditLog from '../models/AuditLog.js';
import { generateAtomicReceiptNumber } from '../services/receiptNumberService.js';
import { generateReceiptPDF } from '../services/pdfReceiptService.js';

/**
 * Check if the current MongoDB connection supports multi-document transactions
 * (Supported on Replica Sets and Mongos, but not on standalone single instances)
 */
const canUseTransactions = () => {
  const desc = mongoose.connection.client?.topology?.description;
  return Boolean(desc?.setName || desc?.type === 'ReplicaSetWithPrimary' || desc?.type === 'Sharded');
};

/**
 * POST /api/v1/payments/record
 * Record a manual payment against an existing maintenance due and generate an atomic receipt
 */
export const recordPayment = async (req, res) => {
  let session = null;
  const isTxSupported = canUseTransactions();

  try {
    const {
      maintenanceDueId,
      amountReceived,
      paymentDate,
      paymentMethod,
      transactionRef,
      remarks,
      idempotencyKey
    } = req.body;

    // 1. Idempotency Check: Prevent duplicate submissions
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ idempotencyKey: String(idempotencyKey).trim() });
      if (existingPayment) {
        return res.status(200).json({
          success: true,
          message: 'हा पेमेंट व्यवहार आधीच यशस्वीरीत्या नोंदवला गेला आहे (Payment already recorded via idempotency)',
          isDuplicate: true,
          payment: existingPayment
        });
      }
    }

    // 2. Validate Amount Received
    const numAmount = Math.round(Number(amountReceived) * 100) / 100;
    if (isNaN(numAmount) || numAmount < 0.01) {
      return res.status(400).json({
        success: false,
        message: 'जमा रक्कम किमान ₹०.०१ असावी (Amount must be at least ₹0.01)'
      });
    }

    // 3. Initiate Transaction if supported
    if (isTxSupported) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    // 4. Fetch and Validate Maintenance Due
    const query = MaintenanceDue.findById(maintenanceDueId);
    if (session) query.session(session);
    const due = await query;

    if (!due) {
      if (session) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'संबंधित मासिक देयक नोंद आढळली नाही (Maintenance due not found)'
      });
    }

    // Calculate remaining balance before this payment
    const currentRemaining = Math.round(
      Number(due.outstandingBalance !== undefined ? due.outstandingBalance : (due.totalAmountDue - due.amountPaid - (due.advanceAdjustedAmount || 0))) * 100
    ) / 100;

    if (due.status === 'PAID' || currentRemaining <= 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'या देयकाची संपूर्ण रक्कम आधीच भरलेली आहे (This maintenance bill is already fully paid)'
      });
    }

    // Strict Overpayment Check: No overpayments allowed in normal payment
    if (numAmount > currentRemaining) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `जमा रक्कम (₹${numAmount}) ही शिल्लक थकबाकीपेक्षा (₹${currentRemaining}) जास्त असू शकत नाही (Amount exceeds outstanding balance)`
      });
    }

    // 5. Fetch Resident Snapshot
    const resQuery = Resident.findById(due.residentId);
    if (session) resQuery.session(session);
    const resident = await resQuery;

    if (!resident) {
      if (session) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'संबंधित सभासद नोंद आढळली नाही (Resident record not found)'
      });
    }

    // 6. Generate Atomic Sequential Receipt Number (SCA-YYYYMM-XXXX)
    const receiptNumber = await generateAtomicReceiptNumber(due.year, due.month, session);

    // 7. Calculate New Balances and Status
    const newAmountPaid = Math.round((due.amountPaid + numAmount) * 100) / 100;
    const newOutstandingBalance = Math.round(
      Math.max(0, due.totalAmountDue - newAmountPaid - (due.advanceAdjustedAmount || 0)) * 100
    ) / 100;
    const newStatus = newOutstandingBalance <= 0 ? 'PAID' : 'PARTIAL';

    // 8. Atomically Update Maintenance Due with Concurrency Guard
    const updateQuery = {
      _id: due._id,
      amountPaid: due.amountPaid // Optimistic lock: ensures no concurrent transaction modified amountPaid
    };

    const updateOptions = { new: true };
    if (session) updateOptions.session = session;

    const updatedDue = await MaintenanceDue.findOneAndUpdate(
      updateQuery,
      {
        $set: {
          amountPaid: newAmountPaid,
          outstandingBalance: newOutstandingBalance,
          status: newStatus
        }
      },
      updateOptions
    );

    if (!updatedDue) {
      if (session) await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'समवर्ती व्यवहारामुळे देयक अद्यतन अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा. (Concurrent update conflict. Please retry.)'
      });
    }

    // 9. Persist Payment Record with Compensating Rollback if not inside replica set
    let payment;
    try {
      payment = new Payment({
        receiptNumber,
        maintenanceDueId: due._id,
        residentId: due.residentId,
        residentNameMarathi: resident.fullNameMarathi,
        flatNumber: due.flatNumberSnapshot || resident.flatNumber || '',
        wing: resident.wing || 'A Wing',
        month: due.month,
        year: due.year,
        totalAmountDue: due.totalAmountDue,
        previousAmountPaid: due.amountPaid,
        amountReceived: numAmount,
        advanceAdjustedAmount: due.advanceAdjustedAmount || 0,
        advanceAdjustmentDetails: due.advanceAdjustmentDetails || [],
        remainingBalance: newOutstandingBalance,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        transactionRef: transactionRef ? String(transactionRef).trim() : '',
        remarks: remarks ? String(remarks).trim() : '',
        idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : null,
        status: 'COMPLETED',
        recordedByAdminId: req.admin._id
      });

      await payment.save(session ? { session } : {});
    } catch (saveErr) {
      // Compensating rollback for standalone instance
      if (!session) {
        await MaintenanceDue.findByIdAndUpdate(due._id, {
          $set: {
            amountPaid: due.amountPaid,
            outstandingBalance: due.outstandingBalance,
            status: due.status
          }
        });
      }
      throw saveErr;
    }

    // 10. Persist Immutable Audit Log
    const auditLog = new AuditLog({
      action: 'PAYMENT_RECORDED',
      performedByAdminId: req.admin._id,
      entityType: 'PAYMENT',
      entityId: payment._id,
      details: {
        receiptNumber,
        maintenanceDueId: due._id,
        residentName: resident.fullNameMarathi,
        amountReceived: numAmount,
        month: due.month,
        year: due.year,
        paymentMethod,
        previousAmountPaid: due.amountPaid,
        newAmountPaid,
        remainingBalance: newOutstandingBalance
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await auditLog.save(session ? { session } : {});

    // 11. Commit Transaction
    if (session) {
      await session.commitTransaction();
    }

    return res.status(201).json({
      success: true,
      message: `पावती क्रमांक ${receiptNumber} सह पेमेंट यशस्वीरीत्या नोंदवले गेले (Payment recorded successfully)`,
      payment,
      updatedDue: {
        id: updatedDue._id,
        amountPaid: updatedDue.amountPaid,
        outstandingBalance: updatedDue.outstandingBalance,
        status: updatedDue.status
      }
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {}
    }
    console.error('Error in recordPayment:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'पेमेंट नोंदवताना त्रुटी आली (Failed to record payment)'
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * GET /api/v1/payments
 * Query payment history with search, filters, and pagination
 */
export const getPayments = async (req, res) => {
  try {
    const {
      residentId,
      month,
      year,
      paymentMethod,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (residentId && mongoose.Types.ObjectId.isValid(residentId)) {
      filter.residentId = residentId;
    }

    if (month && Number(month) >= 1 && Number(month) <= 12) {
      filter.month = Number(month);
    }

    if (year && Number(year) >= 2020) {
      filter.year = Number(year);
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) {
        filter.paymentDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = e;
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { receiptNumber: { $regex: escaped, $options: 'i' } },
        { residentNameMarathi: { $regex: escaped, $options: 'i' } },
        { flatNumber: { $regex: escaped, $options: 'i' } },
        { transactionRef: { $regex: escaped, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [payments, totalCount] = await Promise.all([
      Payment.find(filter)
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('recordedByAdminId', 'fullNameMarathi designation')
        .populate('maintenanceDueId', 'advanceAdjustedAmount advanceAdjustmentDetails totalAmountDue isAdvanceApplied'),
      Payment.countDocuments(filter)
    ]);

    const formattedPayments = payments.map(p => {
      const pObj = p.toObject();
      if (pObj.maintenanceDueId && typeof pObj.maintenanceDueId === 'object') {
        if (!pObj.advanceAdjustedAmount && pObj.maintenanceDueId.advanceAdjustedAmount) {
          pObj.advanceAdjustedAmount = pObj.maintenanceDueId.advanceAdjustedAmount;
        }
        if ((!pObj.advanceAdjustmentDetails || pObj.advanceAdjustmentDetails.length === 0) && pObj.maintenanceDueId.advanceAdjustmentDetails) {
          pObj.advanceAdjustmentDetails = pObj.maintenanceDueId.advanceAdjustmentDetails;
        }
      }
      return pObj;
    });

    return res.status(200).json({
      success: true,
      payments: formattedPayments,
      pagination: {
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error in getPayments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पेमेंट इतिहास मिळवताना त्रुटी आली (Failed to fetch payments)'
    });
  }
};

/**
 * GET /api/v1/payments/:id
 * Retrieve details of an individual payment (or synthesized receipt if paid 100% via advance)
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध पेमेंट ओळख क्रमांक (Invalid payment ID)'
      });
    }

    const payment = await Payment.findById(id)
      .populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber')
      .populate('maintenanceDueId')
      .populate('recordedByAdminId', 'fullNameMarathi designation')
      .populate('cancelledByAdminId', 'fullNameMarathi designation');

    if (!payment) {
      // Check if ID is a MaintenanceDue settled 100% via advance adjustment or zero-amount
      const due = await MaintenanceDue.findById(id).populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber');
      if (due && due.status === 'PAID' && (due.advanceAdjustedAmount > 0 || due.isZeroAmountBill)) {
        const primaryAdv = due.advanceAdjustmentDetails?.[0];
        const synthesizedReceipt = {
          _id: due._id,
          receiptNumber: primaryAdv?.receiptNumber ? `${primaryAdv.receiptNumber}-ADJ` : `SCA-${due.year}${String(due.month).padStart(2, '0')}-ADV`,
          maintenanceDueId: due,
          residentId: due.residentId,
          residentNameMarathi: due.residentNameSnapshot,
          flatNumber: due.flatNumberSnapshot || '',
          wing: due.wing || 'A Wing',
          month: due.month,
          year: due.year,
          totalAmountDue: due.totalAmountDue,
          previousAmountPaid: 0,
          amountReceived: 0,
          advanceAdjustedAmount: due.advanceAdjustedAmount || 0,
          advanceAdjustmentDetails: due.advanceAdjustmentDetails || [],
          remainingBalance: 0,
          paymentDate: primaryAdv?.adjustedAt || due.updatedAt || due.createdAt,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          isFullyAdvanceSettled: due.advanceAdjustedAmount > 0 && due.amountPaid === 0,
          remarks: due.isZeroAmountBill ? (due.overrideReason || 'Zero Amount Bill') : 'Paid Through Advance Adjustment (अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा)'
        };
        return res.status(200).json({
          success: true,
          payment: synthesizedReceipt
        });
      }

      return res.status(404).json({
        success: false,
        message: 'पेमेंट नोंद आढळली नाही (Payment record not found)'
      });
    }

    const pObj = payment.toObject();
    if (pObj.maintenanceDueId && typeof pObj.maintenanceDueId === 'object') {
      if (!pObj.advanceAdjustedAmount && pObj.maintenanceDueId.advanceAdjustedAmount) {
        pObj.advanceAdjustedAmount = pObj.maintenanceDueId.advanceAdjustedAmount;
      }
      if ((!pObj.advanceAdjustmentDetails || pObj.advanceAdjustmentDetails.length === 0) && pObj.maintenanceDueId.advanceAdjustmentDetails) {
        pObj.advanceAdjustmentDetails = pObj.maintenanceDueId.advanceAdjustmentDetails;
      }
    }
    if ((pObj.advanceAdjustedAmount || 0) > 0 && (pObj.amountReceived || 0) === 0) {
      pObj.isFullyAdvanceSettled = true;
    }

    return res.status(200).json({
      success: true,
      payment: pObj
    });
  } catch (error) {
    console.error('Error in getPaymentById:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पेमेंट तपशील मिळवताना त्रुटी आली (Failed to fetch payment details)'
    });
  }
};

/**
 * GET /api/v1/payments/:id/receipt-pdf
 * Download or stream official PDF receipt
 */
export const downloadReceiptPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'mr' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध पेमेंट ओळख क्रमांक'
      });
    }

    const payment = await Payment.findById(id).populate('maintenanceDueId');
    let paymentData = null;

    if (!payment) {
      // Check if id is a MaintenanceDue settled via advance
      const due = await MaintenanceDue.findById(id);
      if (due && due.status === 'PAID' && (due.advanceAdjustedAmount > 0 || due.isZeroAmountBill)) {
        const primaryAdv = due.advanceAdjustmentDetails?.[0];
        paymentData = {
          _id: due._id,
          receiptNumber: primaryAdv?.receiptNumber ? `${primaryAdv.receiptNumber}-ADJ` : `SCA-${due.year}${String(due.month).padStart(2, '0')}-ADV`,
          residentNameMarathi: due.residentNameSnapshot,
          flatNumber: due.flatNumberSnapshot || '',
          wing: due.wing || 'A Wing',
          month: due.month,
          year: due.year,
          totalAmountDue: due.totalAmountDue,
          previousAmountPaid: 0,
          amountReceived: 0,
          advanceAdjustedAmount: due.advanceAdjustedAmount || 0,
          advanceAdjustmentDetails: due.advanceAdjustmentDetails || [],
          remainingBalance: 0,
          paymentDate: primaryAdv?.adjustedAt || due.updatedAt || due.createdAt,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          isFullyAdvanceSettled: due.advanceAdjustedAmount > 0 && due.amountPaid === 0,
          remarks: due.isZeroAmountBill ? (due.overrideReason || 'Zero Amount Bill') : 'Paid Through Advance Adjustment (अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा)'
        };
      } else {
        return res.status(404).json({
          success: false,
          message: 'पावतीसाठी पेमेंट नोंद आढळली नाही'
        });
      }
    } else {
      const pObj = payment.toObject();
      if (pObj.maintenanceDueId && typeof pObj.maintenanceDueId === 'object') {
        if (!pObj.advanceAdjustedAmount && pObj.maintenanceDueId.advanceAdjustedAmount) {
          pObj.advanceAdjustedAmount = pObj.maintenanceDueId.advanceAdjustedAmount;
        }
        if ((!pObj.advanceAdjustmentDetails || pObj.advanceAdjustmentDetails.length === 0) && pObj.maintenanceDueId.advanceAdjustmentDetails) {
          pObj.advanceAdjustmentDetails = pObj.maintenanceDueId.advanceAdjustmentDetails;
        }
      }
      if ((pObj.advanceAdjustedAmount || 0) > 0 && (pObj.amountReceived || 0) === 0) {
        pObj.isFullyAdvanceSettled = true;
      }
      paymentData = pObj;
    }

    const pdfBuffer = await generateReceiptPDF(paymentData, lang);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${paymentData.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF receipt:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पावती पीडीएफ तयार करताना त्रुटी आली (Failed to generate PDF receipt)'
    });
  }
};

/**
 * GET /api/v1/payments/due/:dueId/receipt
 * Retrieve or synthesize receipt for a maintenance due (whether paid directly or settled via advance)
 */
export const getReceiptByDueId = async (req, res) => {
  try {
    const { dueId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dueId)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध देयक आयडी'
      });
    }

    const due = await MaintenanceDue.findById(dueId).populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber');
    if (!due) {
      return res.status(404).json({
        success: false,
        message: 'देयक नोंद आढळली नाही'
      });
    }

    // Try finding direct payment first
    const payment = await Payment.findOne({ maintenanceDueId: due._id, status: 'COMPLETED' })
      .populate('residentId', 'fullNameMarathi flatNumber wing mobileNumber')
      .populate('maintenanceDueId')
      .populate('recordedByAdminId', 'fullNameMarathi designation');

    if (payment) {
      const pObj = payment.toObject();
      if (!pObj.advanceAdjustedAmount && due.advanceAdjustedAmount) {
        pObj.advanceAdjustedAmount = due.advanceAdjustedAmount;
      }
      if ((!pObj.advanceAdjustmentDetails || pObj.advanceAdjustmentDetails.length === 0) && due.advanceAdjustmentDetails) {
        pObj.advanceAdjustmentDetails = due.advanceAdjustmentDetails;
      }
      return res.status(200).json({
        success: true,
        payment: pObj
      });
    }

    // If no direct payment, check if due was settled via advance or zero bill
    if (due.status === 'PAID' && (due.advanceAdjustedAmount > 0 || due.isZeroAmountBill)) {
      const primaryAdv = due.advanceAdjustmentDetails?.[0];
      const synthesizedReceipt = {
        _id: due._id,
        receiptNumber: primaryAdv?.receiptNumber ? `${primaryAdv.receiptNumber}-ADJ` : `SCA-${due.year}${String(due.month).padStart(2, '0')}-ADV`,
        maintenanceDueId: due,
        residentId: due.residentId,
        residentNameMarathi: due.residentNameSnapshot,
        flatNumber: due.flatNumberSnapshot || '',
        wing: due.wing || 'A Wing',
        month: due.month,
        year: due.year,
        totalAmountDue: due.totalAmountDue,
        previousAmountPaid: 0,
        amountReceived: 0,
        advanceAdjustedAmount: due.advanceAdjustedAmount || 0,
        advanceAdjustmentDetails: due.advanceAdjustmentDetails || [],
        remainingBalance: 0,
        paymentDate: primaryAdv?.adjustedAt || due.updatedAt || due.createdAt,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        isFullyAdvanceSettled: due.advanceAdjustedAmount > 0 && due.amountPaid === 0,
        remarks: due.isZeroAmountBill ? (due.overrideReason || 'Zero Amount Bill') : 'Paid Through Advance Adjustment (अ‍ॅडव्हान्स रकमेतून वर्ग करून पूर्ण भरणा)'
      };
      return res.status(200).json({
        success: true,
        payment: synthesizedReceipt
      });
    }

    return res.status(404).json({
      success: false,
      message: 'या देयकासाठी कोणतीही पूर्ण पावती उपलब्ध नाही (No payment receipt found for this due)'
    });
  } catch (error) {
    console.error('Error in getReceiptByDueId:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पावती मिळवताना त्रुटी आली'
    });
  }
};

/**
 * PATCH /api/v1/payments/:id/cancel
 * Audited soft-cancellation of an erroneous payment with mandatory reason
 */
export const cancelPayment = async (req, res) => {
  let session = null;
  const isTxSupported = canUseTransactions();

  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    if (!cancellationReason || String(cancellationReason).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'रद्द करण्याचे वैध कारण आवश्यक आहे (किमान ५ अक्षरे) (Mandatory cancellation reason required)'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध पेमेंट ओळख क्रमांक'
      });
    }

    if (isTxSupported) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const pQuery = Payment.findById(id);
    if (session) pQuery.session(session);
    const payment = await pQuery;

    if (!payment) {
      if (session) await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'पेमेंट नोंद आढळली नाही'
      });
    }

    if (payment.status === 'CANCELLED') {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'हे पेमेंट आधीच रद्द करण्यात आलेले आहे (Payment already cancelled)'
      });
    }

    // Revert Maintenance Due
    const dQuery = MaintenanceDue.findById(payment.maintenanceDueId);
    if (session) dQuery.session(session);
    const due = await dQuery;

    let updatedDue = null;
    if (due) {
      const revertedAmountPaid = Math.max(0, Math.round((due.amountPaid - payment.amountReceived) * 100) / 100);
      const revertedBalance = Math.round((due.totalAmountDue - revertedAmountPaid) * 100) / 100;
      const revertedStatus = revertedAmountPaid === 0 ? 'UNPAID' : (revertedBalance === 0 ? 'PAID' : 'PARTIAL');

      due.amountPaid = revertedAmountPaid;
      due.outstandingBalance = revertedBalance;
      due.status = revertedStatus;

      await due.save(session ? { session } : {});
      updatedDue = due;
    }

    // Soft-cancel payment record
    payment.status = 'CANCELLED';
    payment.cancellationReason = String(cancellationReason).trim();
    payment.cancelledAt = new Date();
    payment.cancelledByAdminId = req.admin._id;

    await payment.save(session ? { session } : {});

    // Write Audit Log
    const auditLog = new AuditLog({
      action: 'PAYMENT_CANCELLED',
      performedByAdminId: req.admin._id,
      entityType: 'PAYMENT',
      entityId: payment._id,
      details: {
        receiptNumber: payment.receiptNumber,
        cancellationReason: payment.cancellationReason,
        amountReverted: payment.amountReceived,
        maintenanceDueId: payment.maintenanceDueId
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });

    await auditLog.save(session ? { session } : {});

    if (session) {
      await session.commitTransaction();
    }

    return res.status(200).json({
      success: true,
      message: `पावती क्रमांक ${payment.receiptNumber} यशस्वीरीत्या रद्द केली गेली (Payment cancelled with audit record)`,
      payment,
      updatedDue
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (e) {}
    }
    console.error('Error cancelling payment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पेमेंट रद्द करताना त्रुटी आली'
    });
  } finally {
    if (session) session.endSession();
  }
};

/**
 * GET /api/v1/payments/dashboard/summary
 * Aggregate metrics from persisted database records
 */
export const getPaymentDashboardSummary = async (req, res) => {
  try {
    // 1. Calculate Billed, Collected, Outstanding directly from MaintenanceDue
    const dueAgg = await MaintenanceDue.aggregate([
      {
        $group: {
          _id: null,
          totalBilledAmount: { $sum: '$totalAmountDue' },
          totalCollectedAmount: { $sum: '$amountPaid' },
          totalOutstandingAmount: { $sum: '$outstandingBalance' },
          totalDuesCount: { $sum: 1 },
          fullPaymentsCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] }
          },
          partialPaymentsCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PARTIAL'] }, 1, 0] }
          },
          unpaidDuesCount: {
            $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = dueAgg[0] || {
      totalBilledAmount: 0,
      totalCollectedAmount: 0,
      totalOutstandingAmount: 0,
      totalDuesCount: 0,
      fullPaymentsCount: 0,
      partialPaymentsCount: 0,
      unpaidDuesCount: 0
    };

    // 2. Count Total Active Completed Receipts
    const completedPaymentsCount = await Payment.countDocuments({ status: 'COMPLETED' });
    const cancelledPaymentsCount = await Payment.countDocuments({ status: 'CANCELLED' });

    // 3. Advance Payments Metrics
    const [advanceSummary] = await AdvancePayment.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: null,
          totalAdvanceReceived: { $sum: '$amountReceived' },
          totalAdvanceUtilized: { $sum: '$usedAmount' },
          totalAdvanceBalance: { $sum: '$availableBalance' },
          activeAdvanceCount: { $sum: 1 }
        }
      }
    ]) || [{ totalAdvanceReceived: 0, totalAdvanceUtilized: 0, totalAdvanceBalance: 0, activeAdvanceCount: 0 }];

    const advData = advanceSummary || { totalAdvanceReceived: 0, totalAdvanceUtilized: 0, totalAdvanceBalance: 0, activeAdvanceCount: 0 };

    // 4. Distinct Resident Counts for interactive KPI drill-downs
    const [billedResidents, payingResidents, pendingResidents, advanceResidents] = await Promise.all([
      MaintenanceDue.distinct('residentId'),
      Payment.distinct('residentId', { status: 'COMPLETED' }),
      MaintenanceDue.distinct('residentId', {
        status: { $in: ['UNPAID', 'PARTIAL'] },
        outstandingBalance: { $gt: 0 }
      }),
      Resident.countDocuments({ advanceBalance: { $gt: 0 } })
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalBilledAmount: summary.totalBilledAmount,
        totalCollectedAmount: summary.totalCollectedAmount,
        totalOutstandingAmount: summary.totalOutstandingAmount,
        totalDuesCount: summary.totalDuesCount,
        fullPaymentsCount: summary.fullPaymentsCount,
        partialPaymentsCount: summary.partialPaymentsCount,
        unpaidDuesCount: summary.unpaidDuesCount,
        completedPaymentsCount,
        cancelledPaymentsCount,
        totalAdvanceReceived: advData.totalAdvanceReceived || 0,
        totalAdvanceUtilized: advData.totalAdvanceUtilized || 0,
        totalAdvanceBalance: advData.totalAdvanceBalance || 0,
        activeAdvanceCount: advData.activeAdvanceCount || 0,
        billedResidentsCount: billedResidents.length,
        payingResidentsCount: payingResidents.length,
        pendingResidentsCount: pendingResidents.length,
        advanceResidentsCount: advanceResidents
      }
    });
  } catch (error) {
    console.error('Error in getPaymentDashboardSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'डॅशबोर्ड सारांश मिळवताना त्रुटी आली'
    });
  }
};

/**
 * POST /api/v1/payments/advance
 * Record an advance maintenance payment credit and generate an atomic receipt (SCA-YYYYMM-XXXX)
 */
export const recordAdvancePayment = async (req, res) => {
  try {
    const {
      residentId,
      amountReceived,
      paymentDate,
      paymentMethod,
      transactionRef,
      remarks
    } = req.body;

    if (!residentId || !mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'वैध सभासद निवडणे आवश्यक आहे (Valid resident is required)'
      });
    }

    const numAmount = Math.round(Number(amountReceived) * 100) / 100;
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'अ‍ॅडव्हान्स रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)'
      });
    }

    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद नोंद आढळली नाही (Resident not found)'
      });
    }

    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    const year = pDate.getFullYear();
    const month = pDate.getMonth() + 1;

    // Generate Atomic Sequential Receipt Number (SCA-YYYYMM-XXXX)
    const receiptNumber = await generateAtomicReceiptNumber(year, month);

    const advancePayment = new AdvancePayment({
      receiptNumber,
      residentId: resident._id,
      residentNameMarathi: resident.fullNameMarathi,
      flatNumber: resident.flatNumber || '',
      wing: resident.wing || 'A Wing',
      amountReceived: numAmount,
      usedAmount: 0,
      availableBalance: numAmount,
      paymentDate: pDate,
      paymentMethod: paymentMethod || 'UPI',
      transactionRef: transactionRef ? String(transactionRef).trim() : '',
      remarks: remarks ? String(remarks).trim() : '',
      status: 'ACTIVE',
      recordedByAdminId: req.admin._id
    });

    await advancePayment.save();

    // Update Resident advance credit balances
    resident.advanceBalance = Math.round(((resident.advanceBalance || 0) + numAmount) * 100) / 100;
    resident.totalAdvanceReceived = Math.round(((resident.totalAdvanceReceived || 0) + numAmount) * 100) / 100;
    await resident.save();

    // Record Immutable Audit Log
    try {
      await AuditLog.create({
        action: 'ADVANCE_PAYMENT_RECORDED',
        performedByAdminId: req.admin._id,
        entityType: 'ADVANCE_PAYMENT',
        entityId: advancePayment._id,
        details: {
          receiptNumber,
          residentId: resident._id,
          residentName: resident.fullNameMarathi,
          flatNumber: resident.flatNumber || '',
          amountReceived: numAmount,
          availableBalance: numAmount,
          paymentMethod: advancePayment.paymentMethod,
          transactionRef: advancePayment.transactionRef
        },
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || ''
      });
    } catch (auditErr) {
      console.warn('Audit log write error for advance payment:', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `अ‍ॅडव्हान्स रक्कम ₹${numAmount} यशस्वीरीत्या जमा केली (पावती क्र. ${receiptNumber})`,
      advancePayment,
      residentAdvanceBalance: resident.advanceBalance
    });
  } catch (error) {
    console.error('Error in recordAdvancePayment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'अ‍ॅडव्हान्स नोंदवताना त्रुटी आली (Failed to record advance payment)'
    });
  }
};

/**
 * GET /api/v1/payments/advance
 * List advance payments with search, pagination, and status filtering
 */
export const getAdvancePayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, residentId, status, search, year } = req.query;
    const filter = {};

    if (residentId && mongoose.Types.ObjectId.isValid(residentId)) {
      filter.residentId = residentId;
    }
    if (status) {
      filter.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { residentNameMarathi: { $regex: escaped, $options: 'i' } },
        { flatNumber: { $regex: escaped, $options: 'i' } },
        { receiptNumber: { $regex: escaped, $options: 'i' } },
        { transactionRef: { $regex: escaped, $options: 'i' } }
      ];
    }
    if (year && Number(year) >= 2020) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
      filter.paymentDate = { $gte: start, $lt: end };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [advancePayments, totalCount] = await Promise.all([
      AdvancePayment.find(filter)
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AdvancePayment.countDocuments(filter)
    ]);

    // Aggregate summary of all non-cancelled advance payments
    const advanceSummary = await AdvancePayment.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: null,
          totalAdvanceReceived: { $sum: '$amountReceived' },
          totalAdvanceUtilized: { $sum: '$usedAmount' },
          totalAdvanceBalance: { $sum: '$availableBalance' }
        }
      }
    ]);

    const advSummaryObj = advanceSummary[0] || { totalAdvanceReceived: 0, totalAdvanceUtilized: 0, totalAdvanceBalance: 0 };

    return res.status(200).json({
      success: true,
      advancePayments,
      summary: advSummaryObj,
      pagination: {
        totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Error in getAdvancePayments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'अ‍ॅडव्हान्स यादी लोड करताना त्रुटी आली'
    });
  }
};

/**
 * GET /api/v1/payments/advance/resident/:residentId
 * Get resident's advance balance profile
 */
export const getResidentAdvanceSummary = async (req, res) => {
  try {
    const { residentId } = req.params;
    if (!residentId || !mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध सभासद ओळख क्रमांक'
      });
    }

    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद आढळला नाही'
      });
    }

    const activeAdvancePayments = await AdvancePayment.find({
      residentId,
      status: 'ACTIVE',
      availableBalance: { $gt: 0 }
    }).sort({ paymentDate: 1 });

    return res.status(200).json({
      success: true,
      advanceBalance: resident.advanceBalance || 0,
      totalAdvanceReceived: resident.totalAdvanceReceived || 0,
      totalAdvanceUtilized: resident.totalAdvanceUtilized || 0,
      activeAdvancePayments
    });
  } catch (error) {
    console.error('Error in getResidentAdvanceSummary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'अ‍ॅडव्हान्स माहिती लोड करताना त्रुटी आली'
    });
  }
};

/**
 * POST /api/v1/payments/advance/apply
 * Apply available advance balance to a specific monthly bill
 */
export const applyAdvanceToBill = async (req, res) => {
  try {
    const { maintenanceDueId, amountToApply, remarks = '' } = req.body;

    if (!maintenanceDueId || !mongoose.Types.ObjectId.isValid(maintenanceDueId)) {
      return res.status(400).json({
        success: false,
        message: 'वैध मासिक देयक संदर्भ आवश्यक आहे'
      });
    }

    const due = await MaintenanceDue.findById(maintenanceDueId);
    if (!due) {
      return res.status(404).json({
        success: false,
        message: 'देयक नोंद आढळली नाही'
      });
    }

    if (due.outstandingBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'या देयकाची संपूर्ण रक्कम आधीच भरलेली आहे'
      });
    }

    const resident = await Resident.findById(due.residentId);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद नोंद आढळली नाही'
      });
    }

    const availableAdv = resident.advanceBalance || 0;
    if (availableAdv <= 0) {
      return res.status(400).json({
        success: false,
        message: 'या सभासदाकडे कोणतीही अ‍ॅडव्हान्स शिल्लक उपलब्ध नाही'
      });
    }

    const requestedAmount = amountToApply ? Math.round(Number(amountToApply) * 100) / 100 : due.outstandingBalance;
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'लागू करावयाची रक्कम शून्यापेक्षा जास्त असावी'
      });
    }

    // Amount applied cannot exceed available advance or outstanding balance
    const actualApplyAmount = Math.min(requestedAmount, availableAdv, due.outstandingBalance);

    // Allocate across active AdvancePayment records (FIFO)
    const activeAdvDocs = await AdvancePayment.find({
      residentId: resident._id,
      status: 'ACTIVE',
      availableBalance: { $gt: 0 }
    }).sort({ paymentDate: 1 });

    let remainingNeeded = actualApplyAmount;
    const adjustmentRecords = [];

    for (const adv of activeAdvDocs) {
      if (remainingNeeded <= 0) break;
      const alloc = Math.min(adv.availableBalance, remainingNeeded);
      adv.usedAmount = Math.round((adv.usedAmount + alloc) * 100) / 100;
      adv.availableBalance = Math.round((adv.availableBalance - alloc) * 100) / 100;
      if (adv.availableBalance === 0) {
        adv.status = 'FULLY_UTILIZED';
      }
      adv.adjustments.push({
        maintenanceDueId: due._id,
        month: due.month,
        year: due.year,
        amountApplied: alloc,
        appliedAt: new Date(),
        appliedByAdminId: req.admin._id,
        remarks: remarks || `Applied to ${due.month}/${due.year} maintenance bill`
      });
      await adv.save();

      adjustmentRecords.push({
        advancePaymentId: adv._id,
        receiptNumber: adv.receiptNumber,
        amount: alloc,
        adjustedAt: new Date(),
        adjustedByAdminId: req.admin._id
      });

      remainingNeeded = Math.round((remainingNeeded - alloc) * 100) / 100;
    }

    // Update Resident balances
    resident.advanceBalance = Math.round((resident.advanceBalance - actualApplyAmount) * 100) / 100;
    resident.totalAdvanceUtilized = Math.round(((resident.totalAdvanceUtilized || 0) + actualApplyAmount) * 100) / 100;
    await resident.save();

    // Update MaintenanceDue
    const newAdvanceAdjusted = Math.round(((due.advanceAdjustedAmount || 0) + actualApplyAmount) * 100) / 100;
    const newOutstanding = Math.round((due.totalAmountDue - due.amountPaid - newAdvanceAdjusted) * 100) / 100;
    const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIAL';

    due.advanceAdjustedAmount = newAdvanceAdjusted;
    due.isAdvanceApplied = true;
    due.outstandingBalance = newOutstanding;
    due.status = newStatus;
    if (!due.advanceAdjustmentDetails) due.advanceAdjustmentDetails = [];
    due.advanceAdjustmentDetails.push(...adjustmentRecords);
    await due.save();

    // Record Immutable Audit Log
    try {
      await AuditLog.create({
        action: 'ADVANCE_APPLIED_TO_BILL',
        performedByAdminId: req.admin._id,
        entityType: 'MAINTENANCE_DUE',
        entityId: due._id,
        details: {
          residentId: resident._id,
          residentName: resident.fullNameMarathi,
          flatNumber: due.flatNumberSnapshot || resident.flatNumber || '',
          month: due.month,
          year: due.year,
          amountApplied: actualApplyAmount,
          newOutstandingBalance: newOutstanding,
          newStatus,
          remainingAdvanceBalance: resident.advanceBalance,
          remarks
        },
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || ''
      });
    } catch (auditErr) {
      console.warn('Audit log write error for advance adjustment:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `अ‍ॅडव्हान्स रक्कम ₹${actualApplyAmount} देयकावर यशस्वीरीत्या लागू केली (शिल्लक देयक: ₹${newOutstanding}, शिल्लक अ‍ॅडव्हान्स: ₹${resident.advanceBalance})`,
      due,
      appliedAmount: actualApplyAmount,
      remainingAdvanceBalance: resident.advanceBalance
    });
  } catch (error) {
    console.error('Error in applyAdvanceToBill:', error.message);
    return res.status(500).json({
      success: false,
      message: 'अ‍ॅडव्हान्स लागू करताना त्रुटी आली'
    });
  }
};

/**
 * PATCH /api/v1/payments/advance/:id/cancel
 * Cancel an unutilized advance payment
 */
export const cancelAdvancePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'अवैध ओळख क्रमांक' });
    }

    const adv = await AdvancePayment.findById(id);
    if (!adv) {
      return res.status(404).json({ success: false, message: 'अ‍ॅडव्हान्स नोंद आढळली नाही' });
    }

    if (adv.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'ही पावती आधीच रद्द केलेली आहे' });
    }

    if (adv.usedAmount > 0) {
      return res.status(400).json({
        success: false,
        message: `या अ‍ॅडव्हान्समधील ₹${adv.usedAmount} आधीच देयकांवर वापरली गेली आहेत. अंशतः किंवा पूर्ण वापरलेला अ‍ॅडव्हान्स थेट रद्द करता येत नाही.`
      });
    }

    const resident = await Resident.findById(adv.residentId);
    if (resident) {
      resident.advanceBalance = Math.max(0, Math.round(((resident.advanceBalance || 0) - adv.amountReceived) * 100) / 100);
      resident.totalAdvanceReceived = Math.max(0, Math.round(((resident.totalAdvanceReceived || 0) - adv.amountReceived) * 100) / 100);
      await resident.save();
    }

    adv.status = 'CANCELLED';
    adv.cancelledAt = new Date();
    adv.cancelledByAdminId = req.admin._id;
    adv.cancellationReason = cancellationReason?.trim() || 'Admin cancelled advance payment';
    await adv.save();

    // Audit Log
    try {
      await AuditLog.create({
        action: 'ADVANCE_CANCELLED',
        performedByAdminId: req.admin._id,
        entityType: 'ADVANCE_PAYMENT',
        entityId: adv._id,
        details: {
          receiptNumber: adv.receiptNumber,
          residentName: adv.residentNameMarathi,
          amountReverted: adv.amountReceived,
          cancellationReason: adv.cancellationReason
        },
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || ''
      });
    } catch (auditErr) {
      console.warn('Audit error for advance cancel:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `अ‍ॅडव्हान्स पावती क्र. ${adv.receiptNumber} यशस्वीरीत्या रद्द केली.`,
      advancePayment: adv
    });
  } catch (error) {
    console.error('Error in cancelAdvancePayment:', error.message);
    return res.status(500).json({ success: false, message: 'अ‍ॅडव्हान्स रद्द करताना त्रुटी आली' });
  }
};

/**
 * GET /api/v1/payments/advance/:id/receipt-pdf
 * Download advance payment receipt PDF
 */
export const downloadAdvanceReceiptPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'mr' } = req.query;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'अवैध पावती ओळख क्रमांक' });
    }

    const adv = await AdvancePayment.findById(id);
    if (!adv) {
      return res.status(404).json({ success: false, message: 'अ‍ॅडव्हान्स पावती आढळली नाही' });
    }

    // Format for PDF generator
    const receiptData = {
      _id: adv._id,
      receiptNumber: adv.receiptNumber,
      residentNameMarathi: adv.residentNameMarathi,
      flatNumber: adv.flatNumber,
      wing: adv.wing,
      month: adv.paymentDate.getMonth() + 1,
      year: adv.paymentDate.getFullYear(),
      totalAmountDue: adv.amountReceived,
      previousAmountPaid: 0,
      amountReceived: adv.amountReceived,
      remainingBalance: adv.availableBalance,
      paymentDate: adv.paymentDate,
      paymentMethod: adv.paymentMethod,
      transactionRef: adv.transactionRef,
      remarks: adv.remarks,
      isAdvancePayment: true,
      availableBalance: adv.availableBalance,
      usedAmount: adv.usedAmount
    };

    const pdfBuffer = await generateReceiptPDF(receiptData, lang);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AdvanceReceipt-${adv.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Error in downloadAdvanceReceiptPDF:', error.message);
    return res.status(500).json({ success: false, message: 'अ‍ॅडव्हान्स पावती पीडीएफ तयार करताना त्रुटी आली' });
  }
};

/**
 * GET /api/v1/payments/advance/ledger
 * Retrieve resident-wise advance credit ledger with receipt references and adjustment history
 */
export const getAdvanceLedger = async (req, res) => {
  try {
    const { search, onlyWithBalance } = req.query;

    const residentFilter = {};
    if (onlyWithBalance === 'true') {
      residentFilter.advanceBalance = { $gt: 0 };
    }
    if (search && search.trim()) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      residentFilter.$or = [
        { fullNameMarathi: { $regex: escaped, $options: 'i' } },
        { flatNumber: { $regex: escaped, $options: 'i' } }
      ];
    }

    const residents = await Resident.find(residentFilter).sort({ flatNumber: 1, createdAt: 1 });

    // Fetch all advance payments (excluding cancelled)
    const allAdvancePayments = await AdvancePayment.find({
      status: { $ne: 'CANCELLED' }
    }).sort({ paymentDate: -1 });

    // Group advance payments by residentId
    const advanceByResident = {};
    for (const adv of allAdvancePayments) {
      const rId = adv.residentId.toString();
      if (!advanceByResident[rId]) {
        advanceByResident[rId] = [];
      }
      advanceByResident[rId].push({
        _id: adv._id,
        receiptNumber: adv.receiptNumber,
        amountReceived: adv.amountReceived,
        usedAmount: adv.usedAmount,
        availableBalance: adv.availableBalance,
        paymentDate: adv.paymentDate,
        paymentMethod: adv.paymentMethod,
        transactionRef: adv.transactionRef,
        status: adv.status,
        adjustments: adv.adjustments || []
      });
    }

    // Build ledger entries
    const ledger = residents.map((r) => {
      const rId = r._id.toString();
      const advRecords = advanceByResident[rId] || [];
      const receiptNumbers = advRecords.map((a) => a.receiptNumber);

      return {
        residentId: r._id,
        fullNameMarathi: r.fullNameMarathi,
        flatNumber: r.flatNumber || '',
        wing: r.wing || 'A Wing',
        propertyType: r.propertyType,
        maintenanceCategory: r.maintenanceCategory,
        totalAdvanceReceived: r.totalAdvanceReceived || 0,
        totalAdvanceUtilized: r.totalAdvanceUtilized || 0,
        availableBalance: r.advanceBalance || 0,
        receiptNumbers,
        advanceRecords: advRecords
      };
    });

    // Summary calculations across records
    const totalAdvanceReceived = ledger.reduce((acc, curr) => acc + curr.totalAdvanceReceived, 0);
    const totalAdvanceUtilized = ledger.reduce((acc, curr) => acc + curr.totalAdvanceUtilized, 0);
    const totalAvailableBalance = ledger.reduce((acc, curr) => acc + curr.availableBalance, 0);
    const membersWithAdvanceCount = ledger.filter((l) => l.totalAdvanceReceived > 0).length;
    const membersWithActiveBalanceCount = ledger.filter((l) => l.availableBalance > 0).length;

    return res.status(200).json({
      success: true,
      summary: {
        totalAdvanceReceived,
        totalAdvanceUtilized,
        totalAvailableBalance,
        totalMembersCount: ledger.length,
        membersWithAdvanceCount,
        membersWithActiveBalanceCount
      },
      ledger
    });
  } catch (error) {
    console.error('Error in getAdvanceLedger:', error.message);
    return res.status(500).json({
      success: false,
      message: 'अ‍ॅडव्हान्स खतावणी लोड करताना त्रुटी आली'
    });
  }
};

/**
 * GET /api/v1/payments/resident/:residentId/history
 * Comprehensive member-wise financial history: all dues, all payments, and advance credit
 */
export const getResidentFinancialHistory = async (req, res) => {
  try {
    const { residentId } = req.params;
    if (!residentId || !mongoose.Types.ObjectId.isValid(residentId)) {
      return res.status(400).json({
        success: false,
        message: 'अवैध सभासद ओळख क्रमांक'
      });
    }

    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({
        success: false,
        message: 'सभासद आढळला नाही'
      });
    }

    // Fetch all dues for this resident
    const dues = await MaintenanceDue.find({ residentId }).sort({ year: -1, month: -1 });

    // Fetch all payments for this resident
    const payments = await Payment.find({ residentId }).sort({ paymentDate: -1 });

    // Fetch all advance payments for this resident
    const advances = await AdvancePayment.find({ residentId }).sort({ paymentDate: -1 });

    // Aggregates for this resident
    const totalBilled = dues.reduce((acc, d) => acc + (d.totalAmountDue || 0), 0);
    const totalDirectPaid = dues.reduce((acc, d) => acc + (d.amountPaid || 0), 0);
    const totalAdvanceAdjusted = dues.reduce((acc, d) => acc + (d.advanceAdjustedAmount || 0), 0);
    const totalOutstanding = dues.reduce((acc, d) => acc + (d.outstandingBalance || 0), 0);
    const pendingDuesCount = dues.filter((d) => d.outstandingBalance > 0).length;
    const paidDuesCount = dues.filter((d) => d.status === 'PAID').length;

    return res.status(200).json({
      success: true,
      resident: {
        _id: resident._id,
        fullNameMarathi: resident.fullNameMarathi,
        flatNumber: resident.flatNumber || '',
        wing: resident.wing || 'A Wing',
        propertyType: resident.propertyType,
        maintenanceCategory: resident.maintenanceCategory,
        customMaintenanceAmount: resident.customMaintenanceAmount,
        advanceBalance: resident.advanceBalance || 0,
        totalAdvanceReceived: resident.totalAdvanceReceived || 0,
        totalAdvanceUtilized: resident.totalAdvanceUtilized || 0,
        mobileNumber: resident.mobileNumber || '',
        email: resident.email || '',
        status: resident.status
      },
      summary: {
        totalBilled,
        totalDirectPaid,
        totalAdvanceAdjusted,
        totalOutstanding,
        pendingDuesCount,
        paidDuesCount,
        availableAdvanceBalance: resident.advanceBalance || 0,
        totalPaymentsCount: payments.length,
        totalAdvancesCount: advances.length
      },
      dues,
      payments,
      advances
    });
  } catch (error) {
    console.error('Error in getResidentFinancialHistory:', error.message);
    return res.status(500).json({
      success: false,
      message: 'सभासदाचा आर्थिक इतिहास लोड करताना त्रुटी आली'
    });
  }
};
