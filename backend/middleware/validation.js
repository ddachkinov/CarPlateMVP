/**
 * Input validation middleware for CarPlate API
 * Prevents XSS, SQL injection, and invalid data
 */

/**
 * Sanitize string input - remove potentially dangerous characters
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';

  // Remove HTML tags and script content
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * Validate and sanitize plate number
 * - Must be 2-10 characters
 * - Only alphanumeric characters and hyphens
 * - Normalized to uppercase, spaces removed
 */
const validatePlate = (plate) => {
  if (!plate || typeof plate !== 'string') {
    return { valid: false, error: 'Plate number is required' };
  }

  const sanitized = plate.trim().toUpperCase().replace(/\s+/g, '');

  if (sanitized.length < 2 || sanitized.length > 10) {
    return { valid: false, error: 'Plate number must be 2-10 characters' };
  }

  if (!/^[A-Z0-9-]+$/.test(sanitized)) {
    return { valid: false, error: 'Plate number can only contain letters, numbers, and hyphens' };
  }

  return { valid: true, sanitized };
};

/**
 * Validate message content
 * - Must be 2-500 characters
 * - No script tags or dangerous content
 * - Predefined messages are always valid
 */
const validateMessage = (message, isGuest = false, isPremium = false) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  const predefinedMessages = [
    'Your headlights are on',
    'Your car is blocking another car',
    'Your window is open',
    'Your alarm is ringing',
    'Your tire looks flat'
  ];

  const trimmed = message.trim();

  // Predefined messages are always valid
  if (predefinedMessages.includes(trimmed)) {
    return { valid: true, sanitized: trimmed, isPredefined: true };
  }

  // Guests can only send predefined messages
  if (isGuest) {
    return {
      valid: false,
      error: 'Guests can only send predefined safety messages. Please claim a plate to send custom messages.'
    };
  }

  // Non-premium registered users also limited to predefined messages
  if (!isPremium) {
    return {
      valid: false,
      error: 'Custom messages are a premium feature. Upgrade to Premium to send custom messages.',
      premiumRequired: true
    };
  }

  // Validate length
  if (trimmed.length < 2 || trimmed.length > 500) {
    return { valid: false, error: 'Message must be 2-500 characters' };
  }

  // Sanitize message
  const sanitized = sanitizeString(trimmed);

  // Check for potentially malicious content
  if (sanitized.length === 0) {
    return { valid: false, error: 'Message contains invalid content' };
  }

  // Check for excessive special characters (potential spam)
  const specialChars = sanitized.match(/[^a-zA-Z0-9\s.,!?'-]/g) || [];
  if (specialChars.length > sanitized.length * 0.3) {
    return { valid: false, error: 'Message contains too many special characters' };
  }

  return { valid: true, sanitized, isPredefined: false };
};

/**
 * Validate userId
 * - Must be present
 * - Must match expected format (user-xxxxx or guest-xxxxx)
 */
const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return { valid: false, error: 'User ID is required' };
  }

  const trimmed = userId.trim();

  if (trimmed.length < 5 || trimmed.length > 50) {
    return { valid: false, error: 'Invalid user ID format' };
  }

  // Allow alphanumeric and hyphens only
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid user ID format' };
  }

  return { valid: true, sanitized: trimmed };
};

/**
 * Validate email address
 * - Must be a valid email format
 * - Sanitized to lowercase
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Prevent excessively long emails
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  return { valid: true, sanitized: trimmed };
};

/**
 * Middleware: Validate message sending request
 */
const validateMessageRequest = async (req, res, next) => {
  const { plate, message, senderId } = req.body;

  // Validate plate
  const plateValidation = validatePlate(plate);
  if (!plateValidation.valid) {
    return res.status(400).json({ error: plateValidation.error });
  }

  // Validate senderId
  const userValidation = validateUserId(senderId);
  if (!userValidation.valid) {
    return res.status(400).json({ error: userValidation.error });
  }

  // Determine if user is a guest and check premium status
  let isGuest = true;
  let isPremium = false;

  if (senderId) {
    const User = require('../models/User');
    const Plate = require('../models/Plate');

    const [user, ownedPlates] = await Promise.all([
      User.findOne({ userId: senderId }),
      Plate.find({ ownerId: senderId })
    ]);

    isGuest = ownedPlates.length === 0;
    isPremium = user?.premium === true && user?.subscriptionStatus === 'active';
  }

  // Validate message
  const messageValidation = validateMessage(message, isGuest, isPremium);
  if (!messageValidation.valid) {
    const statusCode = messageValidation.premiumRequired ? 402 : 400; // 402 Payment Required
    return res.status(statusCode).json({
      error: messageValidation.error,
      premiumRequired: messageValidation.premiumRequired || false
    });
  }

  // Attach sanitized values to request
  req.sanitized = {
    plate: plateValidation.sanitized,
    message: messageValidation.sanitized,
    senderId: userValidation.sanitized,
    isGuest,
    isPredefinedMessage: messageValidation.isPredefined
  };

  next();
};

/**
 * Middleware: Validate plate claiming request
 * Note: All users can claim plates - this is how they become registered users!
 */
const validatePlateClaimRequest = (req, res, next) => {
  const { plate, ownerId, email } = req.body;

  // Validate plate
  const plateValidation = validatePlate(plate);
  if (!plateValidation.valid) {
    return res.status(400).json({ error: plateValidation.error });
  }

  // Validate ownerId
  const userValidation = validateUserId(ownerId);
  if (!userValidation.valid) {
    return res.status(400).json({ error: userValidation.error });
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Attach sanitized values to request
  req.sanitized = {
    plate: plateValidation.sanitized,
    ownerId: userValidation.sanitized,
    email: emailValidation.sanitized
  };

  next();
};

/**
 * Middleware: Validate user registration request
 */
const validateUserRegistration = (req, res, next) => {
  const { userId, nickname } = req.body;

  // Validate userId
  const userValidation = validateUserId(userId);
  if (!userValidation.valid) {
    return res.status(400).json({ error: userValidation.error });
  }

  // Validate optional nickname
  let sanitizedNickname = null;
  if (nickname) {
    if (typeof nickname !== 'string') {
      return res.status(400).json({ error: 'Nickname must be a string' });
    }

    const trimmed = nickname.trim();
    if (trimmed.length > 30) {
      return res.status(400).json({ error: 'Nickname must be 30 characters or less' });
    }

    sanitizedNickname = sanitizeString(trimmed);

    if (sanitizedNickname.length === 0 && trimmed.length > 0) {
      return res.status(400).json({ error: 'Nickname contains invalid characters' });
    }
  }

  // Attach sanitized values to request
  req.sanitized = {
    userId: userValidation.sanitized,
    nickname: sanitizedNickname
  };

  next();
};

/**
 * Generic error handler for validation errors
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }
  next(err);
};

module.exports = {
  validateMessageRequest,
  validatePlateClaimRequest,
  validateUserRegistration,
  validationErrorHandler,
  // Export individual validators for testing
  validatePlate,
  validateMessage,
  validateUserId,
  validateEmail,
  sanitizeString
};
