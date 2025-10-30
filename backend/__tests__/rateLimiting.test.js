/**
 * Rate Limiting Tests
 * Tests for rate limiting middleware with Redis
 */

const request = require('supertest');
const express = require('express');
const { messageRateLimiter, plateClaimLimiter, redisClient: getRedisClient } = require('../middleware/rateLimiter');
const { validateMessageRequest, validatePlateClaimRequest } = require('../middleware/validation');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test message endpoint
  app.post('/api/test/message', messageRateLimiter, validateMessageRequest, (req, res) => {
    res.status(200).json({ success: true, data: req.sanitized });
  });

  // Test plate claim endpoint
  app.post('/api/test/claim', plateClaimLimiter, validatePlateClaimRequest, (req, res) => {
    res.status(200).json({ success: true, data: req.sanitized });
  });

  return app;
};

describe('Rate Limiting Middleware', () => {
  let app;

  beforeAll(async () => {
    app = createTestApp();
    // Wait a bit for any async setup
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Clean up Redis keys and close connection if Redis is being used
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        await redisClient.flushDb();
        await redisClient.quit();
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  });

  afterEach(async () => {
    // Clear rate limit data between tests if Redis is available
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        await redisClient.flushDb();
      } catch (err) {
        // Ignore errors
      }
    }
  });

  describe('Guest User Rate Limiting', () => {
    test('should allow guest to send 1 message within 1 minute', async () => {
      const guestUserId = 'guest-test' + Date.now();
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your headlights are on',
          senderId: guestUserId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should block guest from sending 2nd message within 1 minute', async () => {
      const guestUserId = 'guest-test' + Date.now();
      // First message
      await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your headlights are on',
          senderId: guestUserId
        });

      // Second message (should be blocked)
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your car is blocking another car',
          senderId: guestUserId
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });

    test('should reject guest custom messages', async () => {
      const guestUserId = 'guest-test' + Date.now();
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'This is a custom message',
          senderId: guestUserId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('predefined');
    });
  });

  describe('Registered User Rate Limiting', () => {
    test('should allow registered user to send multiple messages', async () => {
      const registeredUserId = 'user-' + Date.now() + 'abc123def456';
      const messages = [
        'Your headlights are on',
        'Your car is blocking another car',
        'This is a custom message'
      ];

      for (const message of messages) {
        const response = await request(app)
          .post('/api/test/message')
          .send({
            plate: 'ABC123',
            message,
            senderId: registeredUserId
          });

        expect(response.status).toBe(200);
      }
    });

    test('should block registered user after 10 messages in 1 minute', async () => {
      const registeredUserId = 'user-' + Date.now() + 'abc123def456';
      // Send 10 messages (should succeed)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/test/message')
          .send({
            plate: 'ABC123',
            message: `Message ${i}`,
            senderId: registeredUserId
          });

        expect(response.status).toBe(200);
      }

      // 11th message (should be blocked)
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Message 11',
          senderId: registeredUserId
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });

    test('should allow custom messages for registered users', async () => {
      const registeredUserId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'This is my custom message',
          senderId: registeredUserId
        });

      expect(response.status).toBe(200);
      expect(response.body.data.message).toBe('This is my custom message');
    });
  });

  describe('Plate Claiming Rate Limiting', () => {
    test('should allow user to claim up to 5 plates per hour', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const plates = ['ABC123', 'XYZ789', 'DEF456', 'GHI789', 'JKL012'];

      for (const plate of plates) {
        const response = await request(app)
          .post('/api/test/claim')
          .send({
            plate,
            ownerId: userId
          });

        expect(response.status).toBe(200);
      }
    });

    test('should block 6th claim within 1 hour', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const plates = ['ABC123', 'XYZ789', 'DEF456', 'GHI789', 'JKL012', 'MNO345'];

      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/test/claim')
          .send({
            plate: plates[i],
            ownerId: userId
          });
      }

      // 6th should fail
      const response = await request(app)
        .post('/api/test/claim')
        .send({
          plate: plates[5],
          ownerId: userId
        });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many');
    });

    test('should prevent guests from claiming plates', async () => {
      const response = await request(app)
        .post('/api/test/claim')
        .send({
          plate: 'ABC123',
          ownerId: 'guest-123'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Guests cannot claim');
    });
  });

  describe('Input Validation with Rate Limiting', () => {
    test('should sanitize and normalize plate numbers', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: '  abc 123  ',
          message: 'Your headlights are on',
          senderId: 'user-abc123def456'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.plate).toBe('ABC123'); // Normalized
    });

    test('should reject invalid plate numbers', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'X',
          message: 'Your headlights are on',
          senderId: 'user-abc123def456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('2-10 characters');
    });

    test('should reject messages with XSS content', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: '<script>alert("xss")</script>',
          senderId: 'user-abc123def456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid content');
    });

    test('should reject messages that are too long', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const longMessage = 'a'.repeat(501);
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: longMessage,
          senderId: 'user-abc123def456'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('2-500 characters');
    });

    test('should sanitize message content', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Hello <b>there</b>!',
          senderId: 'user-abc123def456'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.message).not.toContain('<b>');
    });
  });

  describe('Rate Limit Headers', () => {
    test('should include rate limit headers in response', async () => {
      const userId = 'user-' + Date.now() + 'abc123def456';
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your headlights are on',
          senderId: 'user-abc123def456'
        });

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    test('should include retry-after header when rate limited', async () => {
      const guestUserId = 'guest-test' + Date.now();

      // First request
      await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your headlights are on',
          senderId: guestUserId
        });

      // Second request (rate limited)
      const response = await request(app)
        .post('/api/test/message')
        .send({
          plate: 'ABC123',
          message: 'Your car is blocking another car',
          senderId: guestUserId
        });

      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
    });
  });
});
