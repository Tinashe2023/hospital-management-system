// src/routes/treatments.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Create treatment record (doctor only)
router.post('/', [
  authenticateToken,
  authorizeRole(['doctor']),
  body('appointmentId').isInt(),
  body('diagnosis').notEmpty(),
  body('prescriptions').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentId, diagnosis, prescriptions, treatmentNotes, followUpDate } = req.body;

    // Verify appointment exists and belongs to the doctor
    const appointmentResult = await pool.query(
      'SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = $1',
      [appointmentId]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.rows[0];
    
    // Check if appointment is completed (treatment can only be added to completed appointments)
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Treatment can only be added to completed appointments' });
    }

    // Check if treatment already exists for this appointment
    const existingTreatment = await pool.query(
      'SELECT id FROM treatments WHERE appointment_id = $1',
      [appointmentId]
    );

    if (existingTreatment.rows.length > 0) {
      return res.status(400).json({ message: 'Treatment already exists for this appointment' });
    }

    // Create treatment record
    const result = await pool.query(
      `INSERT INTO treatments (appointment_id, diagnosis, prescriptions, treatment_notes, follow_up_date, created_by_doctor_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [appointmentId, diagnosis, prescriptions, treatmentNotes, followUpDate, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update treatment record (doctor only)
router.put('/:id', [
  authenticateToken,
  authorizeRole(['doctor']),
  body('diagnosis').optional().notEmpty(),
  body('prescriptions').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { diagnosis, prescriptions, treatmentNotes, followUpDate } = req.body;

    // Verify treatment exists and belongs to doctor's patient
    const treatmentResult = await pool.query(
      `SELECT t.*, a.doctor_id 
       FROM treatments t 
       JOIN appointments a ON t.appointment_id = a.id 
       WHERE t.id = $1`,
      [id]
    );

    if (treatmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Treatment not found' });
    }

    const treatment = treatmentResult.rows[0];

    // Verify doctor owns this treatment
    if (treatment.doctor_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to update this treatment' });
    }

    // Update treatment
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 2;

    if (diagnosis !== undefined) {
      updateFields.push(`diagnosis = $${paramIndex}`);
      updateValues.push(diagnosis);
      paramIndex++;
    }
    if (prescriptions !== undefined) {
      updateFields.push(`prescriptions = $${paramIndex}`);
      updateValues.push(prescriptions);
      paramIndex++;
    }
    if (treatmentNotes !== undefined) {
      updateFields.push(`treatment_notes = $${paramIndex}`);
      updateValues.push(treatmentNotes);
      paramIndex++;
    }
    if (followUpDate !== undefined) {
      updateFields.push(`follow_up_date = $${paramIndex}`);
      updateValues.push(followUpDate);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.unshift(id); // Add id as first parameter

    const result = await pool.query(
      `UPDATE treatments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get treatment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT t.*, 
             a.appointment_date,
             a.appointment_time,
             d.user_id as doctor_user_id,
             doctor_user.first_name as doctor_first_name,
             doctor_user.last_name as doctor_last_name,
             p.user_id as patient_user_id,
             patient_user.first_name as patient_first_name,
             patient_user.last_name as patient_last_name
      FROM treatments t
      JOIN appointments a ON t.appointment_id = a.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doctor_user ON d.user_id = doctor_user.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users patient_user ON p.user_id = patient_user.id
    `;

    // Add role-based restrictions
    if (req.userDetails.role === 'patient') {
      query += ` WHERE t.id = $1 AND p.user_id = $2`;
      const result = await pool.query(query, [id, req.user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Treatment not found' });
      }
    } else if (req.userDetails.role === 'doctor') {
      query += ` WHERE t.id = $1 AND d.user_id = $2`;
      const result = await pool.query(query, [id, req.user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Treatment not found' });
      }
    } else { // admin
      query += ` WHERE t.id = $1`;
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Treatment not found' });
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get treatments for patient (patient can see their own treatments)
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient exists and belongs to user (if patient role)
    if (req.userDetails.role === 'patient') {
      const patientResult = await pool.query(
        'SELECT id FROM patients WHERE user_id = $1',
        [req.user.id]
      );
      
      if (patientResult.rows.length === 0 || patientResult.rows[0].id != patientId) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }
    }

    const result = await pool.query(
      `SELECT t.*, 
              a.appointment_date,
              a.appointment_time,
              d.user_id as doctor_user_id,
              doctor_user.first_name as doctor_first_name,
              doctor_user.last_name as doctor_last_name,
              dept.name as department_name
       FROM treatments t
       JOIN appointments a ON t.appointment_id = a.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users doctor_user ON d.user_id = doctor_user.id
       LEFT JOIN departments dept ON d.department_id = dept.id
       JOIN patients p ON a.patient_id = p.id
       WHERE p.id = $1
       ORDER BY t.treatment_date DESC`,
      [patientId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get treatments for doctor (doctor can see treatments they created)
router.get('/doctor', authenticateToken, authorizeRole(['doctor']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              a.appointment_date,
              a.appointment_time,
              p.user_id as patient_user_id,
              patient_user.first_name as patient_first_name,
              patient_user.last_name as patient_last_name,
              patient_user.phone as patient_phone
       FROM treatments t
       JOIN appointments a ON t.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       JOIN users patient_user ON p.user_id = patient_user.id
       WHERE t.created_by_doctor_id = $1
       ORDER BY t.treatment_date DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin route: Get all treatments
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { patientId, doctorId, dateFrom, dateTo } = req.query;
    
    let query = `
      SELECT t.*, 
             a.appointment_date,
             a.appointment_time,
             d.user_id as doctor_user_id,
             doctor_user.first_name as doctor_first_name,
             doctor_user.last_name as doctor_last_name,
             p.user_id as patient_user_id,
             patient_user.first_name as patient_first_name,
             patient_user.last_name as patient_last_name
      FROM treatments t
      JOIN appointments a ON t.appointment_id = a.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users doctor_user ON d.user_id = doctor_user.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users patient_user ON p.user_id = patient_user.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (patientId) {
      query += ` AND p.id = $${paramIndex}`;
      params.push(patientId);
      paramIndex++;
    }

    if (doctorId) {
      query += ` AND d.id = $${paramIndex}`;
      params.push(doctorId);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND t.treatment_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND t.treatment_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ' ORDER BY t.treatment_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;