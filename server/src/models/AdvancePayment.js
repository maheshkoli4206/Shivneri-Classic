import mongoose from 'mongoose';

/**
 * AdvancePayment Model Schema
 * Represents an advance maintenance payment credit deposited by a resident or shop owner.
 * Preserves the original advance payment and its atomic receipt history (SCA-YYYYMM-XXXX).
 */
const advancePaymentSchema = new mongoose.Schema(
  {
    // Official unique atomic receipt number: SCA-YYYYMM-XXXX
    receiptNumber: {
      type: String,
      required: [true, 'पावती क्रमांक आवश्यक आहे (Receipt number is required)'],
      unique: true,
      trim: true,
      index: true
    },
    // Reference to resident/shop master record
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident',
      required: [true, 'सभासद संदर्भ आवश्यक आहे (Resident reference is required)'],
      index: true
    },
    // Snapshot of resident details
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
    // Financial Credit Tracking
    amountReceived: {
      type: Number,
      required: [true, 'अ‍ॅडव्हान्स रक्कम आवश्यक आहे (Advance amount is required)'],
      min: [0.01, 'रक्कम शून्यापेक्षा जास्त असावी (Amount must be greater than zero)']
    },
    usedAmount: {
      type: Number,
      default: 0,
      min: [0, 'वापरलेली रक्कम ऋण असू शकत नाही']
    },
    availableBalance: {
      type: Number,
      required: true,
      min: [0, 'शिल्लक अ‍ॅडव्हान्स ऋण असू शकत नाही']
    },
    // Payment Details
    paymentDate: {
      type: Date,
      required: [true, 'दिनांक आवश्यक आहे'],
      default: Date.now
    },
    paymentMethod: {
      type: String,
      required: [true, 'पेमेंट पद्धत आवश्यक आहे'],
      enum: {
        values: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
        message: 'अवैध पेमेंट पद्धत (Invalid payment method)'
      }
    },
    transactionRef: {
      type: String,
      trim: true,
      default: ''
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'FULLY_UTILIZED', 'CANCELLED', 'REFUNDED'],
      default: 'ACTIVE',
      index: true
    },
    // Cancellation/Refund Auditing
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: ''
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundDate: {
      type: Date,
      default: null
    },
    refundRemarks: {
      type: String,
      trim: true,
      default: ''
    },
    // Adjustments ledger: tracks monthly bills to which this advance was applied
    adjustments: [
      {
        maintenanceDueId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MaintenanceDue',
          required: true
        },
        month: {
          type: Number,
          required: true
        },
        year: {
          type: Number,
          required: true
        },
        amountApplied: {
          type: Number,
          required: true,
          min: 0.01
        },
        appliedAt: {
          type: Date,
          default: Date.now
        },
        appliedByAdminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Admin',
          required: true
        },
        remarks: {
          type: String,
          default: ''
        }
      }
    ],
    // Admin who recorded advance payment
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

advancePaymentSchema.index({ residentId: 1, paymentDate: -1 });
advancePaymentSchema.index({ status: 1, paymentDate: -1 });

const AdvancePayment = mongoose.model('AdvancePayment', advancePaymentSchema);

export default AdvancePayment;

