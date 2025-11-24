// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Use shared PostgreSQL pool
const pool = require('./src/config/db');

// Test database connection
pool
  .query('SELECT NOW()')
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch((err) =>
    console.error('Database connection error:', err.stack)
  );

// API routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/patients', require('./src/routes/patients'));
app.use('/api/doctors', require('./src/routes/doctors'));
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/treatments', require('./src/routes/treatments'));
app.use('/api/departments', require('./src/routes/departments'));
app.use('/api/admin', require('./src/routes/admin')); // ✅ admin dashboard

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { pool };
