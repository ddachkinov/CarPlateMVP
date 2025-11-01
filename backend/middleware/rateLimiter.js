const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { createClient } = require('redis');

// Create Redis client (async initialization)
let redisClient = null;
let redisStore = null;

const initializeRedis = async () => {
  try {
    // Always try to use Redis if REDIS_URL is set
    if (process.env.REDIS_URL) {
      redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            // Stop retrying after 3 attempts
            if (retries > 3) {
              console.log('⚠️  Redis connection failed after 3 retries, using in-memory rate limiting');
              return null; // Stop retrying
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      redisClient.on('error', (err) => {
        console.error('⚠️  Redis Client Error (will use memory store):', err.message);
        // Don't crash the app on Redis errors
        redisClient = null;
        redisStore = null;
      });

      await redisClient.connect();
      console.log('✅ Redis connected for rate limiting');

      // Create a function that returns a new RedisStore for each limiter
      redisStore = (prefix) => new RedisStore({
        client: redisClient,
        prefix,
      });
    } else {
      console.log('ℹ️  Using in-memory rate limiting (no REDIS_URL configured)');
    }
  } catch (err) {
    console.error('❌ Redis connection failed, falling back to memory store:', err.message);
    redisClient = null;
    redisStore = null;
  }
};

// Initialize Redis on module load (async - may not be ready immediately)
initializeRedis();

// Helper to handle IPv6 addresses in key generator
const ipKeyGenerator = (req) => {
  // Extract IP from req.ip, handling IPv6 addresses
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  // Normalize IPv6-mapped IPv4 addresses
  return ip.replace(/^::ffff:/, '');
};

// Helper to get store config
const getStoreConfig = (prefix) => {
  if (redisStore) {
    return { store: redisStore(prefix) };
  }
  return {}; // Use default memory store
};

/**
 * Rate limiter for guest users (unregistered)
 * - 1 message per minute
 * - Only predefined messages allowed (enforced in validation)
 */
const guestRateLimiter = rateLimit({
  ...getStoreConfig('rl:guest:'),
  windowMs: 60 * 1000, // 1 minute
  max: 1, // 1 request per window
  message: {
    error: 'Too many requests. Please wait a moment before sending another message.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key generator - use senderId or IP for guests
  keyGenerator: (req) => {
    return req.body.senderId || ipKeyGenerator(req);
  },
  // Only apply to guests
  skip: (req) => {
    const senderId = req.body.senderId;
    // Skip if user is registered (has owned plates)
    return senderId && !senderId.startsWith('guest') && senderId.length > 12;
  }
});

/**
 * Rate limiter for registered users
 * - 10 messages per minute
 * - Can send custom messages
 */
const registeredUserRateLimiter = rateLimit({
  ...getStoreConfig('rl:registered:'),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    error: 'Too many requests. Please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.senderId || ipKeyGenerator(req);
  },
  // Only apply to registered users
  skip: (req) => {
    const senderId = req.body.senderId;
    // Skip if user is guest
    return !senderId || senderId.startsWith('guest') || senderId.length <= 12;
  }
});

/**
 * General API rate limiter
 * - 100 requests per 15 minutes per IP
 * - Applies to all endpoints
 */
const generalApiLimiter = rateLimit({
  ...getStoreConfig('rl:api:'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for plate claiming
 * - 5 claims per hour per user
 */
const plateClaimLimiter = rateLimit({
  ...getStoreConfig('rl:claim:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 claims per hour
  message: {
    error: 'Too many plate claims. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.ownerId || ipKeyGenerator(req);
  }
});

/**
 * Rate limiter for OCR requests (if we add backend OCR)
 * - 20 requests per hour per user
 */
const ocrRateLimiter = rateLimit({
  ...getStoreConfig('rl:ocr:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: {
    error: 'Too many OCR requests. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Combined message rate limiter that applies both guest and registered limits
 * Strategy: Use a unified rate limiter with dynamic limits based on user status
 */
const messageRateLimiter = rateLimit({
  ...getStoreConfig('rl:message:'),
  windowMs: 60 * 1000, // 1 minute
  // Dynamic max based on user status
  max: async (req) => {
    const senderId = req.body.senderId;

    if (!senderId) {
      return 1; // Guest limit
    }

    // Check if user has claimed any plates (registered user)
    const Plate = require('../models/Plate');
    const ownedPlates = await Plate.find({ ownerId: senderId });
    const isGuest = ownedPlates.length === 0;

    return isGuest ? 1 : 10; // 1/min for guests, 10/min for registered
  },
  message: (req) => {
    const senderId = req.body.senderId;
    return {
      error: senderId ? 'Too many requests. Please wait before sending another message.' : 'Too many requests. Please wait a moment.',
      retryAfter: 60
    };
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.senderId || ipKeyGenerator(req);
  }
});

// Export Redis client and initialization function for testing/cleanup
module.exports = {
  messageRateLimiter,
  guestRateLimiter,
  registeredUserRateLimiter,
  generalApiLimiter,
  plateClaimLimiter,
  ocrRateLimiter,
  redisClient: () => redisClient, // Export as function to get current client
  initializeRedis
};
