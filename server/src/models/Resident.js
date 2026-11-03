import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema(
  {
    // Exact Marathi Full Name (Required, immutable master identity)
    fullNameMarathi: {
      type: String,
      required: [true, 'मराठी नाव आवश्यक आहे (Marathi full name is required)'],
      trim: true
    },
    // Flat number: Initially blank for all 16 original members
    flatNumber: {
      type: String,
      trim: true,
      default: ''
    },
    // Building Wing: Default "A Wing"
    wing: {
      type: String,
      default: 'A Wing',
      trim: true
    },
    // Contact details: Initially blank. No invented data
    mobileNumber: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    // Status: ACTIVE (default) allows society operations, INACTIVE marks deactivated/past resident
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    // Internal administrative remarks/notes
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
residentSchema.index({ fullNameMarathi: 1 });
residentSchema.index({ status: 1 });

// Partial unique index: Ensures non-blank flat numbers within the same wing are strictly unique,
// while allowing multiple initial records to remain safely blank without collision.
residentSchema.index(
  { flatNumber: 1, wing: 1 },
  {
    unique: true,
    partialFilterExpression: {
      flatNumber: { $type: 'string', $gt: '' }
    }
  }
);

const Resident = mongoose.model('Resident', residentSchema);

export default Resident;
