import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Authentication Middleware for Admin Protection
 * Strictly extracts JWT from the HttpOnly cookie.
 */
export const requireAdminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'प्रवेश नाकारला: कृपया लॉगिन करा (Access denied: No authentication cookie found)'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('FATAL: JWT_SECRET environment variable is missing');
      return res.status(500).json({
        success: false,
        message: 'अंतर्गत सर्व्हर त्रुटी (Internal server error: Missing JWT configuration)'
      });
    }

    // Verify JWT signature & expiration
    const decoded = jwt.verify(token, secret);

    // Verify admin exists and holds the SUPER_ADMIN role
    const admin = await Admin.findById(decoded.adminId);

    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return res.status(401).json({
        success: false,
        message: 'प्रवेश नाकारला: अवैध सत्र किंवा प्रशासक आढळले नाही (Access denied: Invalid session or unauthorized)'
      });
    }

    // Attach admin document to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'सत्र संपले आहे: कृपया पुन्हा लॉगिन करा (Session expired: Please login again)'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'अवैध सुरक्षा टोकन (Invalid security token)'
    });
  }
};

export default requireAdminAuth;
