import mongoose from 'mongoose';

const maintenanceConfigSchema = new mongoose.Schema(
  {
    // Singleton constraint guarantees exactly one configuration document exists
    singletonKey: {
      type: String,
      default: 'MAINTENANCE_CONFIG_SINGLETON',
      unique: true,
      immutable: true,
      required: true
    },
    // Configured monthly fee per apartment unit (Must be set by Super Admin)
    defaultMonthlyAmount: {
      type: Number,
      default: 1000,
      min: [0, 'देखभाल शुल्क शून्य किंवा जास्त असावे (Amount must be 0 or greater)']
    },
    // Category-wise maintenance rates
    categoryRates: {
      residential: {
        type: Number,
        default: 1000,
        min: [0, 'निवासी देखभाल शुल्क शून्य किंवा जास्त असावे (Residential rate must be 0 or greater)']
      },
      shop: {
        type: Number,
        default: 300,
        min: [0, 'दुकान देखभाल शुल्क शून्य किंवा जास्त असावे (Shop rate must be 0 or greater)']
      },
      chairman: {
        type: Number,
        default: 500,
        min: [0, 'चेअरमन देखभाल शुल्क शून्य किंवा जास्त असावे (Chairman rate must be 0 or greater)']
      }
    },
    // Due day of each month (1 to 28 for safe calendar handling)
    dueDay: {
      type: Number,
      default: 10,
      min: [1, 'किमान देय दिवस १ असावा (Minimum due day is 1)'],
      max: [28, 'कमाल देय दिवस २८ असावा (Maximum due day is 28)']
    },
    // Late fee configuration (Optional; disabled by default)
    lateFeeEnabled: {
      type: Boolean,
      default: false
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: [0, 'विलंब शुल्क शून्य किंवा जास्त असावे (Late fee must be 0 or greater)']
    },
    // Financial year starting month (Default: 4 for April in India)
    financialYearStartMonth: {
      type: Number,
      default: 4,
      min: 1,
      max: 12
    },
    // Automatic advance balance application toggle
    autoApplyAdvance: {
      type: Boolean,
      default: false
    },
    // Flag indicating whether the Super Admin has explicitly saved the configuration
    isConfigured: {
      type: Boolean,
      default: false
    },
    // Reference to Admin who updated configuration
    updatedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Transform to clean JSON
maintenanceConfigSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.singletonKey;
  delete obj.__v;
  return obj;
};

const MaintenanceConfig = mongoose.model('MaintenanceConfig', maintenanceConfigSchema);

export default MaintenanceConfig;

