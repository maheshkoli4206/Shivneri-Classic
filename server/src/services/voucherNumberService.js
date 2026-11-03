import Counter from '../models/Counter.js';

/**
 * Atomic Sequential Voucher Number Generator for Expenses
 * Standardized Society Format: EXP-YYYYMM-XXXX (e.g., EXP-202611-0001)
 *
 * @param {number} year - Expense year (e.g. 2026)
 * @param {number} month - Expense month (1-12)
 * @param {import('mongoose').ClientSession} [session] - Optional MongoDB session
 * @returns {Promise<string>} Standardized voucher number
 */
export async function generateAtomicVoucherNumber(year, month, session = null) {
  const y = Number(year);
  const m = Number(month);

  if (!y || !m || m < 1 || m > 12) {
    throw new Error('अवैध महिना किंवा वर्ष (Invalid month or year for voucher numbering)');
  }

  const monthStr = String(m).padStart(2, '0');
  const periodKey = `expense_${y}${monthStr}`;

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  };

  if (session) {
    options.session = session;
  }

  const counter = await Counter.findByIdAndUpdate(
    periodKey,
    { $inc: { seq: 1 } },
    options
  );

  const sequenceStr = String(counter.seq).padStart(4, '0');
  return `EXP-${y}${monthStr}-${sequenceStr}`;
}

export default generateAtomicVoucherNumber;
