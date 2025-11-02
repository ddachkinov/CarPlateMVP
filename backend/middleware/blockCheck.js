const User = require('../models/User');

/**
 * Middleware to check if a user is blocked
 * Call this before any user action (sending messages, claiming plates, etc.)
 */
const checkUserBlocked = async (req, res, next) => {
  try {
    const userId = req.body.senderId || req.body.userId || req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and is blocked
    const user = await User.findOne({ userId });

    if (user && user.blocked) {
      return res.status(403).json({
        error: 'Account blocked',
        reason: user.blockedReason || 'Your account has been blocked due to trust and safety violations.',
        blocked: true
      });
    }

    // User is not blocked, continue
    next();
  } catch (error) {
    console.error('Error in blockCheck middleware:', error);
    next(error);
  }
};

module.exports = { checkUserBlocked };
