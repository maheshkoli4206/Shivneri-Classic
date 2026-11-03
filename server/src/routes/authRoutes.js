import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe } from '../controllers/authController.js';
import { requireAdminAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Strict Rate Limiter for Login: 5 attempts per 15 minutes to defeat brute force
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त अयशस्वी लॉगिन प्रयत्न. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many login attempts. Please try again after 15 minutes.)'
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

export default router;

