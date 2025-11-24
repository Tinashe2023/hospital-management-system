const express = require('express');
const pool = require('../config/db');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get doctor profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const doctorResult = await pool.query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, dept.name as department_name 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       LEFT JOIN departments dept ON d.department_id = dept.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctorResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get appointments for doctor
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { date, status } = req.query;
    
    let query = `
      SELECT a.*, 
             p.user_id as patient_user_id,
             patient_user.first_name as patient_first_name,
             patient_user.last_name as patient_last_name,
             patient_user.phone as patient_phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users patient_user ON p.user_id = patient_user.id
      WHERE a.doctor_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (date) {
      query += ` AND a.appointment_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes for managing doctors
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone, dept.name as department_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ORDER BY u.last_name, u.first_name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
