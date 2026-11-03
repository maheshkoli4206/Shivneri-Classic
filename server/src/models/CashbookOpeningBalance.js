import mongoose from 'mongoose';

/**
 * CashbookOpeningBalance Schema
 * Allows Super Admin to configure society opening balances per payment mode with full audit trail.
 */
const cashbookOpeningBalanceSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'CASHBOOK_OPENING_BALANCE_SINGLETON',
      unique: true,
      immutable: true,
      required: true
    },
    cashAmount: {
      type: Number,
      default: 0,
      min: [0, 'रक्कम ० किंवा जास्त असावी']
    },
    bankAmount: {
      type: Number,
      default: 0,
      min: [0, 'रक्कम ० किंवा जास्त असावी']
    },
    upiAmount: {
      type: Number,
      default: 0,
      min: [0, 'रक्कम ० किंवा जास्त असावी']
    },
    chequeAmount: {
      type: Number,
      default: 0,
      min: [0, 'रक्कम ० किंवा जास्त असावी']
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    isConfigured: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    updatedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    // Audit History of Opening Balance Adjustments
    history: [
      {
        cashAmount: Number,
        bankAmount: Number,
        upiAmount: Number,
        chequeAmount: Number,
        effectiveDate: Date,
        notes: String,
        updatedAt: { type: Date, default: Date.now },
        updatedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
      }
    ]
  },
  { timestamps: true }
);

const CashbookOpeningBalance = mongoose.model('CashbookOpeningBalance', cashbookOpeningBalanceSchema);

export default CashbookOpeningBalance;
