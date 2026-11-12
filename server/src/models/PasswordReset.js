import mongoose from 'mongoose';

/**
 * PasswordReset Model Schema
 * Manages single-use, cryptographically hashed OTPs and verified reset tokens for Admin password recovery.
 */
const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    // Bcrypt hash of the 6-digit OTP
    otpHash: {
      type: String,
      required: true
    },
    // OTP validity: 5 minutes from issuance
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    // Number of failed verification attempts (max 5)
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    // True once the OTP has been successfully verified
    verified: {
      type: Boolean,
      default: false
    },
    // Single-use token issued upon OTP verification to authorize setting the new password
    resetTokenHash: {
      type: String,
      default: null,
      index: true
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null
    },
    // True once password has been successfully updated or OTP invalidated
    used: {
      type: Boolean,
      default: false,
      index: true
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

// Automatic TTL cleanup: documents expire automatically after 30 minutes
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;

