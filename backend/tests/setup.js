// Test setup file - runs before each test file
const mongoose = require('mongoose');

// Set test environment variables if not set
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/carplate_test';
process.env.MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'carplate_test';

// Extend Jest timeout for database operations
jest.setTimeout(30000);

// Clean up database after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Mock console.log in tests to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}