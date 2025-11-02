const OpenAI = require('openai');

// Initialize OpenAI client if API key is available
let openai = null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
  console.log('✅ OpenAI moderation service initialized');
} else {
  console.warn('⚠️  OPENAI_API_KEY not found. AI moderation disabled.');
}

/**
 * Check if OpenAI moderation is configured
 */
const isConfigured = () => {
  return openai !== null;
};

/**
 * Moderate message content using OpenAI's moderation API
 * @param {string} content - The message content to moderate
 * @returns {Promise<Object>} - Moderation result with flagged status and categories
 */
const moderateContent = async (content) => {
  if (!openai) {
    // If OpenAI is not configured, return safe result
    return {
      flagged: false,
      categories: {},
      severity: 'none',
      autoAction: 'allow'
    };
  }

  try {
    const moderation = await openai.moderations.create({
      input: content,
      model: 'text-moderation-latest'
    });

    const result = moderation.results[0];

    // Determine severity and auto-action based on categories
    let severity = 'none';
    let autoAction = 'allow';

    if (result.flagged) {
      // High severity categories that warrant immediate blocking
      const highSeverity = [
        'hate',
        'hate/threatening',
        'self-harm',
        'self-harm/intent',
        'sexual/minors',
        'violence/graphic'
      ];

      // Medium severity categories that warrant flagging
      const mediumSeverity = [
        'harassment',
        'harassment/threatening',
        'violence',
        'sexual'
      ];

      // Check for high severity
      const hasHighSeverity = highSeverity.some(cat => result.categories[cat]);
      const hasMediumSeverity = mediumSeverity.some(cat => result.categories[cat]);

      if (hasHighSeverity) {
        severity = 'high';
        autoAction = 'block'; // Block message and flag user
      } else if (hasMediumSeverity) {
        severity = 'medium';
        autoAction = 'flag'; // Flag for review but allow message
      } else {
        severity = 'low';
        autoAction = 'allow'; // Allow but log for monitoring
      }
    }

    return {
      flagged: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      severity,
      autoAction
    };
  } catch (error) {
    console.error('Error in OpenAI moderation:', error);
    // On error, allow the message but log the issue
    return {
      flagged: false,
      categories: {},
      severity: 'error',
      autoAction: 'allow',
      error: error.message
    };
  }
};

/**
 * Moderate message and take automatic action if needed
 * @param {string} content - The message content to moderate
 * @param {string} userId - The user ID sending the message
 * @returns {Promise<Object>} - Result with action taken
 */
const moderateAndAct = async (content, userId) => {
  const modResult = await moderateContent(content);

  console.log(`🔍 Moderation result for user ${userId}:`, {
    flagged: modResult.flagged,
    severity: modResult.severity,
    action: modResult.autoAction
  });

  // Return result with recommendation
  return {
    allowed: modResult.autoAction !== 'block',
    flagged: modResult.flagged,
    severity: modResult.severity,
    action: modResult.autoAction,
    categories: modResult.categories,
    reason: modResult.flagged
      ? `Content flagged for: ${Object.keys(modResult.categories).filter(k => modResult.categories[k]).join(', ')}`
      : null
  };
};

module.exports = {
  isConfigured,
  moderateContent,
  moderateAndAct
};
