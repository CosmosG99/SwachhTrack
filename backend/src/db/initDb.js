/**
 * Database initialization script.
 * Run: npm run db:init
 *
 * Prerequisites:
 *   1. PostgreSQL running with PostGIS extension available
 *   2. Create database: CREATE DATABASE swachhtrack;
 *   3. Update .env with your credentials
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function initDatabase() {
  const client = await pool.connect();

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'init.sql'),
      'utf-8'
    );

    console.log('🗄️  Initializing database...');
    await client.query(sql);
    console.log('✅ Database schema created successfully!');

    // Create a default admin user (password: admin123)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('admin123', 12);

    await client.query(
      `INSERT INTO users (employee_id, name, email, phone, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id) DO NOTHING`,
      ['ADMIN001', 'Admin User', 'admin@swachhtrack.in', '9999999999', passwordHash, 'admin', 'administration']
    );
    console.log('✅ Default admin user created (employee_id: ADMIN001, password: admin123)');

    // Create a sample worker
    const workerHash = await bcrypt.hash('worker123', 12);
    await client.query(
      `INSERT INTO users (employee_id, name, email, phone, password_hash, role, department, ward_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (employee_id) DO NOTHING`,
      ['WRK001', 'Ramesh Kumar', 'ramesh@swachhtrack.in', '8888888888', workerHash, 'worker', 'sanitation', 1]
    );
    console.log('✅ Sample worker created (employee_id: WRK001, password: worker123)');

    // Create a sample geofence (Mumbai Municipal Corp HQ)
    await client.query(
      `INSERT INTO geofences (name, type, latitude, longitude, center, radius_meters, ward_id)
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6)
       ON CONFLICT DO NOTHING`,
      ['Municipal HQ', 'office', 19.0760, 72.8777, 200, 1]
    );
    console.log('✅ Sample geofence created (Municipal HQ - Mumbai)');

    console.log('\n🚀 Database is ready! Run: npm run dev');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
