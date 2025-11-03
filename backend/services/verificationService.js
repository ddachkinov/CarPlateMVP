const VerificationCode = require('../models/VerificationCode');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@carplate.app';

/**
 * Generate a 6-digit verification code
 */
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification code via email
 * @param {string} email - Recipient email
 * @param {string} code - Verification code
 * @param {string} type - Type of verification (email, plate_claim)
 */
const sendVerificationEmail = async (email, code, type = 'email') => {
  if (!resend) {
    console.warn('⚠️  RESEND_API_KEY not configured. Verification email not sent.');
    console.log(`📧 MOCK: Would send verification code ${code} to ${email}`);
    return { success: true, mock: true };
  }

  const subject = type === 'plate_claim'
    ? 'Verify your email to claim your plate'
    : 'Verify your CarPlate email address';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🚗 CarPlate</h1>
      </div>

      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

        <p style="font-size: 16px; color: #666;">
          ${type === 'plate_claim' ? 'To claim your license plate, please verify your email address with the code below:' : 'Please verify your email address with the code below:'}
        </p>

        <div style="background: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
        </div>

        <p style="font-size: 14px; color: #999; margin-top: 30px;">
          This code will expire in <strong>15 minutes</strong>.
        </p>

        <p style="font-size: 14px; color: #999;">
          If you didn't request this verification, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          CarPlate - Anonymous messaging for vehicle owners<br>
          This is an automated email, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html
    });

    console.log(`✅ Verification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Create a new verification code
 * @param {string} email - User email
 * @param {string} userId - User ID
 * @param {string} type - Type of verification
 */
const createVerificationCode = async (email, userId, type = 'email') => {
  // Delete any existing unverified codes for this email
  await VerificationCode.deleteMany({ email, verified: false });

  const code = generateCode();

  // Create new verification code
  const verificationCode = new VerificationCode({
    email,
    code,
    userId,
    type,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  });

  await verificationCode.save();

  // Send verification email
  await sendVerificationEmail(email, code, type);

  return { code }; // Only for testing/mock mode
};

/**
 * Verify a code
 * @param {string} email - User email
 * @param {string} code - Verification code
 */
const verifyCode = async (email, code) => {
  const verificationCode = await VerificationCode.findOne({
    email,
    code,
    verified: false,
    expiresAt: { $gt: new Date() }
  });

  if (!verificationCode) {
    return { valid: false, error: 'Invalid or expired verification code' };
  }

  // Mark as verified
  verificationCode.verified = true;
  await verificationCode.save();

  return { valid: true, userId: verificationCode.userId, type: verificationCode.type };
};

/**
 * Check if email is verified for a user
 * @param {string} email - User email
 * @param {string} userId - User ID
 */
const isEmailVerified = async (email, userId) => {
  const verifiedCode = await VerificationCode.findOne({
    email,
    userId,
    verified: true
  });

  return !!verifiedCode;
};

module.exports = {
  createVerificationCode,
  verifyCode,
  isEmailVerified,
  sendVerificationEmail
};
