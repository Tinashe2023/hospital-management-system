// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');  // ✅ fixed path

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Get user details from database
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [
      decoded.id,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.userDetails = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userDetails.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
