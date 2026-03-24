/**
 * Geo-spatial utility functions.
 */

/**
 * Validates latitude and longitude values.
 */
function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Haversine distance between two GPS points (in meters).
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detects impossible movement (teleportation / GPS spoofing).
 * Returns true if suspicious.
 */
function detectTeleportation(prevLat, prevLng, currLat, currLng, timeDiffSeconds) {
  if (timeDiffSeconds <= 0) return false;
  const distance = haversineDistance(prevLat, prevLng, currLat, currLng);
  const speed = distance / timeDiffSeconds; // m/s
  const MAX_SPEED = 50; // ~180 km/h — anything faster is suspicious
  return speed > MAX_SPEED;
}

module.exports = { isValidCoordinate, haversineDistance, detectTeleportation };
