import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    // Database-level singleton enforcement:
    // With unique: true, MongoDB physically prevents a second document from being inserted
    singletonKey: {
      type: String,
      default: 'SHIVNERI_SUPER_ADMIN_SINGLETON',
      unique: true,
      immutable: true,
      required: true
    },
    fullNameMarathi: {
      type: String,
      default: 'श्री ल.रा. कोळी',
      trim: true,
      required: true
    },
    fullNameEnglish: {
      type: String,
      default: 'Shri Laxman Koli',
      trim: true,
      required: true
    },
    designation: {
      type: String,
      default: 'Chairman / Building Secretary',
      trim: true,
      required: true
    },
    username: {
      type: String,
      required: [true, 'वापरकर्तानाव आवश्यक आहे (Username is required)'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'वापरकर्तानाव किमान ३ अक्षरांचे असावे (Username must be at least 3 characters)']
    },
    passwordHash: {
      type: String,
      required: [true, 'पासवर्ड हॅश आवश्यक आहे (Password hash is required)']
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN'],
      default: 'SUPER_ADMIN',
      immutable: true
    },
    contactNumber: {
      type: String,
      trim: true,
      default: ''
    },
    recoveryEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    tenureHistory: [
      {
        fullNameMarathi: { type: String, required: true },
        fullNameEnglish: { type: String, required: true },
        username: { type: String, required: true },
        designation: { type: String, default: 'Chairman / Building Secretary' },
        contactNumber: { type: String, default: '' },
        tenureStartDate: { type: Date, default: Date.now },
        tenureEndDate: { type: Date, default: Date.now },
        handoverReason: { type: String, required: true },
        resolutionNumber: { type: String, default: '' },
        transferredAt: { type: Date, default: Date.now }
      }
    ],
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Defense-in-depth: Mongoose pre-save validation hook
adminSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existingCount = await this.constructor.countDocuments();
    if (existingCount >= 1) {
      const err = new Error(
        'फक्त एकाच मुख्य प्रशासक (Super Admin) खात्यास परवानगी आहे. (Only one Super Admin account is allowed in the database.)'
      );
      err.code = 'SINGLETON_VIOLATION';
      return next(err);
    }
  }
  next();
});

// Compare password instance method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Transform to JSON: omit sensitive credentials
adminSchema.methods.toJSON = function () {
  const adminObj = this.toObject();
  delete adminObj.passwordHash;
  delete adminObj.singletonKey;
  delete adminObj.__v;
  return adminObj;
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
