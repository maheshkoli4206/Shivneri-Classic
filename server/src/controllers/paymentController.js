import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
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
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'जमा रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)'
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
    const currentRemaining = Math.round((due.totalAmountDue - due.amountPaid) * 100) / 100;
    if (currentRemaining <= 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'या देयकाची संपूर्ण रक्कम आधीच भरलेली आहे (This maintenance due is already fully paid)'
      });
    }

    // Strict Overpayment Check: No overpayments allowed
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
    const newOutstandingBalance = Math.round((due.totalAmountDue - newAmountPaid) * 100) / 100;
    const newStatus = newOutstandingBalance === 0 ? 'PAID' : 'PARTIAL';

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
      filter.$or = [
        { receiptNumber: { $regex: q, $options: 'i' } },
        { residentNameMarathi: { $regex: q, $options: 'i' } },
        { flatNumber: { $regex: q, $options: 'i' } },
        { transactionRef: { $regex: q, $options: 'i' } }
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
        .populate('recordedByAdminId', 'fullNameMarathi designation'),
      Payment.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      payments,
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
 * Retrieve details of an individual payment
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
      return res.status(404).json({
        success: false,
        message: 'पेमेंट नोंद आढळली नाही (Payment record not found)'
      });
    }

    return res.status(200).json({
      success: true,
      payment
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

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'पावतीसाठी पेमेंट नोंद आढळली नाही'
      });
    }

    const pdfBuffer = await generateReceiptPDF(payment, lang);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${payment.receiptNumber}.pdf"`);
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
        cancelledPaymentsCount
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
