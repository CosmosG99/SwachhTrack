const nodemailer = require('nodemailer');
const config = require('../config/environment');

const lastDigestAt = new Map();
const THROTTLE_MS = parseInt(process.env.ANOMALY_EMAIL_THROTTLE_MS || '', 10) || 10 * 60 * 1000;

function digestAlerts(alerts) {
  const parts = (alerts || []).map((a) => {
    const key = a.worker_id || (Array.isArray(a.workers) ? a.workers.sort().join(',') : '');
    return `${a.type}:${key}`;
  });
  parts.sort();
  return parts.join('|');
}

function formatAlertLine(a) {
  const locStr = (loc) =>
    loc ? ` — https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : '';

  if (a.worker_id && a.location) {
    return `- [${a.type}] Worker ${a.worker_id}: ${a.message}${locStr(a.location)}`;
  }
  if (a.worker_id) {
    return `- [${a.type}] Worker ${a.worker_id}: ${a.message}`;
  }
  if (Array.isArray(a.worker_locations) && a.worker_locations.length) {
    const lines = a.worker_locations
      .map(
        (w) =>
          `    • ${w.worker_id}: ${w.latitude}, ${w.longitude} — https://maps.google.com/?q=${w.latitude},${w.longitude}`
      )
      .join('\n');
    return `- [${a.type}] ${a.message}\n${lines}`;
  }
  return `- [${a.type}] ${a.message}`;
}

/**
 * Sends one email summarizing anomalies (throttled per digest).
 */
async function sendAnomalyAlerts(alerts, meta = {}) {
  const { alertTo, from, transportOpts } = config.email || {};
  if (!alerts?.length || !alertTo?.length) {
    if (!alertTo?.length) {
      console.warn('[email] ANOMALY_ALERT_EMAILS not set; skipping anomaly email.');
    }
    return false;
  }

  const d = digestAlerts(alerts);
  const now = Date.now();
  const prev = lastDigestAt.get(d);
  if (prev && now - prev < THROTTLE_MS) {
    return false;
  }
  lastDigestAt.set(d, now);

  if (!transportOpts) {
    console.warn('[email] SMTP not configured; skipping anomaly email.');
    return false;
  }

  const transporter = nodemailer.createTransport(transportOpts);
  const subject = `[SwachhTrack] Worker behaviour alert${meta.wardId != null ? ` (ward ${meta.wardId})` : ''}`;
  const text = [
    'The anomaly pipeline reported the following:',
    '',
    ...alerts.map(formatAlertLine),
    '',
    '— SwachhTrack',
  ].join('\n');

  await transporter.sendMail({
    from,
    to: alertTo.join(', '),
    subject,
    text,
  });

  return true;
}

module.exports = { sendAnomalyAlerts, digestAlerts };
