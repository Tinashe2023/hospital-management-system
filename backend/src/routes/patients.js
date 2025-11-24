const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get patient profile (own profile)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patientResult = await pool.query(
      'SELECT p.*, u.first_name, u.last_name, u.email, u.phone FROM patients p JOIN users u ON p.user_id = u.id WHERE u.id = $1',
      [req.user.id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patientResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update patient profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { dateOfBirth, gender, address, emergencyContactName, emergencyContactPhone, medicalHistory } = req.body;

    const result = await pool.query(
      `UPDATE patients SET date_of_birth = $1, gender = $2, address = $3, 
       emergency_contact_name = $4, emergency_contact_phone = $5, medical_history = $6 
       WHERE user_id = $7 RETURNING *`,
      [dateOfBirth, gender, address, emergencyContactName, emergencyContactPhone, medicalHistory, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all patients (admin only)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.last_name, u.first_name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Search doctors
router.get('/doctors/search', authenticateToken, async (req, res) => {
  try {
    const { department, specialization, name } = req.query;
    
    let query = `
      SELECT d.*, u.first_name, u.last_name, dept.name as department_name 
      FROM doctors d 
      JOIN users u ON d.user_id = u.id 
      JOIN departments dept ON d.department_id = dept.id 
      WHERE d.is_active = true
    `;
    const params = [];
    let paramIndex = 1;

    if (department) {
      query += ` AND dept.name ILIKE $${paramIndex}`;
      params.push(`%${department}%`);
      paramIndex++;
    }

    if (specialization) {
      query += ` AND d.specialization ILIKE $${paramIndex}`;
      params.push(`%${specialization}%`);
      paramIndex++;
    }

    if (name) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex + 1})`;
      params.push(`%${name}%`, `%${name}%`);
      paramIndex += 2;
    }

    query += ' ORDER BY u.last_name, u.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
