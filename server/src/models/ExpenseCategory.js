import mongoose from 'mongoose';

/**
 * ExpenseCategory Schema
 * Supports society expenditure categorization with Marathi & English labels.
 * Configurable by Super Admin.
 */
const expenseCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    nameMarathi: {
      type: String,
      required: true,
      trim: true
    },
    nameEnglish: {
      type: String,
      required: true,
      trim: true
    },
    isCustom: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const DEFAULT_EXPENSE_CATEGORIES = [
  { code: 'ELECTRICITY', nameMarathi: 'वीज बिल (Electricity)', nameEnglish: 'Electricity' },
  { code: 'WATER', nameMarathi: 'पाणी पुरवठा (Water Supply)', nameEnglish: 'Water Supply' },
  { code: 'CLEANING', nameMarathi: 'साफसफाई (Cleaning & Sanitation)', nameEnglish: 'Cleaning' },
  { code: 'SECURITY', nameMarathi: 'सुरक्षा रक्षक (Security Services)', nameEnglish: 'Security' },
  { code: 'REPAIR_MAINTENANCE', nameMarathi: 'दुरुस्ती व देखभाल (Repairs & Maintenance)', nameEnglish: 'Repairs & Maintenance' },
  { code: 'PLUMBING', nameMarathi: 'प्लंबिंग कामे (Plumbing)', nameEnglish: 'Plumbing' },
  { code: 'LIFT', nameMarathi: 'लिफ्ट देखभाल (Lift Maintenance / AMC)', nameEnglish: 'Lift Maintenance' },
  { code: 'GARDEN', nameMarathi: 'बागकाम व परिसर (Garden Maintenance)', nameEnglish: 'Garden Maintenance' },
  { code: 'OTHER', nameMarathi: 'इतर किरकोळ खर्च (Other Expenses)', nameEnglish: 'Other' }
];

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);

export default ExpenseCategory;
