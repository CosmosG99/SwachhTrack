require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://swachhtrack_user:swachh123@localhost:5432/swachhtrack'
});

async function updateGeofence() {
  try {
    const query = `
      UPDATE geofences 
      SET 
        name = 'Yashwantrao College of Engineering, Sawantwadi',
        center = ST_SetSRID(ST_MakePoint(73.818228, 15.894238), 4326),
        radius_meters = 500
      WHERE id = 1
      RETURNING *;
    `;
    const res = await pool.query(query);
    console.log('Geofence updated:', res.rows[0]);

    // Update map default center if possible, but map centers are hardcoded in frontend
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

updateGeofence();
