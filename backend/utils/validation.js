/**
 * Input validation utilities
 * Provides sanitization and validation functions for common input types
 */

/**
 * Validate and sanitize user ID
 * @param {string} userId - User ID to validate
 * @returns {boolean} - True if valid
 */
const isValidUserId = (userId) => {
  if (!userId || typeof userId !== 'string') return false;
  // User IDs should be alphanumeric with hyphens, max 100 chars
  return /^[a-zA-Z0-9-]{1,100}$/.test(userId);
};

/**
 * Validate and sanitize plate number
 * @param {string} plate - License plate to validate
 * @returns {boolean} - True if valid
 */
const isValidPlate = (plate) => {
  if (!plate || typeof plate !== 'string') return false;
  // Plates should be alphanumeric with spaces/hyphens, 1-15 chars
  return /^[A-Z0-9\s-]{1,15}$/.test(plate.trim().toUpperCase());
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate message content
 * @param {string} message - Message to validate
 * @param {number} minLength - Minimum length (default 1)
 * @param {number} maxLength - Maximum length (default 500)
 * @returns {boolean} - True if valid
 */
const isValidMessage = (message, minLength = 1, maxLength = 500) => {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

/**
 * Validate ObjectId format (MongoDB)
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId format
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id);
};

/**
 * Sanitize string input (remove dangerous characters)
 * @param {string} input - String to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input, maxLength = 1000) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove < and > to prevent XSS
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - Validated and sanitized pagination params
 */
const validatePagination = (page, limit) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  return { page: validPage, limit: validLimit };
};

/**
 * Validate trust score
 * @param {number} score - Trust score to validate
 * @returns {boolean} - True if valid
 */
const isValidTrustScore = (score) => {
  return typeof score === 'number' && score >= 0 && score <= 100;
};

/**
 * Validate nickname
 * @param {string} nickname - Nickname to validate
 * @returns {boolean} - True if valid
 */
const isValidNickname = (nickname) => {
  if (!nickname || typeof nickname !== 'string') return false;
  const trimmed = nickname.trim();
  // Alphanumeric with spaces, underscores, hyphens, 1-30 chars
  return /^[a-zA-Z0-9\s_-]{1,30}$/.test(trimmed);
};

module.exports = {
  isValidUserId,
  isValidPlate,
  isValidEmail,
  isValidMessage,
  isValidObjectId,
  sanitizeString,
  validatePagination,
  isValidTrustScore,
  isValidNickname
};
