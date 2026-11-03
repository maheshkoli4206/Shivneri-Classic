import mongoose from 'mongoose';

/**
 * Immutable Financial Audit Log Schema
 * Records all critical financial operations, payments, and audited cancellations.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'MAINTENANCE_CONFIG_UPDATED',
        'MONTHLY_DUES_GENERATED',
        'PAYMENT_RECORDED',
        'PAYMENT_CANCELLED',
        'EXPENSE_CREATED',
        'EXPENSE_CANCELLED'
      ]
    },
    performedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    entityType: {
      type: String,
      required: true,
      enum: ['ADMIN', 'RESIDENT', 'MAINTENANCE_CONFIG', 'MAINTENANCE_DUE', 'PAYMENT', 'EXPENSE']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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
    timestamps: { createdAt: true, updatedAt: false } // Immutable logs; never updated
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedByAdminId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
