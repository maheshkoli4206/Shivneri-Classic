import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe } from '../controllers/authController.js';
import {
  getTransferStatus,
  initiateTransfer,
  confirmTransfer,
  cancelTransfer
} from '../controllers/chairmanTransferController.js';
import {
  getAccountSecurity,
  updateUsername,
  updatePassword,
  updateRecoveryEmail,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPasswordWithToken
} from '../controllers/accountSecurityController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Strict Rate Limiter for Login: 20 attempts per 15 minutes to defeat brute force
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त अयशस्वी लॉगिन प्रयत्न. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many login attempts. Please try again after 15 minutes.)'
  }
});

// Strict Rate Limiter for OTP Requests: 5 requests per 15 minutes per IP
const requestOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त OTP विनंत्या पाठवल्या आहेत. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many OTP requests. Please try again after 15 minutes.)'
  }
});

// Strict Rate Limiter for OTP Verification: 10 attempts per 15 minutes per IP
const verifyOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त OTP पडताळणी प्रयत्न. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many OTP verification attempts. Please try again after 15 minutes.)'
  }
});

// Strict Rate Limiter for Password Reset: 5 attempts per 15 minutes per IP
const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त पासवर्ड रीसेट प्रयत्न. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many password reset attempts. Please try again after 15 minutes.)'
  }
});

// Strict Rate Limiter for Account Security Operations: 15 per 15 minutes
const accountSecurityRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त खाते सुरक्षा विनंत्या. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many account security requests. Please try again later.)'
  }
});

// Validation rules for login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('वापरकर्तानाव आवश्यक आहे (Username is required)'),
  body('password')
    .notEmpty()
    .withMessage('पासवर्ड आवश्यक आहे (Password is required)')
];

// POST /api/v1/auth/login
router.post('/login', loginRateLimiter, loginValidation, login);

// POST /api/v1/auth/logout
router.post('/logout', logout);

// GET /api/v1/auth/me (Protected by JWT HttpOnly cookie)
router.get('/me', requireAdminAuth, getMe);

// ============================================================================
// FORGOT PASSWORD / EMAIL OTP VERIFICATION ROUTES (Public with Strict Limiting)
// ============================================================================

// POST /api/v1/auth/forgot-password/request-otp
router.post('/forgot-password/request-otp', requestOtpRateLimiter, requestPasswordResetOTP);

// POST /api/v1/auth/forgot-password/verify-otp
router.post('/forgot-password/verify-otp', verifyOtpRateLimiter, verifyPasswordResetOTP);

// POST /api/v1/auth/forgot-password/reset-password
router.post('/forgot-password/reset-password', resetPasswordRateLimiter, resetPasswordWithToken);

// ============================================================================
// ACCOUNT SECURITY MANAGEMENT ROUTES (Strictly Protected by requireAdminAuth)
// ============================================================================

// GET /api/v1/auth/account-security
router.get('/account-security', requireAdminAuth, getAccountSecurity);

// POST /api/v1/auth/update-username
router.post('/update-username', requireAdminAuth, accountSecurityRateLimiter, updateUsername);

// POST /api/v1/auth/update-password
router.post('/update-password', requireAdminAuth, accountSecurityRateLimiter, updatePassword);

// POST /api/v1/auth/update-recovery-email
router.post('/update-recovery-email', requireAdminAuth, accountSecurityRateLimiter, updateRecoveryEmail);

// ============================================================================
// CHAIRMAN OWNERSHIP TRANSFER ROUTES (Strictly Protected by requireAdminAuth)
// ============================================================================

// GET /api/v1/auth/chairman-transfer/status
router.get('/chairman-transfer/status', requireAdminAuth, getTransferStatus);

// POST /api/v1/auth/chairman-transfer/initiate
router.post('/chairman-transfer/initiate', requireAdminAuth, initiateTransfer);

// POST /api/v1/auth/chairman-transfer/confirm
router.post('/chairman-transfer/confirm', requireAdminAuth, confirmTransfer);

// POST /api/v1/auth/chairman-transfer/cancel
router.post('/chairman-transfer/cancel', requireAdminAuth, cancelTransfer);

export default router;

