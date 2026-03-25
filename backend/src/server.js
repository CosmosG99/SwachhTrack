const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/environment');
const { initializeSocket } = require('./socket/trackingSocket');

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible to routes (for broadcasting from REST endpoints)
app.set('io', io);

// Set up socket event handlers
initializeSocket(io);

// Start server
server.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║          SwachhTrack Backend API             ║
  ╠══════════════════════════════════════════════╣
  ║  🚀 Server:   http://localhost:${config.port}        ║
  ║  📡 Socket:   ws://localhost:${config.port}          ║
  ║  🌍 Env:      ${config.nodeEnv.padEnd(28)}║
  ╚══════════════════════════════════════════════╝

  API Endpoints:
    POST   /api/v1/auth/login
    POST   /api/v1/auth/register
    GET    /api/v1/auth/me

    POST   /api/v1/attendance/qr/generate
    POST   /api/v1/attendance/check-in
    POST   /api/v1/attendance/check-out
    GET    /api/v1/attendance/today
    GET    /api/v1/attendance/history
    GET    /api/v1/attendance/report

    POST   /api/v1/tracking/location
    GET    /api/v1/tracking/live
    GET    /api/v1/tracking/live/:userId
    GET    /api/v1/tracking/trail/:userId

    POST   /api/v1/anomaly/analyze

    POST   /api/v1/geofences
    GET    /api/v1/geofences
    GET    /api/v1/geofences/:id
    PUT    /api/v1/geofences/:id
    DELETE /api/v1/geofences/:id
    POST   /api/v1/geofences/check
  `);
});

module.exports = server;
