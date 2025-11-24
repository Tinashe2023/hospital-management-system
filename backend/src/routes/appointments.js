const express = require('express');
const pool = require('../config/db');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Book appointment (patient)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { doctorId, appointmentDate, appointmentTime, reason } = req.body;

    // Check if patient exists
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(400).json({ message: 'Patient not found' });
    }
    const patientId = patientResult.rows[0].id;

    // Check if doctor exists and is active
    const doctorResult = await pool.query('SELECT id FROM doctors WHERE id = $1 AND is_active = true', [doctorId]);
    if (doctorResult.rows.length === 0) {
      return res.status(400).json({ message: 'Doctor not found or inactive' });
    }

    // Check for existing appointment at same time
    const existingResult = await pool.query(
      'SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status IN ($4, $5)',
      [doctorId, appointmentDate, appointmentTime, 'scheduled', 'confirmed']
    );
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ message: 'Appointment slot is already booked' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, status) 
       VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING *`,
      [patientId, doctorId, appointmentDate, appointmentTime, reason]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all appointments (admin only)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             p.user_id as patient_user_id,
             patient_user.first_name as patient_first_name,
             patient_user.last_name as patient_last_name,
             d.user_id as doctor_user_id,
             doctor_user.first_name as doctor_first_name,
             doctor_user.last_name as doctor_last_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users patient_user ON p.user_id = patient_user.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doctor_user ON d.user_id = doctor_user.id
      ORDER BY a.appointment_date DESC, a.appointment_time
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get patient's appointments
router.get('/patient', authenticateToken, async (req, res) => {
  try {
    if (req.userDetails.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(400).json({ message: 'Patient not found' });
    }
    const patientId = patientResult.rows[0].id;

    const result = await pool.query(`
      SELECT a.*, 
             d.user_id as doctor_user_id,
             doctor_user.first_name as doctor_first_name,
             doctor_user.last_name as doctor_last_name,
             dept.name as department_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doctor_user ON d.user_id = doctor_user.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE a.patient_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time
    `, [patientId]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status (admin/doctor)
router.put('/:id/status', authenticateToken, authorizeRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
