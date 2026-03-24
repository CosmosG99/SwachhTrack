const db = require('../config/database');
const { isValidCoordinate } = require('../utils/geoUtils');
const { createQrPayload, verifyQrPayload, generateQrImage } = require('../utils/qrUtils');

/**
 * POST /api/v1/attendance/qr/generate
 * Generate a QR code for an attendance site (admin/supervisor).
 * Body: { geofence_id }
 */
exports.generateQr = async (req, res, next) => {
  try {
    const { geofence_id } = req.body;

    if (!geofence_id) {
      return res.status(400).json({ error: 'geofence_id is required.' });
    }

    // Verify geofence exists
    const fence = await db.query('SELECT id, name FROM geofences WHERE id = $1 AND is_active = true', [geofence_id]);
    if (fence.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found.' });
    }

    const siteId = `site_${fence.rows[0].name.replace(/\s/g, '_').toLowerCase()}`;
    const payload = createQrPayload(siteId, geofence_id);
    const qrImage = await generateQrImage(payload);

    res.json({
      message: 'QR code generated successfully.',
      qr_data: payload,
      qr_image: qrImage,
      geofence: fence.rows[0],
      valid_for: '12 hours',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/attendance/check-in
 * Worker scans QR + submits GPS to check in.
 * Body: { qr_data, latitude, longitude }
 */
exports.checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { qr_data, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required.' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid GPS coordinates.' });
    }

    // Check if already checked in today
    const existing = await db.query(
      `SELECT id FROM attendance
       WHERE user_id = $1 AND date = CURRENT_DATE AND status = 'checked_in'`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Already checked in today. Please check out first.',
        attendance_id: existing.rows[0].id,
      });
    }

    let geofenceId = null;
    let isWithinGeofence = false;
    let qrSiteId = null;

    // If QR data is provided, verify it
    if (qr_data) {
      const qrPayload = verifyQrPayload(qr_data);
      if (!qrPayload) {
        return res.status(400).json({ error: 'Invalid or expired QR code.' });
      }
      geofenceId = qrPayload.geofenceId;
      qrSiteId = qrPayload.siteId;
    }

    // Check if worker is within any geofence
    if (geofenceId) {
      const fenceCheck = await db.query(
        `SELECT id, name, ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            radius_meters
         ) AS is_within
         FROM geofences WHERE id = $3`,
        [longitude, latitude, geofenceId]
      );

      if (fenceCheck.rows.length > 0) {
        isWithinGeofence = fenceCheck.rows[0].is_within;
      }
    } else {
      // Find nearest geofence the worker is inside of
      const nearestFence = await db.query(
        `SELECT id, name, radius_meters FROM geofences
         WHERE is_active = true
           AND ST_DWithin(
             center,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             radius_meters
           )
         ORDER BY ST_Distance(center, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
         LIMIT 1`,
        [longitude, latitude]
      );

      if (nearestFence.rows.length > 0) {
        geofenceId = nearestFence.rows[0].id;
        isWithinGeofence = true;
      }
    }

    const result = await db.query(
      `INSERT INTO attendance
        (user_id, check_in_time, check_in_lat, check_in_lng, check_in_location,
         geofence_id, check_in_within_geofence, qr_site_id, status, date)
       VALUES ($1, NOW(), $2, $3,
         ST_SetSRID(ST_MakePoint($4, $2), 4326)::geography,
         $5, $6, $7, 'checked_in', CURRENT_DATE)
       RETURNING id, check_in_time, check_in_lat, check_in_lng,
         check_in_within_geofence, qr_site_id, status, date`,
      [userId, latitude, longitude, longitude, geofenceId, isWithinGeofence, qrSiteId]
    );

    res.status(201).json({
      message: isWithinGeofence
        ? '✅ Checked in successfully (within geofence).'
        : '⚠️ Checked in, but you are outside the designated geofence.',
      attendance: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/attendance/check-out
 * Worker checks out for the day.
 * Body: { latitude, longitude }
 */
exports.checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude are required.' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid GPS coordinates.' });
    }

    // Find today's active check-in
    const active = await db.query(
      `SELECT id, geofence_id FROM attendance
       WHERE user_id = $1 AND date = CURRENT_DATE AND status = 'checked_in'`,
      [userId]
    );

    if (active.rows.length === 0) {
      return res.status(404).json({ error: 'No active check-in found for today.' });
    }

    const attendanceId = active.rows[0].id;
    const geofenceId = active.rows[0].geofence_id;

    // Check if within geofence at checkout
    let isWithinGeofence = false;
    if (geofenceId) {
      const fenceCheck = await db.query(
        `SELECT ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            radius_meters
         ) AS is_within
         FROM geofences WHERE id = $3`,
        [longitude, latitude, geofenceId]
      );

      if (fenceCheck.rows.length > 0) {
        isWithinGeofence = fenceCheck.rows[0].is_within;
      }
    }

    const result = await db.query(
      `UPDATE attendance SET
        check_out_time = NOW(),
        check_out_lat = $1,
        check_out_lng = $2,
        check_out_location = ST_SetSRID(ST_MakePoint($3, $1), 4326)::geography,
        check_out_within_geofence = $4,
        status = 'checked_out'
       WHERE id = $5
       RETURNING id, check_in_time, check_out_time,
         check_in_lat, check_in_lng, check_out_lat, check_out_lng,
         check_in_within_geofence, check_out_within_geofence,
         status, date`,
      [latitude, longitude, longitude, isWithinGeofence, attendanceId]
    );

    const record = result.rows[0];

    // Calculate hours worked
    const hoursWorked = (
      (new Date(record.check_out_time) - new Date(record.check_in_time)) / 3600000
    ).toFixed(2);

    res.json({
      message: '✅ Checked out successfully.',
      attendance: { ...record, hours_worked: parseFloat(hoursWorked) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/attendance/today
 * Get current user's attendance for today.
 */
exports.getToday = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.*, g.name AS geofence_name
       FROM attendance a
       LEFT JOIN geofences g ON a.geofence_id = g.id
       WHERE a.user_id = $1 AND a.date = CURRENT_DATE
       ORDER BY a.check_in_time DESC`,
      [req.user.id]
    );

    res.json({
      date: new Date().toISOString().split('T')[0],
      records: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/attendance/history
 * Get attendance history for the authenticated user.
 * Query: ?from=2024-01-01&to=2024-01-31&page=1&limit=20
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE a.user_id = $1';
    const params = [userId];
    let paramIdx = 2;

    if (from) {
      whereClause += ` AND a.date >= $${paramIdx}`;
      params.push(from);
      paramIdx++;
    }
    if (to) {
      whereClause += ` AND a.date <= $${paramIdx}`;
      params.push(to);
      paramIdx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT a.*, g.name AS geofence_name
       FROM attendance a
       LEFT JOIN geofences g ON a.geofence_id = g.id
       ${whereClause}
       ORDER BY a.date DESC, a.check_in_time DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM attendance a ${whereClause}`,
      params.slice(0, paramIdx - 1)
    );

    res.json({
      records: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/attendance/report
 * Get attendance report for all workers (supervisor/admin).
 * Query: ?date=2024-01-15&ward_id=1
 */
exports.getReport = async (req, res, next) => {
  try {
    const { date, ward_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let whereClause = 'WHERE a.date = $1';
    const params = [targetDate];

    if (ward_id) {
      whereClause += ' AND u.ward_id = $2';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT
        u.id AS user_id, u.employee_id, u.name, u.department, u.ward_id,
        a.check_in_time, a.check_out_time,
        a.check_in_within_geofence, a.check_out_within_geofence,
        a.status,
        EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time)) / 3600 AS hours_worked
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
       ${ward_id ? 'WHERE u.ward_id = $2 AND' : 'WHERE'} u.role = 'worker' AND u.is_active = true
       ORDER BY u.name`,
      params
    );

    const totalWorkers = result.rows.length;
    const present = result.rows.filter(r => r.check_in_time != null).length;
    const withinGeofence = result.rows.filter(r => r.check_in_within_geofence === true).length;

    res.json({
      date: targetDate,
      summary: {
        total_workers: totalWorkers,
        present,
        absent: totalWorkers - present,
        attendance_rate: totalWorkers ? ((present / totalWorkers) * 100).toFixed(1) + '%' : '0%',
        geofence_compliance: present ? ((withinGeofence / present) * 100).toFixed(1) + '%' : '0%',
      },
      records: result.rows,
    });
  } catch (err) {
    next(err);
  }
};
