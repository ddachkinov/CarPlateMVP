const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express(); // <--- APP MUST BE CREATED FIRST
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME,
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch((err) => {
  console.error('❌ MongoDB connection failed:', err);
});

// Routes
const plateRoutes = require('./routes/plates');
app.use('/api/plates', plateRoutes);

const messageRoute = require('./routes/message');
app.use('/api/message', messageRoute);

const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('API is working');
});

// Export app for testing
module.exports = app;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}
