const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const trackingRoutes = require('./routes/tracking.routes');
const geofenceRoutes = require('./routes/geofence.routes');

const app = express();

// ─── MIDDLEWARE ──────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HEALTH CHECK ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'SwachhTrack API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── API ROUTES ─────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/geofences', geofenceRoutes);

// ─── 404 HANDLER ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── ERROR HANDLER ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
