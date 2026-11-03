import Counter from '../models/Counter.js';

/**
 * Atomic Sequential Receipt Number Generator
 * Standardized Society Format: SCA-YYYYMM-XXXX (e.g., SCA-202611-0001)
 *
 * @param {number} year - Billing year (e.g. 2026)
 * @param {number} month - Billing month (1-12)
 * @param {import('mongoose').ClientSession} [session] - Optional MongoDB session for transactional atomicity
 * @returns {Promise<string>} Standardized receipt number
 */
export async function generateAtomicReceiptNumber(year, month, session = null) {
  const y = Number(year);
  const m = Number(month);

  if (!y || !m || m < 1 || m > 12) {
    throw new Error('अवैध महिना किंवा वर्ष (Invalid month or year for receipt numbering)');
  }

  const monthStr = String(m).padStart(2, '0');
  const periodKey = `receipt_${y}${monthStr}`;

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
  return `SCA-${y}${monthStr}-${sequenceStr}`;
}

export default generateAtomicReceiptNumber;

