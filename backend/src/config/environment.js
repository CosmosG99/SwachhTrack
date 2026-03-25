require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'swachhtrack',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  qr: {
    secret: process.env.QR_SECRET || 'qr-fallback-secret',
  },

  email: (() => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const alertTo = (process.env.ANOMALY_ALERT_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const from = process.env.ALERT_EMAIL_FROM || user || 'noreply@swachhtrack.local';

    if (!host || !user || !pass) {
      return { alertTo, from, transportOpts: null };
    }

    return {
      alertTo,
      from,
      transportOpts: {
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      },
    };
  })(),
};
