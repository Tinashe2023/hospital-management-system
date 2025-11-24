const { Pool } = require('pg');

const pool = new Pool({
  user: 'Tinashe',
  host: 'localhost',
  database: 'hospital_management',
  password: 'Kairostribe2025',
  port: 5432,
});

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // Insert departments
    const departments = [
      { name: 'Cardiology', description: 'Heart and cardiovascular diseases' },
      { name: 'Neurology', description: 'Brain and nervous system disorders' },
      { name: 'Orthopedics', description: 'Bone and joint disorders' },
      { name: 'Pediatrics', description: 'Children healthcare' },
      { name: 'General Medicine', description: 'General healthcare' }
    ];

    for (const dept of departments) {
      await pool.query(
        'INSERT INTO departments (name, description) VALUES ($1, $2)',
        [dept.name, dept.description]
      );
    }

    // Insert admin user
    const adminPassword = await require('bcryptjs').hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin@hospital.com', adminPassword, 'admin', 'System', 'Admin', '+1234567890']
    );

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
