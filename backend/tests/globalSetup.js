const mongoose = require('mongoose');

module.exports = async () => {
  console.log('Setting up test environment...');

  // Set test environment
  process.env.NODE_ENV = 'test';

  // Connect to test database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/carplate_test';

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || 'carplate_test',
    });

    // Clear test database
    await mongoose.connection.db.dropDatabase();

    console.log('Test database connected and cleared');
  } catch (error) {
    console.error('Failed to setup test database:', error.message);
    // Don't throw here, let individual tests handle connection
  }
};