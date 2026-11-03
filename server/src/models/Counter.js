import mongoose from 'mongoose';

/**
 * Counter Schema for Atomic Sequence Generation
 * Used to guarantee unique, collision-free, monotonic receipt numbers (SCA-YYYYMM-XXXX)
 */
const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Key format: `receipt_YYYYMM`
      required: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;

