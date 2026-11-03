import mongoose from 'mongoose';

/**
 * Payment Model Schema
 * Represents an officially recorded manual maintenance payment and receipt.
 */
const paymentSchema = new mongoose.Schema(
  {
    // Official unique receipt number: SCA-YYYYMM-XXXX (e.g., SCA-202611-0001)
    receiptNumber: {
      type: String,
      required: [true, 'पावती क्रमांक आवश्यक आहे (Receipt number is required)'],
      unique: true,
      trim: true,
      index: true
    },
    // Reference to the specific monthly maintenance due
    maintenanceDueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceDue',
      required: [true, 'मासिक देयक संदर्भ आवश्यक आहे (Maintenance due reference is required)'],
      index: true
    },
    // Reference to the resident master record
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'सभासद संदर्भ आवश्यक आहे (Resident reference is required)'],
      index: true
    },
    // Immutable snapshot of resident details at time of payment
    residentNameMarathi: {
      type: String,
      required: [true, 'सभासदाचे नाव आवश्यक आहे'],
      trim: true
    },
    flatNumber: {
      type: String,
      trim: true,
      default: ''
    },
    wing: {
      type: String,
      trim: true,
      default: 'A Wing'
    },
    // Billing Period
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
    // Financial Breakdown Snapshots
    totalAmountDue: {
      type: Number,
      required: true,
      min: 0
    },
    previousAmountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    amountReceived: {
      type: Number,
      required: [true, 'जमा रक्कम आवश्यक आहे (Amount received is required)'],
      min: [0.01, 'जमा रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)']
    },
    remainingBalance: {
      type: Number,
      required: true,
      min: 0
    },
    // Payment Details
    paymentDate: {
      type: Date,
      required: [true, 'पेमेंट दिनांक आवश्यक आहे (Payment date is required)'],
      default: Date.now
    },
    paymentMethod: {
      type: String,
      required: [true, 'पेमेंट पद्धत आवश्यक आहे (Payment method is required)'],
      enum: {
        values: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
        message: 'अवैध पेमेंट पद्धत (Invalid payment method)'
      }
    },
    transactionRef: {
      type: String,
      trim: true,
      default: '' // UTR for UPI/NEFT/RTGS, Cheque number, or cash receipt reference
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    // Idempotency key for preventing duplicate network submissions
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      sparse: true,
      index: true
    },
    // Payment Lifecycle & Auditing
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true
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
    // Admin who recorded payment
    recordedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for rapid filtering and reporting
paymentSchema.index({ month: 1, year: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ residentId: 1, paymentDate: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

