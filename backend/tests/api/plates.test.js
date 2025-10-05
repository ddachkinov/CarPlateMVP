const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');

describe('Plates API', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        dbName: process.env.MONGO_DB_NAME || 'carplate_test',
      });
    }
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/plates', () => {
    it('should return empty array when no plates exist', async () => {
      const res = await request(app)
        .get('/api/plates')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return plates in descending order by creation date', async () => {
      // Create test plates
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'ABC123', ownerId: 'user1' })
        .expect(200);

      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'XYZ789', ownerId: 'user2' })
        .expect(200);

      const res = await request(app)
        .get('/api/plates')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].plate).toBe('XYZ789'); // Most recent first
      expect(res.body[1].plate).toBe('ABC123');
    });
  });

  describe('POST /api/plates/claim', () => {
    it('should claim a new plate successfully', async () => {
      const plateData = {
        plate: 'NEW123',
        ownerId: 'user123'
      };

      const res = await request(app)
        .post('/api/plates/claim')
        .send(plateData)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should normalize plate to uppercase', async () => {
      const plateData = {
        plate: 'lowercase123',
        ownerId: 'user123'
      };

      await request(app)
        .post('/api/plates/claim')
        .send(plateData)
        .expect(200);

      // Verify plate was stored in uppercase
      const plates = await request(app)
        .get('/api/plates')
        .expect(200);

      expect(plates.body[0].plate).toBe('LOWERCASE123');
    });

    it('should reject claim if plate already owned by another user', async () => {
      // First user claims plate
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'OWNED123', ownerId: 'user1' })
        .expect(200);

      // Second user tries to claim same plate
      const res = await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'OWNED123', ownerId: 'user2' })
        .expect(409);

      expect(res.body.error).toContain('already owned');
    });

    it('should reject claim with missing data', async () => {
      // Missing plate
      await request(app)
        .post('/api/plates/claim')
        .send({ ownerId: 'user123' })
        .expect(400);

      // Missing ownerId
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'ABC123' })
        .expect(400);
    });

    it('should handle whitespace in plate numbers', async () => {
      const res = await request(app)
        .post('/api/plates/claim')
        .send({ plate: '  SPACED123  ', ownerId: 'user123' })
        .expect(200);

      // Verify plate was trimmed and normalized
      const plates = await request(app)
        .get('/api/plates')
        .expect(200);

      expect(plates.body[0].plate).toBe('SPACED123');
    });
  });

  describe('GET /api/plates/owned/:userId', () => {
    it('should return empty array for user with no plates', async () => {
      const res = await request(app)
        .get('/api/plates/owned/newuser')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return owned plates for specific user', async () => {
      // User claims multiple plates
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'USER1A', ownerId: 'testuser' })
        .expect(200);

      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'USER1B', ownerId: 'testuser' })
        .expect(200);

      // Another user claims a plate
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'USER2A', ownerId: 'otheruser' })
        .expect(200);

      const res = await request(app)
        .get('/api/plates/owned/testuser')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body.map(p => p.plate)).toEqual(expect.arrayContaining(['USER1A', 'USER1B']));
      expect(res.body.map(p => p.plate)).not.toContain('USER2A');
    });
  });

  describe('GET /api/plates/inbox/:userId', () => {
    it('should return empty array when user has no owned plates', async () => {
      const res = await request(app)
        .get('/api/plates/inbox/userwithnoplates')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return messages for owned plates only', async () => {
      // User claims a plate
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'INBOX123', ownerId: 'inboxuser' })
        .expect(200);

      // Send message to that plate
      await request(app)
        .post('/api/message')
        .send({
          plate: 'INBOX123',
          message: 'Your lights are on',
          senderId: 'sender123'
        })
        .expect(201);

      // Send message to different plate (not owned)
      await request(app)
        .post('/api/message')
        .send({
          plate: 'OTHER123',
          message: 'Different message',
          senderId: 'sender456'
        })
        .expect(201);

      const res = await request(app)
        .get('/api/plates/inbox/inboxuser')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].plate).toBe('INBOX123');
      expect(res.body[0].message).toBe('Your lights are on');
    });
  });

  describe('DELETE /api/plates/:plateId', () => {
    it('should delete plate when owned by requesting user', async () => {
      // Claim a plate
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'DELETE123', ownerId: 'deleteuser' })
        .expect(200);

      // Get the plate ID
      const plates = await request(app)
        .get('/api/plates/owned/deleteuser')
        .expect(200);

      const plateId = plates.body[0]._id;

      // Delete the plate
      await request(app)
        .delete(`/api/plates/${plateId}?ownerId=deleteuser`)
        .expect(200);

      // Verify plate is deleted
      const remainingPlates = await request(app)
        .get('/api/plates/owned/deleteuser')
        .expect(200);

      expect(remainingPlates.body).toHaveLength(0);
    });

    it('should reject deletion by non-owner', async () => {
      // User claims a plate
      await request(app)
        .post('/api/plates/claim')
        .send({ plate: 'SECURE123', ownerId: 'realowner' })
        .expect(200);

      // Get the plate ID
      const plates = await request(app)
        .get('/api/plates/owned/realowner')
        .expect(200);

      const plateId = plates.body[0]._id;

      // Different user tries to delete
      await request(app)
        .delete(`/api/plates/${plateId}?ownerId=attacker`)
        .expect(403);
    });

    it('should return 404 for non-existent plate', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/plates/${fakeId}?ownerId=anyuser`)
        .expect(404);
    });
  });
});