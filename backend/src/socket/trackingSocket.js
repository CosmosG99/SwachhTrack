const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const db = require('../config/database');

/**
 * Initialize Socket.IO for real-time location tracking.
 */
function initializeSocket(io) {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const result = await db.query(
        'SELECT id, employee_id, name, role, ward_id FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 ${user.name} (${user.employee_id}) connected [${user.role}]`);

    // Workers join their ward room
    if (user.ward_id) {
      socket.join(`ward:${user.ward_id}`);
    }
    socket.join('ward:all');

    // Supervisors/Admins can subscribe to specific wards
    if (user.role === 'supervisor' || user.role === 'admin') {
      socket.on('subscribe:ward', (wardId) => {
        socket.join(`ward:${wardId}`);
        console.log(`📡 ${user.name} subscribed to ward:${wardId}`);
      });
    }

    // Workers emit live location updates
    socket.on('location:update', async (data) => {
      try {
        const { latitude, longitude, accuracy, speed, battery_level } = data;

        // Store in database
        await db.query(
          `INSERT INTO location_logs
            (user_id, latitude, longitude, location, accuracy_meters, speed, battery_level, is_moving, recorded_at)
           VALUES ($1, $2, $3,
             ST_SetSRID(ST_MakePoint($4, $2), 4326)::geography,
             $5, $6, $7, $8, NOW())`,
          [user.id, latitude, longitude, longitude, accuracy, speed, battery_level, speed > 0.5]
        );

        // Broadcast to supervisors in the same ward
        const payload = {
          user_id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          latitude,
          longitude,
          accuracy,
          speed,
          battery_level,
          recorded_at: new Date().toISOString(),
        };

        socket.to(`ward:${user.ward_id || 'all'}`).emit('worker:location', payload);
        socket.to('ward:all').emit('worker:location', payload);
      } catch (err) {
        console.error('Socket location update error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 ${user.name} disconnected`);
    });
  });

  console.log('✅ Socket.IO initialized for real-time tracking');
}

module.exports = { initializeSocket };
