const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { createVerificationCode, verifyCode, isEmailVerified } = require('../services/verificationService');
const { validateEmail } = require('../middleware/validation');

/**
 * POST /api/verification/send-code
 * Send verification code to email
 */
router.post('/send-code', asyncHandler(async (req, res) => {
  const { email, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ error: 'Email and userId are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if email is already verified
  if (user.emailVerified && user.email === email.toLowerCase()) {
    return res.status(400).json({ error: 'Email is already verified' });
  }

  // Create and send verification code
  try {
    await createVerificationCode(email.toLowerCase(), userId, 'email');

    res.json({
      message: 'Verification code sent to your email',
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
}));

/**
 * POST /api/verification/verify-code
 * Verify email with code
 */
router.post('/verify-code', asyncHandler(async (req, res) => {
  const { email, code, userId } = req.body;

  if (!email || !code || !userId) {
    return res.status(400).json({ error: 'Email, code, and userId are required' });
  }

  // Verify the code
  const result = await verifyCode(email.toLowerCase(), code);

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  // Ensure the code belongs to the requesting user
  if (result.userId !== userId) {
    return res.status(403).json({ error: 'Code does not belong to this user' });
  }

  // Update user's email verification status
  await User.updateOne(
    { userId },
    {
      email: email.toLowerCase(),
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  );

  console.log(`✅ Email verified for user ${userId}: ${email}`);

  res.json({
    message: 'Email verified successfully',
    emailVerified: true
  });
}));

/**
 * GET /api/verification/status/:userId
 * Get verification status for a user
 */
router.get('/status/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({ userId });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    emailVerified: user.emailVerified,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    // 🚧 FUTURE: Add SMS and KYC verification status
    // phoneVerified: user.phoneVerified,
    // kycStatus: user.kycStatus
  });
}));

/**
 * POST /api/verification/resend-code
 * Resend verification code
 */
router.post('/resend-code', asyncHandler(async (req, res) => {
  const { email, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ error: 'Email and userId are required' });
  }

  // Check if user exists
  const user = await User.findOne({ userId });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if email is already verified
  if (user.emailVerified && user.email === email.toLowerCase()) {
    return res.status(400).json({ error: 'Email is already verified' });
  }

  // Create and send new verification code
  try {
    await createVerificationCode(email.toLowerCase(), userId, 'email');

    res.json({
      message: 'Verification code resent to your email',
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
}));

module.exports = router;
