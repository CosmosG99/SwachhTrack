const db = require('../config/database');
const { isValidCoordinate } = require('../utils/geoUtils');

/**
 * POST /api/v1/geofences
 * Create a new geofence.
 * Body: { name, type, latitude, longitude, radius_meters, ward_id }
 */
exports.create = async (req, res, next) => {
  try {
    const { name, type, latitude, longitude, radius_meters, ward_id } = req.body;

    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude, and longitude are required.' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid GPS coordinates.' });
    }

    const validTypes = ['office', 'ward', 'route_point', 'task_site'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const result = await db.query(
      `INSERT INTO geofences (name, type, latitude, longitude, center, radius_meters, ward_id, created_by)
       VALUES ($1, $2, $3, $4,
         ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
         $5, $6, $7)
       RETURNING id, name, type, latitude, longitude, radius_meters, ward_id, is_active, created_at`,
      [name, type || 'office', latitude, longitude, radius_meters || 100, ward_id || null, req.user.id]
    );

    res.status(201).json({
      message: 'Geofence created successfully.',
      geofence: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/geofences
 * List all geofences.
 * Query: ?ward_id=1&type=office&active_only=true
 */
exports.list = async (req, res, next) => {
  try {
    const { ward_id, type, active_only } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (ward_id) {
      whereClause += ` AND ward_id = $${idx}`;
      params.push(parseInt(ward_id));
      idx++;
    }
    if (type) {
      whereClause += ` AND type = $${idx}`;
      params.push(type);
      idx++;
    }
    if (active_only === 'true') {
      whereClause += ' AND is_active = true';
    }

    const result = await db.query(
      `SELECT id, name, type, latitude, longitude, radius_meters,
              ward_id, is_active, created_at, updated_at
       FROM geofences
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.json({
      total: result.rows.length,
      geofences: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/geofences/:id
 * Get single geofence details.
 */
exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, latitude, longitude, radius_meters,
              ward_id, is_active, created_by, created_at, updated_at
       FROM geofences WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found.' });
    }

    res.json({ geofence: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/geofences/:id
 * Update a geofence.
 */
exports.update = async (req, res, next) => {
  try {
    const { name, type, latitude, longitude, radius_meters, ward_id, is_active } = req.body;

    // Check exists
    const existing = await db.query('SELECT id FROM geofences WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found.' });
    }

    if (latitude != null && longitude != null && !isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid GPS coordinates.' });
    }

    const result = await db.query(
      `UPDATE geofences SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        latitude = COALESCE($3, latitude),
        longitude = COALESCE($4, longitude),
        center = CASE WHEN $3 IS NOT NULL AND $4 IS NOT NULL
          THEN ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
          ELSE center END,
        radius_meters = COALESCE($5, radius_meters),
        ward_id = COALESCE($6, ward_id),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, type, latitude, longitude, radius_meters, ward_id, is_active, updated_at`,
      [name, type, latitude, longitude, radius_meters, ward_id, is_active, req.params.id]
    );

    res.json({
      message: 'Geofence updated successfully.',
      geofence: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/geofences/:id
 * Soft-delete a geofence (set is_active = false).
 */
exports.remove = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE geofences SET is_active = false, updated_at = NOW()
       WHERE id = $1 RETURNING id, name`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Geofence not found.' });
    }

    res.json({ message: `Geofence "${result.rows[0].name}" deactivated.` });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/geofences/check
 * Check if a GPS point is inside any geofence.
 * Body: { latitude, longitude, geofence_id? }
 */
exports.checkContainment = async (req, res, next) => {
  try {
    const { latitude, longitude, geofence_id } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid GPS coordinates.' });
    }

    let query, params;

    if (geofence_id) {
      // Check specific geofence
      query = `
        SELECT id, name, type, radius_meters,
          ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            radius_meters
          ) AS is_within,
          ST_Distance(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_meters
        FROM geofences
        WHERE id = $3 AND is_active = true`;
      params = [longitude, latitude, geofence_id];
    } else {
      // Check all active geofences
      query = `
        SELECT id, name, type, radius_meters,
          ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            radius_meters
          ) AS is_within,
          ST_Distance(
            center,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_meters
        FROM geofences
        WHERE is_active = true
        ORDER BY distance_meters ASC`;
      params = [longitude, latitude];
    }

    const result = await db.query(query, params);

    const inside = result.rows.filter(r => r.is_within);
    const nearest = result.rows[0] || null;

    res.json({
      point: { latitude, longitude },
      is_inside_any: inside.length > 0,
      inside_geofences: inside.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        distance_meters: Math.round(g.distance_meters),
      })),
      nearest_geofence: nearest ? {
        id: nearest.id,
        name: nearest.name,
        type: nearest.type,
        distance_meters: Math.round(nearest.distance_meters),
        is_within: nearest.is_within,
      } : null,
    });
  } catch (err) {
    next(err);
  }
};
