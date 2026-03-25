const db = require('../config/database');

/**
 * Build payload for anomaly_detection from recent ward GPS + today's check-ins.
 */
async function buildPayloadForWard(wardId) {
  if (wardId == null) return null;

  const locResult = await db.query(
    `SELECT u.id::text AS worker_id, ll.latitude AS lat, ll.longitude AS lon, ll.recorded_at AS timestamp
     FROM location_logs ll
     INNER JOIN users u ON u.id = ll.user_id
     WHERE u.ward_id = $1 AND u.role = 'worker' AND u.is_active = true
       AND ll.recorded_at >= NOW() - INTERVAL '24 hours'
     ORDER BY ll.recorded_at ASC
     LIMIT 8000`,
    [wardId]
  );

  const checkinResult = await db.query(
    `SELECT u.id::text AS worker_id, a.check_in_time AS checkin_time
     FROM attendance a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.ward_id = $1 AND u.role = 'worker' AND a.check_in_time IS NOT NULL
       AND a.date = CURRENT_DATE`,
    [wardId]
  );

  return {
    tracking_data: locResult.rows.map((r) => ({
      worker_id: r.worker_id,
      lat: Number(r.lat),
      lon: Number(r.lon),
      timestamp: new Date(r.timestamp).toISOString(),
    })),
    checkin_data: checkinResult.rows.map((r) => ({
      worker_id: r.worker_id,
      checkin_time: new Date(r.checkin_time).toISOString(),
    })),
  };
}

module.exports = { buildPayloadForWard };
