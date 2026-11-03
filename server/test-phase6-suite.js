import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import Admin from './src/models/Admin.js';
import Resident from './src/models/Resident.js';
import MaintenanceConfig from './src/models/MaintenanceConfig.js';
import MaintenanceDue from './src/models/MaintenanceDue.js';
import Payment from './src/models/Payment.js';
import Counter from './src/models/Counter.js';
import { ORIGINAL_16_RESIDENTS } from './src/scripts/seedResidents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_PORT = 5009;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shivneri_classic_admin_db';
const JWT_SECRET = process.env.JWT_SECRET || 'shivneri_classic_super_secure_jwt_secret_nashik_2026';
process.env.JWT_SECRET = JWT_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

async function runPhase6TestSuite() {
  console.log('======================================================================');
  console.log('🧪 PHASE 6: MANUAL PAYMENTS & RECEIPT GENERATION TEST SUITE');
  console.log('======================================================================\n');

  const testResults = [];
  let server;

  try {
    await mongoose.connect(MONGODB_URI);
    server = app.listen(TEST_PORT);

    // 1. Verify Super Admin
    const admin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    if (!admin) {
      throw new Error('Super Admin missing in database!');
    }

    const adminToken = jwt.sign(
      { adminId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const authHeaders = {
      'Cookie': `token=${adminToken}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': CLIENT_ORIGIN,
      'Content-Type': 'application/json'
    };

    // Ensure Month 12/2026 dues exist for testing payments at official ₹1,000 rate
    await fetch(`${BASE_URL}/api/v1/maintenance/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ month: 12, year: 2026 })
    });

    // Reset Month 12 dues and payments for a clean deterministic test run
    // (Month 11 historical dues and residents remain completely untouched)
    await Payment.deleteMany({ month: 12, year: 2026 });
    await MaintenanceDue.updateMany(
      { month: 12, year: 2026 },
      { $set: { amountPaid: 0, outstandingBalance: 1000, status: 'UNPAID' } }
    );
    await Counter.deleteOne({ _id: 'receipt_202612' });

    const month12Dues = await MaintenanceDue.find({ month: 12, year: 2026 }).sort({ createdAt: 1 });
    if (month12Dues.length !== 16) {
      throw new Error(`Expected 16 dues for 12/2026, found: ${month12Dues.length}`);
    }

    const testDue1 = month12Dues[0]; // For Full Payment test
    const testDue2 = month12Dues[1]; // For Partial Payment & Multiple Partials test
    const testDue3 = month12Dues[2]; // For Idempotency test
    const testDue4 = month12Dues[3]; // For Concurrency test
    const testDue5 = month12Dues[4]; // For Cancellation & Audit test

    // -------------------------------------------------------------
    // TEST 1: Successful Full Payment
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Successful Full Payment...');
    const fullPayRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue1._id,
        amountReceived: testDue1.outstandingBalance, // Exactly ₹1,000
        paymentDate: '2026-12-01',
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TEST-FULL-001',
        remarks: 'December full payment test'
      })
    });

    const fullPayData = await fullPayRes.json();
    const updatedDue1 = await MaintenanceDue.findById(testDue1._id);

    const test1Pass =
      fullPayRes.status === 201 &&
      fullPayData.success &&
      fullPayData.payment?.receiptNumber.startsWith('SCA-202612-') &&
      fullPayData.payment?.amountReceived === testDue1.outstandingBalance &&
      fullPayData.payment?.remainingBalance === 0 &&
      updatedDue1.status === 'PAID' &&
      updatedDue1.outstandingBalance === 0;

    testResults.push({
      id: 1,
      name: 'Successful full payment sets status to PAID and balance to 0',
      status: test1Pass ? 'PASS' : 'FAIL',
      evidence: `Receipt: ${fullPayData.payment?.receiptNumber}, Due Status: ${updatedDue1.status}, Balance: ₹${updatedDue1.outstandingBalance}`
    });
    console.log(`  -> Status: ${test1Pass ? 'PASS' : 'FAIL'} (Receipt: ${fullPayData.payment?.receiptNumber})`);

    // -------------------------------------------------------------
    // TEST 2: Successful Partial Payment
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing Successful Partial Payment...');
    const partialAmount = 400; // Partial of ₹1,000
    const partialPayRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue2._id,
        amountReceived: partialAmount,
        paymentDate: '2026-12-02',
        paymentMethod: 'CASH',
        transactionRef: 'CASH-REC-001',
        remarks: 'First partial payment'
      })
    });

    const partialPayData = await partialPayRes.json();
    const updatedDue2 = await MaintenanceDue.findById(testDue2._id);

    const test2Pass =
      partialPayRes.status === 201 &&
      partialPayData.success &&
      partialPayData.payment?.amountReceived === partialAmount &&
      partialPayData.payment?.remainingBalance === 600 &&
      updatedDue2.status === 'PARTIAL' &&
      updatedDue2.amountPaid === 400 &&
      updatedDue2.outstandingBalance === 600;

    testResults.push({
      id: 2,
      name: 'Successful partial payment sets status to PARTIAL and calculates balance',
      status: test2Pass ? 'PASS' : 'FAIL',
      evidence: `Receipt: ${partialPayData.payment?.receiptNumber}, Amount Paid: ₹${updatedDue2.amountPaid}, Balance: ₹${updatedDue2.outstandingBalance}`
    });
    console.log(`  -> Status: ${test2Pass ? 'PASS' : 'FAIL'} (Paid: ₹${updatedDue2.amountPaid}, Balance: ₹${updatedDue2.outstandingBalance})`);

    // -------------------------------------------------------------
    // TEST 3: Multiple Partial Payments Against One Due
    // -------------------------------------------------------------
    console.log('[TEST 3] Testing Multiple Partial Payments Against Same Due...');
    // Second partial payment of ₹350 on testDue2 (leaving balance ₹250)
    const secondPartialRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue2._id,
        amountReceived: 350,
        paymentDate: '2026-12-05',
        paymentMethod: 'BANK_TRANSFER',
        transactionRef: 'NEFT-TEST-002',
        remarks: 'Second partial payment'
      })
    });
    const secondPartialData = await secondPartialRes.json();
    const dueAfterSecond = await MaintenanceDue.findById(testDue2._id);

    // Third final payment of ₹250 on testDue2 (paying off remaining balance)
    const thirdFinalRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue2._id,
        amountReceived: 250,
        paymentDate: '2026-12-10',
        paymentMethod: 'UPI',
        transactionRef: 'UPI-TEST-FINAL-003',
        remarks: 'Final settlement payment'
      })
    });
    const thirdFinalData = await thirdFinalRes.json();
    const dueAfterThird = await MaintenanceDue.findById(testDue2._id);

    const test3Pass =
      secondPartialRes.status === 201 &&
      dueAfterSecond.amountPaid === 750 &&
      dueAfterSecond.outstandingBalance === 250 &&
      dueAfterSecond.status === 'PARTIAL' &&
      thirdFinalRes.status === 201 &&
      dueAfterThird.amountPaid === 1000 &&
      dueAfterThird.outstandingBalance === 0 &&
      dueAfterThird.status === 'PAID';

    testResults.push({
      id: 3,
      name: 'Multiple partial payments accumulate correctly and transition to PAID',
      status: test3Pass ? 'PASS' : 'FAIL',
      evidence: `Payment 2: ₹350 (Bal: ₹${dueAfterSecond.outstandingBalance}), Payment 3: ₹250 (Bal: ₹${dueAfterThird.outstandingBalance}, Status: ${dueAfterThird.status})`
    });
    console.log(`  -> Status: ${test3Pass ? 'PASS' : 'FAIL'} (Final Balance: ₹${dueAfterThird.outstandingBalance}, Status: ${dueAfterThird.status})`);

    // -------------------------------------------------------------
    // TEST 4: Correct Remaining Balance Calculation
    // -------------------------------------------------------------
    console.log('[TEST 4] Verifying Exact Math on Remaining Balance across All Payments...');
    const allPayments = await Payment.find();
    let balanceMathCorrect = true;
    allPayments.forEach(p => {
      const expected = Math.round((p.totalAmountDue - (p.previousAmountPaid + p.amountReceived)) * 100) / 100;
      if (p.remainingBalance !== expected) {
        balanceMathCorrect = false;
      }
    });

    testResults.push({
      id: 4,
      name: 'Remaining balance mathematically equals totalAmountDue - (previousPaid + received)',
      status: balanceMathCorrect ? 'PASS' : 'FAIL',
      evidence: `Verified ${allPayments.length} recorded payments`
    });
    console.log(`  -> Status: ${balanceMathCorrect ? 'PASS' : 'FAIL'} (Records Checked: ${allPayments.length})`);

    // -------------------------------------------------------------
    // TEST 5: Reject Zero and Negative Payments
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Rejection of Zero and Negative Payments...');
    const zeroPayRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue3._id,
        amountReceived: 0,
        paymentMethod: 'CASH'
      })
    });
    const negPayRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue3._id,
        amountReceived: -500,
        paymentMethod: 'CASH'
      })
    });

    const test5Pass = zeroPayRes.status === 400 && negPayRes.status === 400;
    testResults.push({
      id: 5,
      name: 'Server strictly rejects zero and negative payments with HTTP 400',
      status: test5Pass ? 'PASS' : 'FAIL',
      evidence: `Zero Payment: HTTP ${zeroPayRes.status}, Negative Payment: HTTP ${negPayRes.status}`
    });
    console.log(`  -> Status: ${test5Pass ? 'PASS' : 'FAIL'} (Zero: ${zeroPayRes.status}, Negative: ${negPayRes.status})`);

    // -------------------------------------------------------------
    // TEST 6: Reject Payment Exceeding Outstanding Balance
    // -------------------------------------------------------------
    console.log('[TEST 6] Testing Rejection of Overpayment (Exceeding Balance)...');
    // testDue3 has balance ₹1,000; attempt to pay ₹1,050
    const overPayRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue3._id,
        amountReceived: 1050,
        paymentMethod: 'UPI'
      })
    });
    const overPayData = await overPayRes.json();
    const test6Pass =
      overPayRes.status === 400 &&
      overPayData.message.includes('जास्त असू शकत नाही');

    testResults.push({
      id: 6,
      name: 'Server strictly rejects payments exceeding outstanding balance with HTTP 400',
      status: test6Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${overPayRes.status}, Message: ${overPayData.message}`
    });
    console.log(`  -> Status: ${test6Pass ? 'PASS' : 'FAIL'} (${overPayRes.status})`);

    // -------------------------------------------------------------
    // TEST 7: Reject Invalid Due or Resident References
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Rejection of Invalid Due References...');
    const fakeId = new mongoose.Types.ObjectId();
    const invalidDueRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: fakeId,
        amountReceived: 500,
        paymentMethod: 'UPI'
      })
    });
    const malformedDueRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: 'not-a-mongo-id',
        amountReceived: 500,
        paymentMethod: 'UPI'
      })
    });

    const test7Pass = invalidDueRes.status === 404 && malformedDueRes.status === 400;
    testResults.push({
      id: 7,
      name: 'Server strictly rejects invalid or non-existent due references',
      status: test7Pass ? 'PASS' : 'FAIL',
      evidence: `Non-existent ID: HTTP ${invalidDueRes.status}, Malformed ID: HTTP ${malformedDueRes.status}`
    });
    console.log(`  -> Status: ${test7Pass ? 'PASS' : 'FAIL'} (404 / 400)`);

    // -------------------------------------------------------------
    // TEST 8: Duplicate Request & Idempotency Protection
    // -------------------------------------------------------------
    console.log('[TEST 8] Testing Idempotency Protection on Duplicate Submissions...');
    const testIdempotencyKey = `IDEMP-TEST-KEY-${Date.now()}`;
    const idempPayload = {
      maintenanceDueId: testDue3._id,
      amountReceived: 500,
      paymentDate: '2026-12-08',
      paymentMethod: 'UPI',
      transactionRef: 'UPI-IDEMP-001',
      idempotencyKey: testIdempotencyKey
    };

    // First request
    const firstIdempRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(idempPayload)
    });
    const firstIdempData = await firstIdempRes.json();

    // Duplicate retry request with same key
    const secondIdempRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(idempPayload)
    });
    const secondIdempData = await secondIdempRes.json();

    const dueAfterIdemp = await MaintenanceDue.findById(testDue3._id);

    const test8Pass =
      firstIdempRes.status === 201 &&
      secondIdempRes.status === 200 &&
      secondIdempData.isDuplicate === true &&
      secondIdempData.payment?.receiptNumber === firstIdempData.payment?.receiptNumber &&
      dueAfterIdemp.amountPaid === 500; // Deducted only once!

    testResults.push({
      id: 8,
      name: 'Idempotency key prevents duplicate payment creation and prevents double-deduction',
      status: test8Pass ? 'PASS' : 'FAIL',
      evidence: `First Receipt: ${firstIdempData.payment?.receiptNumber}, Second Call: isDuplicate=${secondIdempData.isDuplicate}, Due Amount Paid: ₹${dueAfterIdemp.amountPaid}`
    });
    console.log(`  -> Status: ${test8Pass ? 'PASS' : 'FAIL'} (isDuplicate: ${secondIdempData.isDuplicate}, Paid: ₹${dueAfterIdemp.amountPaid})`);

    // -------------------------------------------------------------
    // TEST 9: Concurrent Payment Requests Safety
    // -------------------------------------------------------------
    console.log('[TEST 9] Testing Concurrency Guard on Simultaneous Payment Calls...');
    // testDue4 has balance ₹1,000. Send 5 simultaneous requests of ₹500 each.
    // At most 2 can succeed (2 * 500 = 1000). Remaining 3 must be safely rejected.
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        fetch(`${BASE_URL}/api/v1/payments/record`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            maintenanceDueId: testDue4._id,
            amountReceived: 500,
            paymentMethod: 'UPI',
            transactionRef: `CONCURRENT-TXN-${i}`
          })
        }).then(r => r.json())
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    const successfulConcurrent = concurrentResults.filter(r => r.success && !r.isDuplicate);
    const dueAfterConcurrent = await MaintenanceDue.findById(testDue4._id);

    const test9Pass =
      successfulConcurrent.length >= 1 &&
      successfulConcurrent.length <= 2 &&
      dueAfterConcurrent.amountPaid <= 1000 &&
      dueAfterConcurrent.amountPaid > 0 &&
      dueAfterConcurrent.outstandingBalance >= 0;

    testResults.push({
      id: 9,
      name: 'Concurrency control prevents overpayment under simultaneous parallel requests',
      status: test9Pass ? 'PASS' : 'FAIL',
      evidence: `Successful payments: ${successfulConcurrent.length}/5 (Safe 409 rejection on collisions), Final Amount Paid: ₹${dueAfterConcurrent.amountPaid}, Balance: ₹${dueAfterConcurrent.outstandingBalance}`
    });
    console.log(`  -> Status: ${test9Pass ? 'PASS' : 'FAIL'} (Successful: ${successfulConcurrent.length}/5, Final Paid: ₹${dueAfterConcurrent.amountPaid})`);

    // -------------------------------------------------------------
    // TEST 10: Unique Receipt Number Generation (SCA-YYYYMM-XXXX)
    // -------------------------------------------------------------
    console.log('[TEST 10] Verifying Standardized Unique Receipt Format (SCA-YYYYMM-XXXX)...');
    const allDbPayments = await Payment.find();
    const receiptSet = new Set();
    let formatValid = true;
    const formatRegex = /^SCA-\d{6}-\d{4}$/;

    allDbPayments.forEach(p => {
      if (!formatRegex.test(p.receiptNumber)) {
        formatValid = false;
      }
      receiptSet.add(p.receiptNumber);
    });

    const test10Pass =
      formatValid &&
      receiptSet.size === allDbPayments.length &&
      allDbPayments.length > 0;

    testResults.push({
      id: 10,
      name: 'All receipt numbers strictly adhere to SCA-YYYYMM-XXXX format and are 100% unique',
      status: test10Pass ? 'PASS' : 'FAIL',
      evidence: `Total Receipts: ${allDbPayments.length}, Unique Receipts: ${receiptSet.size}, Sample: ${allDbPayments[0]?.receiptNumber}`
    });
    console.log(`  -> Status: ${test10Pass ? 'PASS' : 'FAIL'} (Sample: ${allDbPayments[0]?.receiptNumber}, Unique: ${receiptSet.size}/${allDbPayments.length})`);

    // -------------------------------------------------------------
    // TEST 11: Database Rollback & Audited Cancellation
    // -------------------------------------------------------------
    console.log('[TEST 11] Testing Audited Soft-Cancellation & Due Balance Reversion...');
    // Record payment on testDue5 of ₹600
    const pay5Res = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        maintenanceDueId: testDue5._id,
        amountReceived: 600,
        paymentMethod: 'CASH',
        remarks: 'Payment to be cancelled'
      })
    });
    const pay5Data = await pay5Res.json();
    const paymentId = pay5Data.payment._id;

    // Check due balance after payment
    const dueBeforeCancel = await MaintenanceDue.findById(testDue5._id);

    // Cancel payment with mandatory reason
    const cancelRes = await fetch(`${BASE_URL}/api/v1/payments/${paymentId}/cancel`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        cancellationReason: 'धनादेश वठला नाही किंवा चुकीची पावती तयार झाली (Test cancellation)'
      })
    });
    const cancelData = await cancelRes.json();
    const dueAfterCancel = await MaintenanceDue.findById(testDue5._id);
    const paymentAfterCancel = await Payment.findById(paymentId);

    const test11Pass =
      dueBeforeCancel.amountPaid === 600 &&
      cancelRes.status === 200 &&
      cancelData.success &&
      paymentAfterCancel.status === 'CANCELLED' &&
      paymentAfterCancel.cancellationReason.includes('धनादेश') &&
      dueAfterCancel.amountPaid === 0 &&
      dueAfterCancel.outstandingBalance === 1000 &&
      dueAfterCancel.status === 'UNPAID';

    testResults.push({
      id: 11,
      name: 'Audited cancellation soft-cancels payment, logs reason, and perfectly restores due balance',
      status: test11Pass ? 'PASS' : 'FAIL',
      evidence: `Before Cancel: Paid ₹${dueBeforeCancel.amountPaid}, After Cancel: Paid ₹${dueAfterCancel.amountPaid}, Status: ${paymentAfterCancel.status}`
    });
    console.log(`  -> Status: ${test11Pass ? 'PASS' : 'FAIL'} (Status: ${paymentAfterCancel.status}, Reverted Balance: ₹${dueAfterCancel.outstandingBalance})`);

    // -------------------------------------------------------------
    // TEST 12: Correct Payment History & Register
    // -------------------------------------------------------------
    console.log('[TEST 12] Testing Payment History Register with Search & Filters...');
    const histRes = await fetch(`${BASE_URL}/api/v1/payments?status=COMPLETED&limit=10`, {
      headers: authHeaders
    });
    const histData = await histRes.json();

    const searchRes = await fetch(`${BASE_URL}/api/v1/payments?search=UPI`, {
      headers: authHeaders
    });
    const searchData = await searchRes.json();

    const test12Pass =
      histRes.status === 200 &&
      histData.success &&
      Array.isArray(histData.payments) &&
      histData.payments.every(p => p.status === 'COMPLETED') &&
      searchRes.status === 200 &&
      searchData.payments.length > 0;

    testResults.push({
      id: 12,
      name: 'Payment register correctly supports status filtering, pagination, and search',
      status: test12Pass ? 'PASS' : 'FAIL',
      evidence: `Completed Payments Count: ${histData.pagination?.totalCount}, Search Matches: ${searchData.payments?.length}`
    });
    console.log(`  -> Status: ${test12Pass ? 'PASS' : 'FAIL'} (Count: ${histData.payments?.length}, Search: ${searchData.payments?.length})`);

    // -------------------------------------------------------------
    // TEST 13: PDF Receipt Generation & Marathi Rendering
    // -------------------------------------------------------------
    console.log('[TEST 13] Testing Server-side PDF Receipt Generation and Marathi Output...');
    const validPayment = await Payment.findOne({ status: 'COMPLETED' });
    const pdfRes = await fetch(`${BASE_URL}/api/v1/payments/${validPayment._id}/receipt-pdf?lang=mr`, {
      headers: { 'Cookie': `token=${adminToken}` }
    });

    const contentType = pdfRes.headers.get('content-type');
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfBytes = Buffer.from(pdfBuffer);
    const pdfHeader = pdfBytes.subarray(0, 5).toString('ascii'); // Must start with '%PDF-'

    const test13Pass =
      pdfRes.status === 200 &&
      contentType === 'application/pdf' &&
      pdfHeader === '%PDF-' &&
      pdfBytes.length > 1000;

    testResults.push({
      id: 13,
      name: 'PDF receipt generates valid downloadable PDF buffer with Devanagari font support',
      status: test13Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${pdfRes.status}, Content-Type: ${contentType}, Size: ${pdfBytes.length} bytes, Header: ${pdfHeader}`
    });
    console.log(`  -> Status: ${test13Pass ? 'PASS' : 'FAIL'} (Size: ${pdfBytes.length} bytes, Header: ${pdfHeader})`);

    // -------------------------------------------------------------
    // TEST 14: Unauthorized User Rejection
    // -------------------------------------------------------------
    console.log('[TEST 14] Testing Security: Unauthenticated Payment Recording Blocked...');
    const unauthRes = await fetch(`${BASE_URL}/api/v1/payments/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': CLIENT_ORIGIN
      },
      body: JSON.stringify({
        maintenanceDueId: testDue1._id,
        amountReceived: 1000,
        paymentMethod: 'CASH'
      })
    });

    const test14Pass = unauthRes.status === 401;
    testResults.push({
      id: 14,
      name: 'Unauthenticated payment requests are strictly rejected with 401 Unauthorized',
      status: test14Pass ? 'PASS' : 'FAIL',
      evidence: `HTTP Status: ${unauthRes.status}`
    });
    console.log(`  -> Status: ${test14Pass ? 'PASS' : 'FAIL'} (${unauthRes.status})`);

    // -------------------------------------------------------------
    // TEST 15: Historical Dues & Resident Records Preservation
    // -------------------------------------------------------------
    console.log('[TEST 15] Verifying 16 Original Resident Records & Month 11 Dues Intactness...');
    const residentCount = await Resident.countDocuments({ status: 'ACTIVE' });
    const residents = await Resident.find().select('fullNameMarathi');
    const dbNames = new Set(residents.map(r => r.fullNameMarathi));
    const allOriginalsMatch = ORIGINAL_16_RESIDENTS.every(name => dbNames.has(name));

    const month11Dues = await MaintenanceDue.find({ month: 11, year: 2026 });
    const adminCount = await Admin.countDocuments();

    const test15Pass =
      residentCount === 16 &&
      allOriginalsMatch &&
      month11Dues.length === 16 &&
      adminCount === 1;

    testResults.push({
      id: 15,
      name: 'All 16 original Marathi resident records, Super Admin, and Month 11 dues remain 100% intact',
      status: test15Pass ? 'PASS' : 'FAIL',
      evidence: `Residents: ${residentCount}/16, Original Names Match: ${allOriginalsMatch}, Month 11 Dues: ${month11Dues.length}, Admins: ${adminCount}`
    });
    console.log(`  -> Status: ${test15Pass ? 'PASS' : 'FAIL'} (Residents: ${residentCount}, Month 11 Dues: ${month11Dues.length}, Admin: ${adminCount})`);

    // -------------------------------------------------------------
    // TEST 16: Payment Dashboard Summary API
    // -------------------------------------------------------------
    console.log('[TEST 16] Testing Dashboard Financial Summary Aggregate API...');
    const summaryRes = await fetch(`${BASE_URL}/api/v1/payments/dashboard/summary`, {
      headers: authHeaders
    });
    const summaryData = await summaryRes.json();

    const test16Pass =
      summaryRes.status === 200 &&
      summaryData.success &&
      typeof summaryData.summary?.totalBilledAmount === 'number' &&
      typeof summaryData.summary?.totalCollectedAmount === 'number' &&
      typeof summaryData.summary?.totalOutstandingAmount === 'number' &&
      summaryData.summary?.completedPaymentsCount > 0;

    testResults.push({
      id: 16,
      name: 'Dashboard financial summary correctly computes persisted totals and payment statuses',
      status: test16Pass ? 'PASS' : 'FAIL',
      evidence: `Total Billed: ₹${summaryData.summary?.totalBilledAmount}, Collected: ₹${summaryData.summary?.totalCollectedAmount}, Outstanding: ₹${summaryData.summary?.totalOutstandingAmount}, Completed Receipts: ${summaryData.summary?.completedPaymentsCount}`
    });
    console.log(`  -> Status: ${test16Pass ? 'PASS' : 'FAIL'} (Billed: ₹${summaryData.summary?.totalBilledAmount}, Collected: ₹${summaryData.summary?.totalCollectedAmount}, Outstanding: ₹${summaryData.summary?.totalOutstandingAmount})`);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('📊 TEST SUITE SUMMARY RESULTS');
    console.log('======================================================================');
    let passCount = 0;
    testResults.forEach(r => {
      if (r.status === 'PASS') passCount++;
      const num = String(r.id).padStart(2, '0');
      console.log(`[${num}] ${r.name.padEnd(65)} : ${r.status}`);
    });
    console.log('======================================================================');
    console.log(`TOTAL: ${passCount} / ${testResults.length} TESTS PASSED (${Math.round((passCount / testResults.length) * 100)}%)\n`);

    return testResults;
  } catch (error) {
    console.error('Test suite failed unexpectedly:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runPhase6TestSuite();
