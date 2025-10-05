const mongoose = require('mongoose');

module.exports = async () => {
  console.log('Tearing down test environment...');

  try {
    // Close database connection
    await mongoose.connection.close();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error during test teardown:', error.message);
  }
};