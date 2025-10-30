module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'middleware/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testTimeout: 30000,
  verbose: true
};
