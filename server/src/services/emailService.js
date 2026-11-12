import nodemailer from 'nodemailer';

/**
 * Checks whether SMTP email configuration is present in environment variables.
 * @returns {boolean}
 */
export const isEmailConfigured = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(
    SMTP_HOST &&
    SMTP_PORT &&
    SMTP_USER &&
    SMTP_PASS &&
    String(SMTP_HOST).trim() !== '' &&
    String(SMTP_USER).trim() !== '' &&
    String(SMTP_PASS).trim() !== ''
  );
};

/**
 * Sends a 6-digit OTP verification email for Admin password recovery.
 *
 * @param {string} toEmail - Recipient Admin recovery email address
 * @param {string} otpCode - 6-digit cryptographically generated OTP
 * @param {string} [adminName='Shri Laxman Koli'] - Name of the Super Admin
 * @returns {Promise<Object>} Nodemailer send result
 */
export const sendPasswordResetOTP = async (toEmail, otpCode, adminName = 'Shri Laxman Koli') => {
  if (!isEmailConfigured()) {
    const error = new Error(
      'ईमेल सेवा (SMTP) कॉन्फिगर केलेली नाही. कृपया server/.env फाईलमध्ये SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS जोडा. (Email service/SMTP is not configured. Please configure SMTP credentials in server/.env.)'
    );
    // @ts-ignore
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const isSecure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Shivneri Classic Apartment" <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  const subject = '[शिवनेरी क्लासिक] मुख्य प्रशासक पासवर्ड रीसेट OTP / Super Admin Password Reset OTP';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #ea580c; }
    .header h1 { color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #f97316; font-size: 12px; margin: 4px 0 0; font-weight: 600; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .desc { font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
    .otp-box { background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #9a3412; letter-spacing: 1px; margin-bottom: 6px; }
    .otp-code { font-family: monospace; font-size: 32px; font-weight: 800; color: #c2410c; letter-spacing: 8px; margin: 0; }
    .otp-expiry { font-size: 12px; color: #b45309; margin-top: 8px; font-weight: 600; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #991b1b; line-height: 1.5; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>शिवनेरी क्लासिक अपार्टमेंट – ए विंग</h1>
      <p>SHIVNERI CLASSIC APARTMENT • PANCHAVATI, NASHIK</p>
    </div>
    <div class="content">
      <div class="greeting">नमस्कार / Hello ${adminName},</div>
      <p class="desc">
        आपल्या शिवनेरी क्लासिक अपार्टमेंट सोसायटी व्यवस्थापन प्रणालीसाठी पासवर्ड रीसेट विनंती प्राप्त झाली आहे.
        <br>
        A password reset request was received for your Super Admin account.
      </p>

      <div class="otp-box">
        <div class="otp-label">एकवेळचा पडताळणी कोड (One-Time Password)</div>
        <div class="otp-code">${otpCode}</div>
        <div class="otp-expiry">⏳ हा कोड पुढील ५ मिनिटांसाठी वैध आहे (Valid for 5 minutes)</div>
      </div>

      <div class="warning">
        <strong>सुरक्षा इशारा / Security Warning:</strong><br>
        हा OTP कोणाशीही शेअर करू नका. शिवनेरी क्लासिक ॲडमिन टीम कधीही आपला OTP विचारत नाही. जर आपण ही विनंती केली नसेल, तर तात्काळ दुर्लक्ष करा.
        <br>
        Never share this OTP. The admin team will never ask for your code. If you did not make this request, please ignore this email.
      </div>
    </div>
    <div class="footer">
      कपालेश्वर नगर, औरंगाबाद रोड, पंचवटी, नाशिक • अधिकृत संगणकीय प्रणाली
      <br>
      Automated System Message • Do not reply to this email
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
शिवनेरी क्लासिक अपार्टमेंट – ए विंग (Panchavati, Nashik)
मुख्य प्रशासक पासवर्ड रीसेट पडताळणी कोड (Super Admin Password Reset OTP)

नमस्कार / Hello ${adminName},

आपला ६-अंकी पडताळणी कोड (OTP) खालीलप्रमाणे आहे:
OTP CODE: ${otpCode}

हा कोड पुढील ५ मिनिटांसाठी वैध आहे (Valid for 5 minutes).

सुरक्षा इशारा: हा OTP कोणाशीही शेअर करू नका.
Security Notice: Never share this OTP with anyone. If you did not initiate this request, please ignore this email.
  `;

  return await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text: textContent,
    html: htmlContent
  });
};

