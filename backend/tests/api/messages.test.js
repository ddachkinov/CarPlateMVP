const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');

describe('Messages API', () => {
  beforeAll(async () => {
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

  describe('POST /api/message', () => {
    it('should send message successfully', async () => {
      const messageData = {
        plate: 'MSG123',
        message: 'Your headlights are on',
        senderId: 'sender123'
      };

      const res = await request(app)
        .post('/api/message')
        .send(messageData)
        .expect(201);

      expect(res.body.message).toBe('Message saved.');
    });

    it('should normalize plate number to uppercase', async () => {
      const messageData = {
        plate: 'lowercase456',
        message: 'Test message',
        senderId: 'sender123'
      };

      const res = await request(app)
        .post('/api/message')
        .send(messageData)
        .expect(201);

      expect(res.body.message).toBe('Message saved.');
    });

    it('should create plate if it does not exist', async () => {
      const messageData = {
        plate: 'NEWPLATE789',
        message: 'Your alarm is ringing',
        senderId: 'sender456'
      };

      await request(app)
        .post('/api/message')
        .send(messageData)
        .expect(201);

      // Verify plate was created
      const plates = await request(app)
        .get('/api/plates')
        .expect(200);

      const newPlate = plates.body.find(p => p.plate === 'NEWPLATE789');
      expect(newPlate).toBeDefined();
      expect(newPlate.ownerId).toBeUndefined(); // Should not have owner
    });

    it('should reject message with missing fields', async () => {
      // Missing plate
      await request(app)
        .post('/api/message')
        .send({ message: 'Test', senderId: 'user' })
        .expect(400);

      // Missing message
      await request(app)
        .post('/api/message')
        .send({ plate: 'ABC123', senderId: 'user' })
        .expect(400);

      // Missing senderId
      await request(app)
        .post('/api/message')
        .send({ plate: 'ABC123', message: 'Test' })
        .expect(400);
    });

    it('should handle whitespace in plate and message', async () => {
      const messageData = {
        plate: '  SPACED123  ',
        message: '  Your window is open  ',
        senderId: 'sender789'
      };

      const res = await request(app)
        .post('/api/message')
        .send(messageData)
        .expect(201);

      expect(res.body.message).toBe('Message saved.');
    });

    it('should allow multiple messages to same plate', async () => {
      const plate = 'MULTI123';

      // Send first message
      await request(app)
        .post('/api/message')
        .send({
          plate: plate,
          message: 'First message',
          senderId: 'sender1'
        })
        .expect(201);

      // Send second message
      await request(app)
        .post('/api/message')
        .send({
          plate: plate,
          message: 'Second message',
          senderId: 'sender2'
        })
        .expect(201);

      // Verify both messages exist
      const messages = await request(app)
        .get('/api/plates/messages')
        .expect(200);

      const plateMessages = messages.body.filter(m => m.plate === plate);
      expect(plateMessages).toHaveLength(2);
      expect(plateMessages.map(m => m.message)).toEqual(
        expect.arrayContaining(['First message', 'Second message'])
      );
    });

    it('should allow same user to send multiple messages', async () => {
      const senderId = 'repeatsender';

      await request(app)
        .post('/api/message')
        .send({
          plate: 'REPEAT1',
          message: 'Message 1',
          senderId: senderId
        })
        .expect(201);

      await request(app)
        .post('/api/message')
        .send({
          plate: 'REPEAT2',
          message: 'Message 2',
          senderId: senderId
        })
        .expect(201);

      // Both should succeed
      const messages = await request(app)
        .get('/api/plates/messages')
        .expect(200);

      const userMessages = messages.body.filter(m => m.senderId === senderId);
      expect(userMessages).toHaveLength(2);
    });
  });

  describe('GET /api/plates/messages', () => {
    it('should return empty array when no messages exist', async () => {
      const res = await request(app)
        .get('/api/plates/messages')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should return messages in descending order by creation date', async () => {
      // Send multiple messages with slight delay
      await request(app)
        .post('/api/message')
        .send({
          plate: 'ORDER1',
          message: 'First message',
          senderId: 'user1'
        })
        .expect(201);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .post('/api/message')
        .send({
          plate: 'ORDER2',
          message: 'Second message',
          senderId: 'user2'
        })
        .expect(201);

      const res = await request(app)
        .get('/api/plates/messages')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].message).toBe('Second message'); // Most recent first
      expect(res.body[1].message).toBe('First message');
    });

    it('should include all message fields', async () => {
      await request(app)
        .post('/api/message')
        .send({
          plate: 'FIELDS123',
          message: 'Complete message',
          senderId: 'fieldsuser'
        })
        .expect(201);

      const res = await request(app)
        .get('/api/plates/messages')
        .expect(200);

      const message = res.body[0];
      expect(message).toHaveProperty('_id');
      expect(message).toHaveProperty('plate', 'FIELDS123');
      expect(message).toHaveProperty('message', 'Complete message');
      expect(message).toHaveProperty('senderId', 'fieldsuser');
      expect(message).toHaveProperty('createdAt');
      expect(new Date(message.createdAt)).toBeInstanceOf(Date);
    });
  });
});