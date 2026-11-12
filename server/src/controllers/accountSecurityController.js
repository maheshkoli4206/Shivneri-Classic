import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';
import PasswordReset from '../models/PasswordReset.js';
import { isEmailConfigured, sendPasswordResetOTP } from '../services/emailService.js';
import { getCookieOptions } from './authController.js';

// Pre-computed 10-round bcrypt hash for dummy constant-time comparison on unregistered emails
const DUMMY_OTP_HASH = '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1l5Qk06vPZ8mJp6d10t2d3Y7Y4V7i.';

/**
 * Validates strong password policy:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export const validateStrongPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      message: 'पासवर्ड आवश्यक आहे (Password is required)'
    };
  }
  if (password.length < 8) {
    return {
      valid: false,
      message: 'पासवर्ड किमान ८ अक्षरांचा असावा (Password must be at least 8 characters)'
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'पासवर्डमध्ये किमान एक मोठे अक्षर (A-Z) असणे आवश्यक आहे (Password must include at least one uppercase letter)'
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'पासवर्डमध्ये किमान एक लहान अक्षर (a-z) असणे आवश्यक आहे (Password must include at least one lowercase letter)'
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'पासवर्डमध्ये किमान एक अंक (0-9) असणे आवश्यक आहे (Password must include at least one number)'
    };
  }
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    return {
      valid: false,
      message: 'पासवर्डमध्ये किमान एक विशेष चिन्ह (!@#$%^&*...) असणे आवश्यक आहे (Password must include at least one special character)'
    };
  }
  return { valid: true, message: 'पासवर्ड वैध आहे (Password is valid)' };
};

/**
 * Helper to record security audit logs
 */
const recordAuditLog = async (req, adminId, action, details) => {
  try {
    await AuditLog.create({
      action,
      performedByAdminId: adminId,
      entityType: 'ADMIN',
      entityId: adminId,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (err) {
    console.error('Failed to write security audit log:', err.message);
  }
};

/**
 * GET /api/v1/auth/account-security
 * Get account security overview for Super Admin
 */
export const getAccountSecurity = async (req, res) => {
  try {
    const admin = req.admin;
    return res.status(200).json({
      success: true,
      username: admin.username,
      fullNameMarathi: admin.fullNameMarathi,
      fullNameEnglish: admin.fullNameEnglish,
      recoveryEmail: admin.recoveryEmail || '',
      contactNumber: admin.contactNumber || '',
      isEmailConfigured: isEmailConfigured(),
      tokenVersion: admin.tokenVersion || 0
    });
  } catch (error) {
    console.error('Get account security error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'खाते सुरक्षा माहिती मिळवताना त्रुटी आली (Failed to retrieve account security info)'
    });
  }
};

/**
 * POST /api/v1/auth/update-username
 * Super Admin change username with current password verification
 */
export const updateUsername = async (req, res) => {
  try {
    const { currentPassword, newUsername } = req.body;
    const admin = req.admin;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'चालू पासवर्ड प्रविष्ट करणे आवश्यक आहे (Current password is required)'
      });
    }

    if (!newUsername || typeof newUsername !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'नवीन वापरकर्तानाव आवश्यक आहे (New username is required)'
      });
    }

    const normalizedUsername = newUsername.trim().toLowerCase();

    // Username format: 3 to 30 characters, letters, numbers, underscores only
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: 'वापरकर्तानाव ३ ते ३० अक्षरांचे आणि फक्त इंग्रजी अक्षरे, अंक व अंडरस्कोर असलेले असावे (Username must be 3-30 characters with alphanumeric characters and underscores only)'
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'चालू पासवर्ड चुकीचा आहे (Incorrect current password)'
      });
    }

    if (normalizedUsername === admin.username) {
      return res.status(400).json({
        success: false,
        message: 'नवीन वापरकर्तानाव सध्याच्या नावापेक्षा वेगळे असावे (New username must be different from current username)'
      });
    }

    const oldUsername = admin.username;
    admin.username = normalizedUsername;
    await admin.save();

    // Re-sign JWT cookie so current user session continues seamlessly
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const token = jwt.sign(
        { adminId: admin._id, role: admin.role, tokenVersion: admin.tokenVersion || 0 },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );
      res.cookie('token', token, getCookieOptions());
    }

    await recordAuditLog(req, admin._id, 'ADMIN_USERNAME_CHANGED', {
      oldUsername,
      newUsername: normalizedUsername
    });

    return res.status(200).json({
      success: true,
      message: 'वापरकर्तानाव यशस्वीरीत्या बदलण्यात आले (Username updated successfully)',
      username: admin.username
    });
  } catch (error) {
    console.error('Update username error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'वापरकर्तानाव बदलताना त्रुटी आली (Failed to update username)'
    });
  }
};

/**
 * POST /api/v1/auth/update-password
 * Super Admin change password with current password verification & session revocation
 */
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const admin = req.admin;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'चालू पासवर्ड आवश्यक आहे (Current password is required)'
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'नवीन पासवर्ड आणि पासवर्ड पुष्टी आवश्यक आहे (New password and confirmation are required)'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'नवीन पासवर्ड आणि पुष्टी पासवर्ड जुळत नाहीत (New password and confirm password do not match)'
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'चालू पासवर्ड चुकीचा आहे (Incorrect current password)'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'नवीन पासवर्ड जुन्या पासवर्डपेक्षा वेगळा असावा (New password must be different from current password)'
      });
    }

    // Validate strong password rules
    const passwordCheck = validateStrongPassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.message
      });
    }

    // Hash with 12 rounds bcrypt
    admin.passwordHash = await bcrypt.hash(newPassword, 12);

    // Revoke all other active sessions across browsers/devices
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    // Issue a fresh JWT cookie for the current session with the updated tokenVersion
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const token = jwt.sign(
        { adminId: admin._id, role: admin.role, tokenVersion: admin.tokenVersion },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );
      res.cookie('token', token, getCookieOptions());
    }

    await recordAuditLog(req, admin._id, 'ADMIN_PASSWORD_CHANGED', {
      reason: 'User-initiated password change under Account Security',
      tokenVersion: admin.tokenVersion
    });

    return res.status(200).json({
      success: true,
      message: 'पासवर्ड यशस्वीरीत्या बदलण्यात आला. इतर सर्व सक्रिय सत्रे बंद करण्यात आली आहेत. (Password updated successfully. All other active sessions have been revoked.)'
    });
  } catch (error) {
    console.error('Update password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पासवर्ड बदलताना त्रुटी आली (Failed to update password)'
    });
  }
};

/**
 * POST /api/v1/auth/update-recovery-email
 * Super Admin set or change recovery email address
 */
export const updateRecoveryEmail = async (req, res) => {
  try {
    const { currentPassword, recoveryEmail } = req.body;
    const admin = req.admin;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'चालू पासवर्ड आवश्यक आहे (Current password is required)'
      });
    }

    if (!recoveryEmail || typeof recoveryEmail !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'वैध रिकव्हरी ईमेल आवश्यक आहे (Valid recovery email is required)'
      });
    }

    const normalizedEmail = recoveryEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा (Please provide a valid email address)'
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'चालू पासवर्ड चुकीचा आहे (Incorrect current password)'
      });
    }

    const previousEmail = admin.recoveryEmail || '';
    admin.recoveryEmail = normalizedEmail;
    await admin.save();

    await recordAuditLog(req, admin._id, 'ADMIN_RECOVERY_EMAIL_CHANGED', {
      previousEmail,
      updatedEmail: normalizedEmail
    });

    return res.status(200).json({
      success: true,
      message: 'रिकव्हरी ईमेल यशस्वीरीत्या जतन केला (Recovery email updated successfully)',
      recoveryEmail: admin.recoveryEmail
    });
  } catch (error) {
    console.error('Update recovery email error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'रिकव्हरी ईमेल अद्यतनित करताना त्रुटी आली (Failed to update recovery email)'
    });
  }
};

/**
 * POST /api/v1/auth/forgot-password/request-otp
 * Step 1-3: Request 6-digit OTP for password recovery
 */
export const requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'कृपया नोंदणीकृत ईमेल पत्ता प्रविष्ट करा (Please enter registered email address)'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा (Please enter a valid email address)'
      });
    }

    // Strictly check if SMTP email service is configured
    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: 'ईमेल सेवा (SMTP) कॉन्फिगर केलेली नाही. कृपया सर्व्हर ॲडमिनिस्ट्रेटरशी संपर्क साधा किंवा server/.env मध्ये SMTP क्रेडेन्शियल सेट करा. (Email delivery/SMTP is not configured. Please configure SMTP credentials in server/.env.)'
      });
    }

    // Retrieve sole Super Admin
    const admin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'प्रशासक खाते आढळले नाही (Admin account not found)'
      });
    }

    // Check if recovery email has been configured on the Admin profile
    if (!admin.recoveryEmail || admin.recoveryEmail.trim() === '') {
      return res.status(400).json({
        success: false,
        code: 'RECOVERY_EMAIL_NOT_SET',
        message: 'सुपर ॲडमिन खात्यासाठी कोणताही रिकव्हरी ईमेल नोंदणीकृत नाही. कृपया ॲडमिन सेटिंग्जमधून रिकव्हरी ईमेल सेट करा किंवा सर्व्हर ॲडमिनिस्ट्रेटरशी संपर्क साधा. (No recovery email has been configured for the Super Admin account. Please set a recovery email in Admin Settings or contact your system administrator.)'
      });
    }

    // Compare with registered recovery email
    if (admin.recoveryEmail.toLowerCase().trim() !== normalizedEmail) {
      // Timing-safe defense: run dummy bcrypt hash so response time is identical
      await bcrypt.hash('dummy_otp_code', 10);
      // Generic success to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: 'जर हा ईमेल नोंदणीकृत असेल तर त्यावर ६-अंकी OTP पाठवण्यात आला आहे. (If this email is registered, a 6-digit OTP has been sent.)'
      });
    }

    // Invalidate any existing unused OTPs for this email
    await PasswordReset.updateMany({ email: normalizedEmail, used: false }, { used: true });

    // Generate cryptographically secure 6-digit OTP (100000 to 999999)
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Hash OTP with bcrypt (10 rounds is cryptographically strong and fast for 5-min lifespan)
    const otpHash = await bcrypt.hash(otpCode, 10);

    // Save PasswordReset record
    await PasswordReset.create({
      email: normalizedEmail,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
      attempts: 0,
      maxAttempts: 5,
      verified: false,
      used: false,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // Send email via Nodemailer
    await sendPasswordResetOTP(normalizedEmail, otpCode, admin.fullNameEnglish);

    // Record audit log
    await recordAuditLog(req, admin._id, 'PASSWORD_RESET_OTP_REQUESTED', {
      email: normalizedEmail,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'आपल्या नोंदणीकृत ईमेलवर ६-अंकी पडताळणी OTP पाठवण्यात आला आहे (A 6-digit OTP has been sent to your registered email address)'
    });
  } catch (error) {
    console.error('Request OTP error:', error.message);
    if (error.code === 'SMTP_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: 'OTP पाठवताना त्रुटी आली. कृपया ईमेल सेवा तपासा. (Failed to send OTP. Please check email service configuration.)'
    });
  }
};

/**
 * POST /api/v1/auth/forgot-password/verify-otp
 * Step 4-5: Verify 6-digit OTP and issue single-use reset token
 */
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'ईमेल आणि ६-अंकी OTP दोन्ही आवश्यक आहेत (Both email and 6-digit OTP are required)'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP बरोबर ६ अंकांचा असावा (OTP must be exactly 6 digits)'
      });
    }

    // Find the latest active unverified reset record
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      used: false,
      verified: false
    }).sort({ createdAt: -1 });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'अवैध किंवा कालबाह्य झालेला OTP. कृपया नवीन OTP मागवा. (Invalid or expired OTP. Please request a new OTP.)'
      });
    }

    // Check expiry
    if (new Date() > resetRecord.expiresAt) {
      resetRecord.used = true;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: 'हा OTP कालबाह्य झाला आहे. कृपया नवीन OTP मागवा. (This OTP has expired. Please request a new OTP.)'
      });
    }

    // Check max attempts
    if (resetRecord.attempts >= resetRecord.maxAttempts) {
      resetRecord.used = true;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: 'जास्त चुकीच्या प्रयत्नांमुळे हा OTP रद्द करण्यात आला आहे. कृपया नवीन OTP मागवा. (Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP.)'
      });
    }

    // Verify OTP hash
    const isMatch = await bcrypt.compare(cleanOtp, resetRecord.otpHash);
    if (!isMatch) {
      resetRecord.attempts += 1;
      if (resetRecord.attempts >= resetRecord.maxAttempts) {
        resetRecord.used = true;
      }
      await resetRecord.save();

      const remaining = Math.max(0, resetRecord.maxAttempts - resetRecord.attempts);
      return res.status(400).json({
        success: false,
        remainingAttempts: remaining,
        message: remaining > 0
          ? `चुकीचा OTP. उर्वरित प्रयत्न: ${remaining} (Incorrect OTP. Remaining attempts: ${remaining})`
          : 'जास्त चुकीच्या प्रयत्नांमुळे हा OTP रद्द करण्यात आला आहे. कृपया नवीन OTP मागवा. (Too many incorrect attempts. OTP invalidated.)'
      });
    }

    // OTP verified successfully: issue a single-use cryptographically random reset token (32 bytes hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    resetRecord.verified = true;
    resetRecord.resetTokenHash = resetTokenHash;
    resetRecord.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to complete reset
    await resetRecord.save();

    const admin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (admin) {
      await recordAuditLog(req, admin._id, 'PASSWORD_RESET_OTP_VERIFIED', {
        email: normalizedEmail,
        ipAddress: req.ip
      });
    }

    return res.status(200).json({
      success: true,
      resetToken,
      message: 'OTP पडताळणी यशस्वी! कृपया नवीन पासवर्ड सेट करा. (OTP verified successfully! Please set your new password.)'
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'OTP पडताळताना त्रुटी आली (Failed to verify OTP)'
    });
  }
};

/**
 * POST /api/v1/auth/forgot-password/reset-password
 * Step 6-9: Set new password using single-use reset token and revoke active sessions
 */
export const resetPasswordWithToken = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({
        success: false,
        message: 'ईमेल आणि रीसेट टोकन आवश्यक आहेत (Email and reset token are required)'
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'नवीन पासवर्ड आणि पुष्टी पासवर्ड आवश्यक आहे (New password and confirmation are required)'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'नवीन पासवर्ड आणि पुष्टी पासवर्ड जुळत नाहीत (New password and confirm password do not match)'
      });
    }

    // Validate strong password policy
    const passwordCheck = validateStrongPassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.message
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(String(resetToken).trim()).digest('hex');

    // Find verified, unused reset record with matching resetTokenHash
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      resetTokenHash: tokenHash,
      verified: true,
      used: false
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'अवैध किंवा वापरलेला रीसेट टोकन. कृपया पुन्हा प्रक्रिया सुरू करा. (Invalid or already used reset token. Please restart password recovery.)'
      });
    }

    // Check reset token expiry
    if (new Date() > resetRecord.resetTokenExpiresAt) {
      resetRecord.used = true;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: 'रीसेट टोकन कालबाह्य झाले आहे. कृपया पुन्हा प्रक्रिया सुरू करा. (Reset token has expired. Please restart password recovery.)'
      });
    }

    // Mark reset record as used immediately to prevent reuse
    resetRecord.used = true;
    await resetRecord.save();

    // Invalidate all other reset records for this email
    await PasswordReset.updateMany({ email: normalizedEmail }, { used: true });

    // Retrieve Super Admin
    const admin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'प्रशासक खाते आढळले नाही (Super Admin account not found)'
      });
    }

    // Update password hash with 12 rounds bcrypt
    admin.passwordHash = await bcrypt.hash(newPassword, 12);

    // Atomically increment tokenVersion to revoke all existing sessions everywhere
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    // Clear any existing session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/'
    });

    await recordAuditLog(req, admin._id, 'PASSWORD_RESET_COMPLETED', {
      email: normalizedEmail,
      revokedTokenVersion: admin.tokenVersion
    });

    return res.status(200).json({
      success: true,
      message: 'पासवर्ड यशस्वीरीत्या बदलण्यात आला आहे! कृपया नवीन पासवर्डने लॉगिन करा. (Password has been reset successfully! Please login with your new password.)'
    });
  } catch (error) {
    console.error('Reset password with token error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'पासवर्ड रीसेट करताना त्रुटी आली (Failed to reset password)'
    });
  }
};

