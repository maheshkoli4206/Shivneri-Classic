import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import ChairmanTransferLog from '../models/ChairmanTransferLog.js';
import AuditLog from '../models/AuditLog.js';
import { getCookieOptions } from './authController.js';

/**
 * ==============================================================================
 * SHIVNERI CLASSIC APARTMENT – CHAIRMAN OWNERSHIP TRANSFER CONTROLLER
 * ==============================================================================
 * Handles the secure, audited, atomic handover of the sole Super Admin role.
 * Enforces the physical singleton guarantee at all times.
 * ==============================================================================
 */

/**
 * GET /api/v1/auth/chairman-transfer/status
 * Returns current Super Admin identity, active pending transfer, and transfer history.
 */
export const getTransferStatus = async (req, res) => {
  try {
    const admin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'प्रशासक खाते आढळले नाही (Super Admin record not found)'
      });
    }

    // Active pending transfer (if any)
    const pendingTransfer = await ChairmanTransferLog.findOne({
      status: 'PENDING_CONFIRMATION',
      confirmationExpiresAt: { $gt: new Date() }
    }).select('-newPasswordHash -confirmationCodeHash');

    // Transfer history (completed or cancelled)
    const history = await ChairmanTransferLog.find({
      status: { $in: ['COMPLETED', 'CANCELLED', 'FAILED'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-newPasswordHash -confirmationCodeHash');

    return res.status(200).json({
      success: true,
      currentChairman: {
        _id: admin._id,
        fullNameMarathi: admin.fullNameMarathi,
        fullNameEnglish: admin.fullNameEnglish,
        username: admin.username,
        designation: admin.designation,
        contactNumber: admin.contactNumber || '',
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
        tokenVersion: admin.tokenVersion || 0
      },
      tenureHistory: admin.tenureHistory || [],
      pendingTransfer: pendingTransfer || null,
      history: history || [],
      singletonEnforced: true
    });
  } catch (error) {
    console.error('getTransferStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'हस्तांतरण स्थिती मिळवताना त्रुटी आली (Failed to retrieve transfer status)'
    });
  }
};

/**
 * POST /api/v1/auth/chairman-transfer/initiate
 * Step 1: Initiates a Chairman ownership transfer.
 * Collects candidate details, verifies current Super Admin password, and generates a confirmation token.
 */
export const initiateTransfer = async (req, res) => {
  try {
    const {
      currentPassword,
      newFullNameMarathi,
      newFullNameEnglish,
      newUsername,
      newDesignation,
      newContactNumber,
      newInitialPassword,
      authorizedReason,
      resolutionNumber
    } = req.body;

    // 1. Mandatory input checks
    if (
      !currentPassword ||
      !newFullNameMarathi ||
      !newFullNameEnglish ||
      !newUsername ||
      !newContactNumber ||
      !newInitialPassword ||
      !authorizedReason ||
      !resolutionNumber
    ) {
      return res.status(400).json({
        success: false,
        message: 'कृपया सर्व आवश्यक तपशील भरा (Please fill all required transfer details)'
      });
    }

    // 2. Validate current password
    const admin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'प्रशासक खाते आढळले नाही (Super Admin record not found)'
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'सध्याचा पासवर्ड चुकीचा आहे. हस्तांतरण सुरू करता आले नाही. (Incorrect current password. Operation rejected.)'
      });
    }

    // 3. Username format & uniqueness check
    const normalizedNewUsername = newUsername.trim().toLowerCase();
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(normalizedNewUsername)) {
      return res.status(400).json({
        success: false,
        message: 'नवीन वापरकर्तानाव किमान ३ ते २० अक्षरे (फक्त इंग्रजी अक्षरे, अंक आणि _) असावे. (Username must be 3-20 alphanumeric characters or underscore)'
      });
    }

    if (normalizedNewUsername === admin.username.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'नवीन वापरकर्तानाव सध्याच्या वापरकर्तानावापेक्षा वेगळे असणे आवश्यक आहे. (New Chairman username must be different from current username)'
      });
    }

    // 4. Contact number validation (10 digits)
    const cleanContact = newContactNumber.replace(/\D/g, '');
    if (cleanContact.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'वैध १० अंकी संपर्क क्रमांक प्रविष्ट करा (Please provide a valid 10-digit contact number)'
      });
    }

    // 5. Initial password strength check
    if (newInitialPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'नवीन प्रारंभिक पासवर्ड किमान ८ अक्षरांचा असावा (New password must be at least 8 characters long)'
      });
    }

    // 6. Invalidate any existing pending transfer
    await ChairmanTransferLog.updateMany(
      { status: 'PENDING_CONFIRMATION' },
      { $set: { status: 'CANCELLED', failureReason: 'Superseded by new transfer initiation' } }
    );

    // 7. Generate secure 6-digit confirmation code
    const confirmationCode = crypto.randomInt(100000, 999999).toString();
    const confirmationCodeHash = await bcrypt.hash(confirmationCode, 10);
    const newPasswordHash = await bcrypt.hash(newInitialPassword, 12);
    const transferId = `SCA-TXFR-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute validity window

    // 8. Create pending transfer log
    const transferLog = await ChairmanTransferLog.create({
      transferId,
      status: 'PENDING_CONFIRMATION',
      oldChairman: {
        adminId: admin._id,
        fullNameMarathi: admin.fullNameMarathi,
        fullNameEnglish: admin.fullNameEnglish,
        username: admin.username,
        designation: admin.designation,
        contactNumber: admin.contactNumber || ''
      },
      newChairman: {
        fullNameMarathi: newFullNameMarathi.trim(),
        fullNameEnglish: newFullNameEnglish.trim(),
        username: normalizedNewUsername,
        designation: (newDesignation || 'Chairman / Building Secretary').trim(),
        contactNumber: cleanContact
      },
      newPasswordHash,
      authorizedReason: authorizedReason.trim(),
      resolutionNumber: resolutionNumber.trim(),
      confirmationCodeHash,
      confirmationExpiresAt: expiresAt,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // 9. Record initiation in immutable audit log
    await AuditLog.create({
      action: 'CHAIRMAN_TRANSFER_INITIATED',
      performedByAdminId: admin._id,
      entityType: 'ADMIN',
      entityId: admin._id,
      details: {
        transferId,
        newChairmanUsername: normalizedNewUsername,
        newChairmanFullName: newFullNameEnglish.trim(),
        resolutionNumber: resolutionNumber.trim(),
        expiresAt
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    return res.status(200).json({
      success: true,
      message: 'हस्तांतरण प्रक्रिया सुरू झाली आहे. कृपया पडताळणी कोड प्रविष्ट करून पुष्टी करा. (Transfer initiated. Please enter the verification code to finalize.)',
      transferId,
      confirmationCode, // Displayed to the authenticated Super Admin for explicit review
      confirmationExpiresAt: expiresAt,
      candidate: {
        fullNameMarathi: newFullNameMarathi.trim(),
        fullNameEnglish: newFullNameEnglish.trim(),
        username: normalizedNewUsername,
        designation: newDesignation || 'Chairman / Building Secretary',
        contactNumber: cleanContact,
        resolutionNumber: resolutionNumber.trim()
      }
    });
  } catch (error) {
    console.error('initiateTransfer error:', error);
    return res.status(500).json({
      success: false,
      message: 'हस्तांतरण प्रक्रिया सुरू करताना त्रुटी आली (Failed to initiate Chairman transfer)'
    });
  }
};

/**
 * POST /api/v1/auth/chairman-transfer/confirm
 * Step 2: Confirms and executes the atomic ownership handover in a multi-document MongoDB transaction.
 * Invalidates all previous sessions and terminates the caller's login cookie.
 */
export const confirmTransfer = async (req, res) => {
  try {
    const { transferId, confirmationCode, confirmationPhrase, currentPassword } = req.body;

    if (!transferId || !confirmationCode || !confirmationPhrase || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'कृपया पडताळणी कोड, पुष्टीकरण वाक्यांश आणि पासवर्ड प्रविष्ट करा (Please provide verification code, confirmation phrase, and password)'
      });
    }

    // 1. Double-verify current Super Admin credentials
    const currentAdmin = await Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
    if (!currentAdmin) {
      return res.status(404).json({
        success: false,
        message: 'प्रशासक खाते आढळले नाही (Super Admin record not found)'
      });
    }

    const isMatch = await currentAdmin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'पासवर्ड पडताळणी अयशस्वी. हस्तांतरण नाकारले गेले. (Password verification failed. Transfer rejected.)'
      });
    }

    // 2. Fetch pending transfer log
    const transferLog = await ChairmanTransferLog.findOne({
      transferId,
      status: 'PENDING_CONFIRMATION'
    });

    if (!transferLog) {
      return res.status(404).json({
        success: false,
        message: 'सक्रिय हस्तांतरण विनंती आढळली नाही किंवा ती आधीच पूर्ण/रद्द झाली आहे. (Active transfer request not found or expired.)'
      });
    }

    if (new Date() > transferLog.confirmationExpiresAt) {
      transferLog.status = 'FAILED';
      transferLog.failureReason = 'Confirmation code expired';
      await transferLog.save();

      return res.status(400).json({
        success: false,
        message: 'पडताळणी कोडची मुदत संपली आहे. कृपया पुन्हा सुरू करा. (Verification window expired. Please initiate again.)'
      });
    }

    // 3. Verify confirmation code hash
    const isCodeValid = await bcrypt.compare(confirmationCode.trim(), transferLog.confirmationCodeHash);
    if (!isCodeValid) {
      return res.status(400).json({
        success: false,
        message: 'चुकीचा पडताळणी कोड (Invalid confirmation code)'
      });
    }

    // 4. Verify explicit confirmation phrase
    const validPhrases = [
      'CONFIRM OWNERSHIP TRANSFER',
      'हस्तांतरण निश्चित करा',
      `TRANSFER TO ${transferLog.newChairman.username.toUpperCase()}`
    ];
    const phraseMatches = validPhrases.some(
      p => p.toLowerCase() === confirmationPhrase.trim().toLowerCase()
    );

    if (!phraseMatches) {
      return res.status(400).json({
        success: false,
        message: `अवैध पुष्टीकरण वाक्यांश. कृपया "CONFIRM OWNERSHIP TRANSFER" किंवा "हस्तांतरण निश्चित करा" टाईप करा. (Invalid confirmation phrase)`
      });
    }

    // 5. ATOMIC OWNERSHIP HANDOVER
    // Uses multi-document transaction on replica sets / mongos, or atomic document-level update on standalone MongoDB
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const query = Admin.findOne({ singletonKey: 'SHIVNERI_SUPER_ADMIN_SINGLETON' });
      const adminToUpdate = session ? await query.session(session) : await query;

      if (!adminToUpdate) {
        throw new Error('Sole Super Admin document missing during handover');
      }

      // Archive previous tenure to immutable array
      const tenureEntry = {
        fullNameMarathi: adminToUpdate.fullNameMarathi,
        fullNameEnglish: adminToUpdate.fullNameEnglish,
        username: adminToUpdate.username,
        designation: adminToUpdate.designation,
        contactNumber: adminToUpdate.contactNumber || '',
        tenureStartDate: adminToUpdate.updatedAt || adminToUpdate.createdAt,
        tenureEndDate: new Date(),
        handoverReason: transferLog.authorizedReason,
        resolutionNumber: transferLog.resolutionNumber,
        transferredAt: new Date()
      };

      if (!adminToUpdate.tenureHistory) {
        adminToUpdate.tenureHistory = [];
      }
      adminToUpdate.tenureHistory.push(tenureEntry);

      // Atomically assign New Chairman details to the singleton record
      adminToUpdate.fullNameMarathi = transferLog.newChairman.fullNameMarathi;
      adminToUpdate.fullNameEnglish = transferLog.newChairman.fullNameEnglish;
      adminToUpdate.username = transferLog.newChairman.username;
      adminToUpdate.designation = transferLog.newChairman.designation;
      adminToUpdate.contactNumber = transferLog.newChairman.contactNumber;
      adminToUpdate.passwordHash = transferLog.newPasswordHash;
      adminToUpdate.tokenVersion = (adminToUpdate.tokenVersion || 0) + 1; // Instantly invalidates previous JWTs
      adminToUpdate.lastLogin = null;

      if (session) {
        await adminToUpdate.save({ session });
      } else {
        await adminToUpdate.save();
      }

      // Mark transfer log completed
      transferLog.status = 'COMPLETED';
      transferLog.completedAt = new Date();
      if (session) {
        await transferLog.save({ session });
      } else {
        await transferLog.save();
      }

      // Create immutable AuditLog record
      const auditPayload = [
        {
          action: 'CHAIRMAN_TRANSFER_COMPLETED',
          performedByAdminId: adminToUpdate._id,
          entityType: 'ADMIN',
          entityId: adminToUpdate._id,
          details: {
            transferId: transferLog.transferId,
            previousChairman: tenureEntry,
            newChairman: transferLog.newChairman,
            resolutionNumber: transferLog.resolutionNumber,
            authorizedReason: transferLog.authorizedReason,
            completedAt: new Date()
          },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || ''
        }
      ];

      if (session) {
        await AuditLog.create(auditPayload, { session });
        await session.commitTransaction();
      } else {
        await AuditLog.create(auditPayload);
      }
    } catch (txError) {
      if (session) {
        await session.abortTransaction();
      }
      console.error('Atomic Chairman transfer operation aborted:', txError);

      transferLog.status = 'FAILED';
      transferLog.failureReason = txError.message;
      await transferLog.save().catch(() => {});

      throw txError;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // 6. Revoke caller's session cookie immediately
    res.clearCookie('token', getCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'चेअरमन पदाचे हस्तांतरण यशस्वीपणे पूर्ण झाले आहे. सर्व जुनी सत्रे रद्द करण्यात आली आहेत. कृपया नवीन क्रेडेंशियल्ससह पुन्हा लॉगिन करा. (Chairman ownership transferred successfully. All previous sessions revoked. Please log in with the new credentials.)',
      newChairmanUsername: transferLog.newChairman.username
    });
  } catch (error) {
    console.error('confirmTransfer error:', error);
    return res.status(500).json({
      success: false,
      message: 'हस्तांतरण पूर्ण करताना त्रुटी आली. कोणतेही बदल करण्यात आलेले नाहीत. (Transaction aborted. System restored safely.)'
    });
  }
};

/**
 * POST /api/v1/auth/chairman-transfer/cancel
 * Safely cancels a pending Chairman transfer.
 */
export const cancelTransfer = async (req, res) => {
  try {
    const { transferId, cancellationReason } = req.body;

    const transferLog = await ChairmanTransferLog.findOne({
      transferId,
      status: 'PENDING_CONFIRMATION'
    });

    if (!transferLog) {
      return res.status(404).json({
        success: false,
        message: 'रद्द करण्यासाठी कोणतीही प्रलंबित विनंती आढळली नाही (No pending transfer request found to cancel)'
      });
    }

    transferLog.status = 'CANCELLED';
    transferLog.failureReason = cancellationReason || 'Cancelled by Super Admin';
    await transferLog.save();

    await AuditLog.create({
      action: 'CHAIRMAN_TRANSFER_CANCELLED',
      performedByAdminId: req.admin._id,
      entityType: 'ADMIN',
      entityId: req.admin._id,
      details: {
        transferId,
        cancellationReason: cancellationReason || 'Cancelled by Super Admin'
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    return res.status(200).json({
      success: true,
      message: 'हस्तांतरण विनंती सुरक्षितपणे रद्द करण्यात आली आहे (Transfer request safely cancelled)'
    });
  } catch (error) {
    console.error('cancelTransfer error:', error);
    return res.status(500).json({
      success: false,
      message: 'हस्तांतरण रद्द करताना त्रुटी आली (Failed to cancel transfer request)'
    });
  }
};
