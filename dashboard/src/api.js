// SwachhTrack API Utility Layer
// Centralized helper for all authenticated API calls

const BASE_URL = 'https://swachhtrack-4gnt.onrender.com/api/v1';

// --- Token Management ---
export function getToken() {
  return localStorage.getItem('swachhtrack_token');
}

export function setToken(token) {
  localStorage.setItem('swachhtrack_token', token);
}

export function clearToken() {
  localStorage.removeItem('swachhtrack_token');
  localStorage.removeItem('swachhtrack_user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('swachhtrack_user'));
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem('swachhtrack_user', JSON.stringify(user));
}

// --- Authenticated Fetch Wrapper ---
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token
  if (response.status === 401) {
    clearToken();
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// --- Auth endpoints ---
export async function loginUser(employee_id, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ employee_id, password }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function registerWorker(workerData) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(workerData),
  });
}

// --- Dashboard endpoints ---
export async function fetchOverview() {
  return apiFetch('/dashboard/overview');
}

export async function fetchAttendanceTrends(days = 7) {
  return apiFetch(`/dashboard/attendance-trends?days=${days}`);
}

export async function fetchTaskAnalytics(groupBy = 'type') {
  return apiFetch(`/dashboard/task-analytics?group_by=${groupBy}`);
}

export async function fetchWorkerPerformance(limit = 20) {
  return apiFetch(`/dashboard/worker-performance?limit=${limit}`);
}

export async function fetchHeatmap() {
  return apiFetch('/dashboard/heatmap');
}

export async function fetchRecentActivity(limit = 15) {
  return apiFetch(`/dashboard/recent-activity?limit=${limit}`);
}

export async function fetchAttendanceReport(date) {
  const d = date || new Date().toISOString().split('T')[0];
  return apiFetch(`/attendance/report?date=${d}`);
}

// --- Geofence + QR endpoints ---
export async function fetchGeofences() {
  return apiFetch('/geofences');
}

export async function generateQrCode(geofenceId) {
  return apiFetch('/attendance/qr/generate', {
    method: 'POST',
    body: JSON.stringify({ geofence_id: geofenceId }),
  });
}

// --- Tracking endpoint ---
export async function fetchLiveLocations() {
  return apiFetch('/tracking/live');
}
