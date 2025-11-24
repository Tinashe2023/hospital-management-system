// backend/src/routes/admin.js
const express = require('express');
const pool = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get(
  '/dashboard',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const [
        patientCountRes,
        doctorCountRes,
        appointmentCountRes,
        treatmentCountRes,
        recentPatientsRes,
        recentDoctorsRes,
        recentAppointmentsRes,
      ] = await Promise.all([
        // totals
        pool.query('SELECT COUNT(*)::int AS total_patients FROM patients'),
        pool.query(
          'SELECT COUNT(*)::int AS total_doctors FROM doctors WHERE is_active = true'
        ),
        pool.query(
          "SELECT COUNT(*)::int AS total_appointments FROM appointments WHERE status IN ('scheduled', 'confirmed')"
        ),
        pool.query(
          'SELECT COUNT(*)::int AS total_treatments FROM treatments'
        ),
        // recent patients (no p.is_active here)
        pool.query(`
          SELECT p.id,
                 u.first_name,
                 u.last_name,
                 u.email,
                 u.phone
          FROM patients p
          JOIN users u ON p.user_id = u.id
          ORDER BY p.id DESC
          LIMIT 5
        `),
        // recent doctors
        pool.query(`
          SELECT d.id,
                 u.first_name,
                 u.last_name,
                 d.specialization,
                 COALESCE(dept.name, '') AS department_name,
                 CASE WHEN d.is_active THEN 'active' ELSE 'inactive' END AS status
          FROM doctors d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN departments dept ON d.department_id = dept.id
          ORDER BY u.last_name, u.first_name
          LIMIT 5
        `),
        // recent appointments
        pool.query(`
          SELECT a.id,
                 a.appointment_date,
                 a.appointment_time,
                 a.status,
                 patient_user.first_name AS patient_first_name,
                 patient_user.last_name  AS patient_last_name,
                 doctor_user.first_name  AS doctor_first_name,
                 doctor_user.last_name   AS doctor_last_name
          FROM appointments a
          JOIN patients p          ON a.patient_id = p.id
          JOIN users patient_user  ON p.user_id = patient_user.id
          JOIN doctors d           ON a.doctor_id = d.id
          JOIN users doctor_user   ON d.user_id = doctor_user.id
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
          LIMIT 5
        `),
      ]);

      res.json({
        stats: {
          totalPatients: patientCountRes.rows[0].total_patients,
          totalDoctors: doctorCountRes.rows[0].total_doctors,
          totalAppointments: appointmentCountRes.rows[0].total_appointments,
          totalTreatments: treatmentCountRes.rows[0].total_treatments,
        },
        recentPatients: recentPatientsRes.rows,
        recentDoctors: recentDoctorsRes.rows,
        recentAppointments: recentAppointmentsRes.rows,
      });
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      res.status(500).json({ message: 'Failed to load dashboard data' });
    }
  }
);

module.exports = router;
