import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import Admin from '../models/Admin.js';

// Pre-computed valid 12-round bcrypt hash for constant-time comparisons on non-existent usernames
const DUMMY_BCRYPT_HASH = '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/**
 * Helper to compute cookie options based on environment
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax', // 'lax' permits localhost cross-port in development
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/'
  };
};

/**
 * POST /api/v1/auth/login
 * Admin Login Endpoint with Timing Attack Protection & Generic Failure Messages
 */
export const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'कृपया वैध वापरकर्तानाव आणि पासवर्ड प्रविष्ट करा (Please provide valid username and password)',
        errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
      });
    }

    const { username, password } = req.body;
    const normalizedUsername = username.toLowerCase().trim();

    // Find sole Super Admin by username
    const admin = await Admin.findOne({ username: normalizedUsername });

    // Timing-safe defense: run dummy bcrypt comparison when username does not exist
    if (!admin) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return res.status(401).json({
        success: false,
        message: 'अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)'
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'अवैध वापरकर्तानाव किंवा पासवर्ड (Invalid username or password)'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('FATAL: JWT_SECRET environment variable is missing');
      return res.status(500).json({
        success: false,
        message: 'अंतर्गत सर्व्हर त्रुटी (Internal server error: Missing JWT secret)'
      });
    }

    // Generate signed JWT
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, tokenVersion: admin.tokenVersion || 0 },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Set HttpOnly, Secure, SameSite cookie
    res.cookie('token', token, getCookieOptions());

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    // Return profile in JSON body (JWT is strictly in HttpOnly cookie, NOT in JSON)
    return res.status(200).json({
      success: true,
      message: 'यशस्वी लॉगिन (Login successful)',
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'लॉगिन करताना त्रुटी आली (An error occurred during login)'
    });
  }
};

/**
 * POST /api/v1/auth/logout
 * Admin Logout Endpoint
 */
export const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'यशस्वीरीत्या लॉगआउट झाले (Logged out successfully)'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'लॉगआउट करताना त्रुटी आली (An error occurred during logout)'
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Retrieve current authenticated Admin profile
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: req.admin.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'माहिती मिळवताना त्रुटी आली (Failed to retrieve profile)'
    });
  }
};
