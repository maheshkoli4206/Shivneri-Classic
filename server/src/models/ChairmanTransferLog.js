import mongoose from 'mongoose';

/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – CHAIRMAN OWNERSHIP TRANSFER LOG SCHEMA
 * ==============================================================================
 * Records immutable handover events, verification state, and committee resolution
 * metadata for Super Admin ownership transitions.
 * ==============================================================================
 */
const chairmanTransferLogSchema = new mongoose.Schema(
  {
    transferId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'FAILED'],
      default: 'PENDING_CONFIRMATION',
      index: true
    },
    oldChairman: {
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
      fullNameMarathi: { type: String, required: true },
      fullNameEnglish: { type: String, required: true },
      username: { type: String, required: true },
      designation: { type: String, default: 'Chairman / Building Secretary' },
      contactNumber: { type: String, default: '' }
    },
    newChairman: {
      fullNameMarathi: { type: String, required: true, trim: true },
      fullNameEnglish: { type: String, required: true, trim: true },
      username: { type: String, required: true, trim: true, lowercase: true },
      designation: { type: String, default: 'Chairman / Building Secretary', trim: true },
      contactNumber: { type: String, required: true, trim: true }
    },
    newPasswordHash: {
      type: String,
      required: true
    },
    authorizedReason: {
      type: String,
      required: true,
      trim: true
    },
    resolutionNumber: {
      type: String,
      required: true,
      trim: true
    },
    confirmationCodeHash: {
      type: String,
      required: true
    },
    confirmationExpiresAt: {
      type: Date,
      required: true
    },
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    failureReason: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

chairmanTransferLogSchema.index({ status: 1, createdAt: -1 });

const ChairmanTransferLog = mongoose.model('ChairmanTransferLog', chairmanTransferLogSchema);

export default ChairmanTransferLog;

