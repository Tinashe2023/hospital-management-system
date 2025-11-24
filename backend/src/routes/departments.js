// src/routes/departments.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = 'SELECT * FROM departments';
    const params = [];
    
    if (search) {
      query += ' WHERE name ILIKE $1 OR description ILIKE $1';
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create department (admin only)
router.post('/', [
  authenticateToken,
  authorizeRole(['admin']),
  body('name').notEmpty().isLength({ max: 100 }),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, headDoctorId } = req.body;

    // Check if department with same name already exists
    const existingDept = await pool.query('SELECT id FROM departments WHERE name = $1', [name]);
    if (existingDept.rows.length > 0) {
      return res.status(400).json({ message: 'Department with this name already exists' });
    }

    const result = await pool.query(
      'INSERT INTO departments (name, description, head_doctor_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, headDoctorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update department (admin only)
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin']),
  body('name').optional().isLength({ max: 100 }),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, headDoctorId } = req.body;

    // Check if department exists
    const existingDept = await pool.query('SELECT id FROM departments WHERE id = $1', [id]);
    if (existingDept.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if new name conflicts with existing departments (excluding current one)
    if (name) {
      const nameCheck = await pool.query(
        'SELECT id FROM departments WHERE name = $1 AND id != $2',
        [name, id]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Department with this name already exists' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 2;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }
    if (headDoctorId !== undefined) {
      updateFields.push(`head_doctor_id = $${paramIndex}`);
      updateValues.push(headDoctorId);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.unshift(id); // Add id as first parameter

    const result = await pool.query(
      `UPDATE departments SET ${updateFields.join(', ')}, created_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete department (admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const existingDept = await pool.query('SELECT id FROM departments WHERE id = $1', [id]);
    if (existingDept.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has associated doctors
    const doctorsResult = await pool.query('SELECT id FROM doctors WHERE department_id = $1', [id]);
    if (doctorsResult.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with associated doctors. Please reassign doctors first.' 
      });
    }

    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get doctors in a department
router.get('/:id/doctors', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.department_id = $1 AND d.is_active = true
      ORDER BY u.last_name, u.first_name
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get department statistics (admin only)
router.get('/:id/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get department info with statistics
    const deptResult = await pool.query(`
      SELECT d.*, 
             u.first_name as head_first_name,
             u.last_name as head_last_name,
             (SELECT COUNT(*) FROM doctors WHERE department_id = d.id AND is_active = true) as active_doctors_count,
             (SELECT COUNT(*) FROM appointments a 
              JOIN doctors doc ON a.doctor_id = doc.id 
              WHERE doc.department_id = d.id 
              AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days') as recent_appointments_count
      FROM departments d
      LEFT JOIN users u ON d.head_doctor_id = u.id
      WHERE d.id = $1
    `, [id]);

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(deptResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;