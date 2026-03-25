const db = require('../config/database');
const { isValidCoordinate, detectTeleportation } = require('../utils/geoUtils');
const { runDetection } = require('../services/anomalyPipeline');
const { buildPayloadForWard } = require('../services/anomalyService');
const { sendAnomalyAlerts } = require('../services/emailService');

/**
 * POST /api/v1/tracking/location
 * Submit GPS location(s). Supports single or batch.
 * Body: { latitude, longitude, accuracy, speed, battery_level, recorded_at }
 *   OR: { locations: [ { latitude, longitude, ... }, ... ] }
 */
exports.submitLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Support both single and batch submission
    let locations = req.body.locations || [req.body];

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: 'At least one location is required.' });
    }

    // Cap batch size at 100
    if (locations.length > 100) {
      locations = locations.slice(0, 100);
    }

    // Get the last known location for teleportation detection
    const lastLoc = await db.query(
      `SELECT latitude, longitude, recorded_at FROM location_logs
       WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [userId]
    );

    const inserted = [];
    const warnings = [];

    for (const loc of locations) {
      const {
        latitude, longitude,
        accuracy = null,
        speed = null,
        battery_level = null,
        recorded_at = new Date().toISOString(),
      } = loc;

      if (!isValidCoordinate(latitude, longitude)) {
        warnings.push({ latitude, longitude, error: 'Invalid coordinates, skipped.' });
        continue;
      }

      // Check for teleportation
      let isSuspicious = false;
      if (lastLoc.rows.length > 0) {
        const prev = lastLoc.rows[0];
        const timeDiff = (new Date(recorded_at) - new Date(prev.recorded_at)) / 1000;
        if (timeDiff > 0) {
          isSuspicious = detectTeleportation(
            prev.latitude, prev.longitude,
            latitude, longitude,
            timeDiff
          );
        }
      }

      if (isSuspicious) {
        warnings.push({
          latitude, longitude,
          warning: 'Suspicious movement detected (possible GPS spoofing). Logged but flagged.',
        });
      }

      const result = await db.query(
        `INSERT INTO location_logs
          (user_id, latitude, longitude, location, accuracy_meters, speed, battery_level, is_moving, recorded_at)
         VALUES ($1, $2, $3,
           ST_SetSRID(ST_MakePoint($4, $2), 4326)::geography,
           $5, $6, $7, $8, $9)
         RETURNING id, latitude, longitude, recorded_at`,
        [userId, latitude, longitude, longitude, accuracy, speed, battery_level, speed > 0.5, recorded_at]
      );

      inserted.push(result.rows[0]);
    }

    // Emit to Socket.IO if available
    if (req.app.get('io') && inserted.length > 0) {
      const latest = inserted[inserted.length - 1];
      const io = req.app.get('io');
      io.to(`ward:${req.user.ward_id || 'all'}`).emit('location:update', {
        user_id: userId,
        employee_id: req.user.employee_id,
        name: req.user.name,
        ...latest,
      });
    }

    res.status(201).json({
      message: `${inserted.length} location(s) recorded.`,
      inserted: inserted.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    if (req.user.ward_id && inserted.length > 0) {
      const wardId = req.user.ward_id;
      setImmediate(async () => {
        try {
          const payload = await buildPayloadForWard(wardId);
          if (!payload?.tracking_data?.length) return;
          const result = await runDetection(payload);
          if (result.alerts?.length && !result.error) {
            await sendAnomalyAlerts(result.alerts, { wardId });
          }
        } catch (e) {
          console.error('[anomaly]', e.message);
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tracking/live/:userId
 * Get latest known location of a specific user.
 */
exports.getLiveLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT ll.*, u.name, u.employee_id, u.department
       FROM location_logs ll
       JOIN users u ON ll.user_id = u.id
       WHERE ll.user_id = $1
       ORDER BY ll.recorded_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location data found for this user.' });
    }

    const loc = result.rows[0];
    const ageSeconds = (Date.now() - new Date(loc.recorded_at).getTime()) / 1000;

    res.json({
      user: {
        id: loc.user_id,
        name: loc.name,
        employee_id: loc.employee_id,
        department: loc.department,
      },
      location: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy_meters,
        speed: loc.speed,
        battery_level: loc.battery_level,
        is_moving: loc.is_moving,
        recorded_at: loc.recorded_at,
        age_seconds: Math.round(ageSeconds),
        is_stale: ageSeconds > 300, // stale if older than 5 minutes
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tracking/live
 * Get all active workers' latest locations (supervisor/admin).
 * Query: ?ward_id=1
 */
exports.getAllLiveLocations = async (req, res, next) => {
  try {
    const { ward_id } = req.query;

    let whereClause = "WHERE u.role = 'worker' AND u.is_active = true";
    const params = [];

    if (ward_id) {
      whereClause += ' AND u.ward_id = $1';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT DISTINCT ON (u.id)
        u.id AS user_id, u.employee_id, u.name, u.department, u.ward_id,
        ll.latitude, ll.longitude, ll.accuracy_meters,
        ll.speed, ll.battery_level, ll.is_moving, ll.recorded_at
       FROM users u
       LEFT JOIN location_logs ll ON u.id = ll.user_id
       ${whereClause}
       ORDER BY u.id, ll.recorded_at DESC`,
      params
    );

    const workers = result.rows.map(row => ({
      user_id: row.user_id,
      employee_id: row.employee_id,
      name: row.name,
      department: row.department,
      ward_id: row.ward_id,
      location: row.latitude ? {
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy_meters,
        speed: row.speed,
        battery_level: row.battery_level,
        is_moving: row.is_moving,
        recorded_at: row.recorded_at,
        is_stale: row.recorded_at
          ? (Date.now() - new Date(row.recorded_at).getTime()) / 1000 > 300
          : true,
      } : null,
    }));

    res.json({
      total: workers.length,
      active: workers.filter(w => w.location && !w.location.is_stale).length,
      workers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tracking/trail/:userId
 * Get GPS trail for a user on a given date.
 * Query: ?date=2024-01-15
 */
exports.getTrail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT id, latitude, longitude, accuracy_meters, speed,
              battery_level, is_moving, recorded_at
       FROM location_logs
       WHERE user_id = $1
         AND recorded_at::date = $2
       ORDER BY recorded_at ASC`,
      [userId, targetDate]
    );

    // Calculate total distance
    let totalDistance = 0;
    const { haversineDistance } = require('../utils/geoUtils');
    for (let i = 1; i < result.rows.length; i++) {
      const prev = result.rows[i - 1];
      const curr = result.rows[i];
      totalDistance += haversineDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
    }

    res.json({
      user_id: userId,
      date: targetDate,
      total_points: result.rows.length,
      total_distance_meters: Math.round(totalDistance),
      total_distance_km: (totalDistance / 1000).toFixed(2),
      trail: result.rows,
    });
  } catch (err) {
    next(err);
  }
};
