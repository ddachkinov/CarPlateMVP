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

const registerRoute = require('./routes/register');
app.use('/api/register', registerRoute);

const messageRoute = require('./routes/message');
app.use('/api/message', messageRoute);

// Test route
app.get('/', (req, res) => {
  res.send('API is working');
});

// Start server
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
