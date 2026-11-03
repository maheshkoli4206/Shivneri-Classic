import mongoose from 'mongoose';

/**
 * Expense Schema
 * Represents an officially approved and voucher-tracked society expenditure.
 * Strictly adheres to audited soft-cancellation policy (Zero hard deletions).
 */
const expenseSchema = new mongoose.Schema(
  {
    // Official sequential voucher number: EXP-YYYYMM-XXXX
    voucherNumber: {
      type: String,
      required: [true, 'व्हाउचर क्रमांक आवश्यक आहे (Voucher number is required)'],
      unique: true,
      trim: true,
      index: true
    },
    titleMarathi: {
      type: String,
      required: [true, 'खर्चाचे शीर्षक आवश्यक आहे (Expense title is required)'],
      trim: true
    },
    titleEnglish: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'खर्च वर्गवारी आवश्यक आहे (Category is required)'],
      trim: true,
      uppercase: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'खर्च रक्कम आवश्यक आहे (Amount is required)'],
      min: [0.01, 'खर्च रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)']
    },
    expenseDate: {
      type: Date,
      required: [true, 'खर्च दिनांक आवश्यक आहे (Expense date is required)'],
      default: Date.now,
      index: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020
    },
    paymentMethod: {
      type: String,
      required: [true, 'पेमेंट पद्धत आवश्यक आहे (Payment method is required)'],
      enum: {
        values: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
        message: 'अवैध पेमेंट पद्धत (Invalid payment method)'
      },
      index: true
    },
    payeeName: {
      type: String,
      required: [true, 'पैसे स्वीकारणाऱ्याचे / विक्रेत्याचे नाव आवश्यक आहे (Payee name is required)'],
      trim: true
    },
    transactionRef: {
      type: String,
      trim: true,
      default: '' // UTR for UPI/NEFT, Cheque number, or cash voucher number
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: ''
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      sparse: true,
      index: true
    },
    // Audited Soft Cancellation Fields
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true
    },
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    // Admin who recorded the voucher
    recordedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  { timestamps: true }
);

expenseSchema.index({ month: 1, year: 1 });
expenseSchema.index({ expenseDate: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
