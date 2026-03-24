const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config/environment');

/**
 * Generates a signed QR payload for an attendance site.
 * The QR encodes a JSON string: { siteId, geofenceId, timestamp, signature }
 */
function createQrPayload(siteId, geofenceId) {
  const timestamp = Date.now();
  const data = `${siteId}:${geofenceId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', config.qr.secret)
    .update(data)
    .digest('hex');

  return JSON.stringify({ siteId, geofenceId, timestamp, signature });
}

/**
 * Verifies a scanned QR payload signature.
 * Returns the parsed payload if valid, null otherwise.
 * QR codes are valid for 12 hours.
 */
function verifyQrPayload(payloadString) {
  try {
    const payload = JSON.parse(payloadString);
    const { siteId, geofenceId, timestamp, signature } = payload;

    // Check age (valid for 12 hours)
    const MAX_AGE_MS = 12 * 60 * 60 * 1000;
    if (Date.now() - timestamp > MAX_AGE_MS) {
      return null;
    }

    // Verify signature
    const data = `${siteId}:${geofenceId}:${timestamp}`;
    const expectedSig = crypto
      .createHmac('sha256', config.qr.secret)
      .update(data)
      .digest('hex');

    if (signature !== expectedSig) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates a QR code as a data URL (base64 PNG image).
 */
async function generateQrImage(payload) {
  return QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

module.exports = { createQrPayload, verifyQrPayload, generateQrImage };
