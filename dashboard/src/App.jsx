import React, { useState, useEffect } from 'react';
import {
  Activity, Users, UserCheck, ClipboardList, CheckCircle2,
  MapPin, MoreVertical, TrendingUp, X, QrCode, LogOut, UserPlus,
  AlertTriangle, Download
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Login from './Login';
import translations from './i18n';
import { exportAttendancePDF, exportPerformancePDF } from './pdfExport';
import {
  getToken, getStoredUser, clearToken, setStoredUser,
  fetchOverview, fetchAttendanceTrends, fetchTaskAnalytics,
  fetchWorkerPerformance, fetchLiveLocations,
  fetchGeofences, generateQrCode, registerWorker,
  fetchAttendanceReport, fetchRecentActivity, fetchHeatmap,
  apiFetch, createTask, fetchTasks, reviewTask
} from './api';

const customPinIcon = new L.DivIcon({
  className: 'custom-map-pin',
  html: '<div class="map-pin" style="position: relative; top: -8px; left: -8px;"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const FALLBACK = {
  overview: { total_workers: 0, present_today: 0, tasks: { pending: 0, completed: 0 } },
  trends: [],
  taskAnalytics: [],
  workers: [],
  liveLocations: [],
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('swachhtrack_lang') || 'en');

  // Dashboard data states
  const [overview, setOverview] = useState(FALLBACK.overview);
  const [trends, setTrends] = useState(FALLBACK.trends);
  const [taskAnalytics, setTaskAnalytics] = useState(FALLBACK.taskAnalytics);
  const [workers, setWorkers] = useState(FALLBACK.workers);
  const [liveLocations, setLiveLocations] = useState(FALLBACK.liveLocations);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  // QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrGeofences, setQrGeofences] = useState([]);
  const [selectedGeofence, setSelectedGeofence] = useState('');
  const [generatedQr, setGeneratedQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');

  // Register Worker Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regForm, setRegForm] = useState({ employee_id: '', name: '', email: '', phone: '', password: '', role: 'worker', department: '', ward_id: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState({ type: '', text: '' });

  // Assign Task Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ title: '', description: '', type: 'sweeping', priority: 'medium', assigned_to: '', due_date: '', latitude: '', longitude: '' });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState({ type: '', text: '' });

  // Review Modal
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTaskItem, setReviewTaskItem] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });

  const t = translations[lang];

  // --- Session persistence: verify token on mount ---
  useEffect(() => {
    const verifySession = async () => {
      const token = getToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const data = await apiFetch('/auth/me');
        const user = data.user;
        setCurrentUser(user);
        setStoredUser(user);
        setIsAuthenticated(true);
      } catch {
        clearToken();
      } finally {
        setAuthChecking(false);
      }
    };
    verifySession();
  }, []);

  // Persist language choice
  useEffect(() => {
    localStorage.setItem('swachhtrack_lang', lang);
  }, [lang]);

  // Load dashboard data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    loadDashboard();
  }, [isAuthenticated]);

  const loadDashboard = async () => {
    setDashLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchOverview(),
        fetchAttendanceTrends(7),
        fetchTaskAnalytics('type'),
        fetchWorkerPerformance(20),
        fetchLiveLocations(),
        fetchAttendanceReport(),
        fetchRecentActivity(15),
        fetchHeatmap(),
        fetchTasks('limit=10000'),
      ]);

      if (results[0].status === 'fulfilled') setOverview(results[0].value.overview);
      if (results[1].status === 'fulfilled') setTrends(results[1].value.trends || []);
      if (results[2].status === 'fulfilled') setTaskAnalytics(results[2].value.analytics || []);
      if (results[3].status === 'fulfilled') setWorkers(results[3].value.workers || []);
      if (results[4].status === 'fulfilled') {
        const locs = results[4].value.locations || results[4].value.data || [];
        setLiveLocations(locs);
      }
      if (results[5].status === 'fulfilled') setAttendanceReport(results[5].value);
      if (results[6].status === 'fulfilled') setRecentActivity(results[6].value.activities || []);
      if (results[7].status === 'fulfilled') setHeatmapData(results[7].value.heatmap || []);
      if (results[8] && results[8].status === 'fulfilled') {
        const tasks = results[8].value.tasks || [];
        setAllTasks(tasks);
        setPendingReviews(tasks.filter(t => t.status === 'completed'));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setDashLoading(false);
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // QR Code Handlers
  const handleOpenQrModal = async () => {
    setIsQrModalOpen(true);
    setQrError('');
    setQrLoading(true);
    setGeneratedQr(null);
    try {
      const data = await fetchGeofences();
      const list = data.geofences || data.data || [];
      setQrGeofences(list);
      if (list.length > 0) setSelectedGeofence(list[0].id);
    } catch (err) {
      setQrError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleGenerateQr = async (e) => {
    e.preventDefault();
    if (!selectedGeofence) return setQrError(t.pleaseSelect);
    setQrError('');
    setQrLoading(true);
    try {
      const data = await generateQrCode(selectedGeofence);
      setGeneratedQr(data.qr_image);
    } catch (err) {
      setQrError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Register Worker Handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegMsg({ type: '', text: '' });
    try {
      const payload = { ...regForm };
      if (payload.ward_id) payload.ward_id = parseInt(payload.ward_id);
      else delete payload.ward_id;
      if (!payload.email) delete payload.email;
      if (!payload.department) delete payload.department;

      await registerWorker(payload);
      setRegMsg({ type: 'success', text: t.regSuccess });
      setRegForm({ employee_id: '', name: '', email: '', phone: '', password: '', role: 'worker', department: '', ward_id: '' });
      loadDashboard();
    } catch (err) {
      setRegMsg({ type: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  };

  // Assign Task Handler
  const handleAssignTask = async (e) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignMsg({ type: '', text: '' });
    try {
      const payload = { ...assignForm };
      payload.assigned_by = currentUser?.id || null;
      if (!payload.latitude) delete payload.latitude;
      if (!payload.longitude) delete payload.longitude;
      if (payload.latitude) payload.latitude = parseFloat(payload.latitude);
      if (payload.longitude) payload.longitude = parseFloat(payload.longitude);
      if (!payload.due_date) delete payload.due_date;

      await createTask(payload);
      setAssignMsg({ type: 'success', text: 'Task successfully assigned!' });
      setAssignForm({ title: '', description: '', type: 'sweeping', priority: 'medium', assigned_to: '', due_date: '', latitude: '', longitude: '' });
      loadDashboard();
    } catch (err) {
      setAssignMsg({ type: 'error', text: err.message });
    } finally {
      setAssignLoading(false);
    }
  };

  // Review Task Handler
  const handleReviewSubmit = async (decision) => {
    setReviewLoading(true);
    setReviewMsg({ type: '', text: '' });
    try {
      await reviewTask(reviewTaskItem.id, decision, reviewComment);
      setReviewMsg({ type: 'success', text: `Task successfully ${decision}!` });
      setTimeout(() => {
        setIsReviewOpen(false);
        setReviewMsg({ type: '', text: '' });
        loadDashboard(); // reload tasks
      }, 1500);
    } catch (error) {
      setReviewMsg({ type: 'error', text: error.message });
      setReviewLoading(false);
    }
  };

  // Show loading spinner while checking session
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <Activity size={28} style={{ animation: 'pulse-pin 1.5s infinite', marginRight: '0.75rem' }} /> Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) return <Login onLogin={handleLogin} lang={lang} onChangeLang={setLang} />;

  // Build chart data
  const pieData = taskAnalytics.length > 0
    ? taskAnalytics.map((item, i) => ({
      name: item.type || item.label || 'Other',
      value: item.total || 0,
      color: ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'][i % 5]
    }))
    : [{ name: t.noData, value: 1, color: '#3f3f46' }];

  const dailyData = trends.map(item => ({
    day: typeof item.date === 'string' ? item.date.slice(5) : item.date,
    [t.presentToday]: item.present || 0,
  }));

  const completionData = trends.map(item => ({
    date: typeof item.date === 'string' ? item.date.slice(5) : item.date,
    [t.present]: item.present || 0,
    [t.absent]: item.absent || 0,
  }));

  const mapMarkers = liveLocations.length > 0
    ? liveLocations.map(loc => ({
      id: loc.user_id || loc.id,
      name: loc.name || 'Worker',
      lat: parseFloat(loc.latitude || loc.lat),
      lng: parseFloat(loc.longitude || loc.lng),
      status: 'Active',
      loc: loc.geofence_name || 'Tracking',
    }))
    : [];

  return (
    <div className="dashboard-container">
      {/* QR MODAL */}
      {isQrModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {t.qrTitle}
              <X style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsQrModalOpen(false)} />
            </h2>
            {qrError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{qrError}</div>}
            {!generatedQr ? (
              <form onSubmit={handleGenerateQr}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>{t.selectSite}</label>
                  {qrLoading ? <p style={{ color: 'var(--text-secondary)' }}>{t.loadingSites}</p> : (
                    <select value={selectedGeofence} onChange={(e) => setSelectedGeofence(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#18181b', color: 'white', border: '1px solid #27272a' }}>
                      <option value="" disabled>{t.selectGeofence}</option>
                      {qrGeofences.map(gf => <option key={gf.id} value={gf.id}>{gf.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" onClick={() => setIsQrModalOpen(false)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.65rem 1.25rem' }}>{t.cancel}</button>
                  <button type="submit" className="btn-primary" disabled={qrLoading || !selectedGeofence} style={{ padding: '0.65rem 1.5rem' }}>{qrLoading ? t.generating : t.generate}</button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                  <img src={generatedQr} alt="QR Code" style={{ width: '250px', height: '250px', display: 'block' }} />
                </div>
                <div className="modal-actions" style={{ justifyContent: 'center', display: 'flex' }}>
                  <button onClick={() => setIsQrModalOpen(false)} className="btn-primary" style={{ padding: '0.65rem 2rem' }}>{t.done}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REGISTER WORKER MODAL */}
      {isRegisterOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><UserPlus size={22} /> {t.regTitle}</span>
              <X style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setIsRegisterOpen(false); setRegMsg({ type: '', text: '' }); }} />
            </h2>

            {regMsg.text && (
              <div style={{ background: regMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: regMsg.type === 'error' ? '#ef4444' : '#34d399', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', border: `1px solid ${regMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                {regMsg.text}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>{t.employeeId} *</label>
                  <input value={regForm.employee_id} onChange={e => setRegForm({ ...regForm, employee_id: e.target.value })} placeholder="e.g. WRK002" required />
                </div>
                <div className="form-group">
                  <label>{t.fullName} *</label>
                  <input value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} placeholder="e.g. Ramesh Kumar" required />
                </div>
                <div className="form-group">
                  <label>{t.email}</label>
                  <input type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} placeholder="optional" />
                </div>
                <div className="form-group">
                  <label>{t.phone} *</label>
                  <input value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} placeholder="e.g. 9876543210" required />
                </div>
                <div className="form-group">
                  <label>{t.password} *</label>
                  <input type="password" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} placeholder="Min 6 characters" required />
                </div>
                <div className="form-group">
                  <label>{t.role}</label>
                  <select value={regForm.role} onChange={e => setRegForm({ ...regForm, role: e.target.value })}>
                    <option value="worker">{t.roleWorker}</option>
                    <option value="supervisor">{t.roleSupervisor}</option>
                    <option value="admin">{t.roleAdmin}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t.deptLabel}</label>
                  <select value={regForm.department} onChange={e => setRegForm({ ...regForm, department: e.target.value })}>
                    <option value="">{t.selectDept}</option>
                    <option value="Waste Collection">{t.deptWaste}</option>
                    <option value="Sweeping">{t.deptSweep}</option>
                    <option value="Drain Cleaning">{t.deptDrain}</option>
                    <option value="Road Repair">{t.deptRoad}</option>
                    <option value="Water Supply">{t.deptWater}</option>
                    <option value="Supervision">{t.deptSuper}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t.wardId}</label>
                  <input type="number" value={regForm.ward_id} onChange={e => setRegForm({ ...regForm, ward_id: e.target.value })} placeholder="e.g. 1" />
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setIsRegisterOpen(false); setRegMsg({ type: '', text: '' }); }} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.65rem 1.25rem' }}>{t.cancel}</button>
                <button type="submit" className="btn-primary" disabled={regLoading} style={{ padding: '0.65rem 1.5rem' }}>{regLoading ? t.registering : t.registerBtn}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TASK MODAL */}
      {isAssignOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClipboardList size={22} /> Assign Task</span>
              <X style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => { setIsAssignOpen(false); setAssignMsg({ type: '', text: '' }); }} />
            </h2>

            {assignMsg.text && (
              <div style={{ background: assignMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: assignMsg.type === 'error' ? '#ef4444' : '#34d399', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', border: `1px solid ${assignMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                {assignMsg.text}
              </div>
            )}

            <form onSubmit={handleAssignTask}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={assignForm.title} onChange={e => setAssignForm({ ...assignForm, title: e.target.value })} placeholder="e.g. Clean main street" required />
                </div>
                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Type *</label>
                      <select value={assignForm.type} onChange={e => setAssignForm({ ...assignForm, type: e.target.value })}>
                        <option value="sweeping">Sweeping</option>
                        <option value="waste_collection">Waste Collection</option>
                        <option value="drainage">Drain Cleaning</option>
                        <option value="road_repair">Road Repair</option>
                        <option value="inspection">Inspection</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label>Priority *</label>
                      <select value={assignForm.priority} onChange={e => setAssignForm({ ...assignForm, priority: e.target.value })}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                </div>
                <div className="form-group">
                  <label>Assign To (Worker) *</label>
                  <select value={assignForm.assigned_to} onChange={e => setAssignForm({ ...assignForm, assigned_to: e.target.value })} required>
                    <option value="" disabled>Select a worker</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.employee_id})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={assignForm.due_date} onChange={e => setAssignForm({ ...assignForm, due_date: e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Latitude (optional)</label>
                    <input type="number" step="any" value={assignForm.latitude} onChange={e => setAssignForm({ ...assignForm, latitude: e.target.value })} placeholder="15.89" />
                  </div>
                  <div>
                    <label>Longitude (optional)</label>
                    <input type="number" step="any" value={assignForm.longitude} onChange={e => setAssignForm({ ...assignForm, longitude: e.target.value })} placeholder="73.81" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={assignForm.description} onChange={e => setAssignForm({ ...assignForm, description: e.target.value })} placeholder="Task Details..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#18181b', color: 'white', border: '1px solid #27272a' }} rows={3}></textarea>
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setIsAssignOpen(false); setAssignMsg({ type: '', text: '' }); }} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.65rem 1.25rem' }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={assignLoading} style={{ padding: '0.65rem 1.5rem' }}>{assignLoading ? 'Assigning...' : 'Assign Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW TASK MODAL */}
      {isReviewOpen && reviewTaskItem && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={22} /> Review Task Completion</span>
              <X style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsReviewOpen(false)} />
            </h2>
            
            {reviewMsg.text && (
              <div style={{ background: reviewMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: reviewMsg.type === 'error' ? '#ef4444' : '#34d399', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', border: `1px solid ${reviewMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
                {reviewMsg.text}
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Title:</strong> {reviewTaskItem.title}</div>
              <div style={{ marginBottom: '0.5rem' }}><strong>Worker:</strong> {reviewTaskItem.worker_name} ({reviewTaskItem.worker_employee_id})</div>
              <div style={{ marginBottom: '0.5rem' }}><strong>Notes:</strong> {reviewTaskItem.proof_notes || 'None'}</div>
              {reviewTaskItem.proof_latitude && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Location recorded:</strong> {reviewTaskItem.proof_latitude}, {reviewTaskItem.proof_longitude} 
                  <a href={`https://www.google.com/maps?q=${reviewTaskItem.proof_latitude},${reviewTaskItem.proof_longitude}`} target="_blank" style={{ color: '#60a5fa', marginLeft: '0.5rem' }} rel="noreferrer">Open Map📍</a>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              {reviewTaskItem.proof_image ? (
                <img 
                  src={reviewTaskItem.proof_image.startsWith('data:') ? reviewTaskItem.proof_image : `data:image/jpeg;base64,${reviewTaskItem.proof_image}`} 
                  alt="Proof" 
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '0.5rem', border: '1px solid #3f3f46' }} 
                />
              ) : (
                <div style={{ padding: '3rem', border: '1px dashed #3f3f46', borderRadius: '0.5rem', color: 'var(--text-secondary)' }}>No proof image provided</div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Supervisor Comments (Optional)</label>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Provide feedback to the worker..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: '#18181b', color: 'white', border: '1px solid #27272a' }} rows={2}></textarea>
            </div>

            {!reviewMsg.text || reviewMsg.type === 'error' ? (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => handleReviewSubmit('rejected')} 
                  disabled={reviewLoading}
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', cursor: reviewLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {reviewLoading ? 'Processing...' : 'Reject & Restart ❌'}
                </button>
                <button 
                  onClick={() => handleReviewSubmit('accepted')} 
                  disabled={reviewLoading}
                  style={{ flex: 1, padding: '0.75rem', background: '#34d399', color: '#000', border: 'none', borderRadius: '0.5rem', cursor: reviewLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {reviewLoading ? 'Processing...' : 'Accept Task ✅'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-neon)', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px var(--accent-glow)' }}>
            <Activity color="white" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>{t.dashTitle}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              {t.welcome} {currentUser?.name || 'Admin'} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>({currentUser?.role})</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', outline: 'none' }}>
            <option value="en" style={{ color: 'black' }}>English</option>
            <option value="mr" style={{ color: 'black' }}>मराठी</option>
          </select>
          <button onClick={handleOpenQrModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
            <QrCode size={18} /> {t.genQR}
          </button>
          <button className="btn-primary" onClick={() => setIsAssignOpen(true)} style={{ background: '#60a5fa', color: '#000' }}>
            <ClipboardList size={18} /> Assign Task
          </button>
          <button className="btn-primary" onClick={() => setIsRegisterOpen(true)}>
            <UserPlus size={18} /> {t.registerWorker}
          </button>
          <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.6rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
            <LogOut size={18} /> {t.signOut}
          </button>
        </div>
      </header>

      {dashLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          <Activity size={24} style={{ animation: 'pulse-pin 1.5s infinite', marginRight: '0.75rem' }} /> {t.loading}
        </div>
      ) : (
        <>
          {/* TOP STATS */}
          <div className="top-stats-grid">
            {[
              { label: t.totalWorkers, val: overview.total_workers, icon: <Users size={24} color="#a78bfa" />, glow: 'rgba(167,139,250,0.2)' },
              { label: t.presentToday, val: overview.present_today, icon: <UserCheck size={24} color="#34d399" />, glow: 'rgba(52,211,153,0.2)' },
              { label: t.pendingTasks, val: allTasks.filter(x => ['not_started', 'in_progress'].includes(x.status)).length, icon: <ClipboardList size={24} color="#fbbf24" />, glow: 'rgba(251,191,36,0.2)' },
              { label: t.completedTasks, val: allTasks.filter(x => ['completed', 'accepted'].includes(x.status)).length, icon: <CheckCircle2 size={24} color="#60a5fa" />, glow: 'rgba(96,165,250,0.2)' },
            ].map((m, i) => (
              <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{m.label}</p>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0 }}>{m.val}</h2>
                </div>
                <div style={{ background: m.glow, padding: '1rem', borderRadius: '50%' }}>{m.icon}</div>
              </div>
            ))}
          </div>

          {/* MAIN GRID */}
          <div className="main-content-grid">
            {/* MAP */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={20} color="var(--accent-light)" /> {t.liveTracking}</h3>
                <p className="section-subtitle">{mapMarkers.length > 0 ? `${mapMarkers.length} ${t.activeOnMap}` : t.noLiveData}</p>
              </div>
              <div style={{ flex: 1, minHeight: '450px', borderRadius: '1rem', overflow: 'hidden' }}>
                <MapContainer center={[15.894238, 73.818228]} zoom={14} style={{ height: '100%', width: '100%', background: 'var(--bg-card)' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                  {mapMarkers.map((w, i) => (
                    <Marker key={w.id || i} position={[w.lat, w.lng]} icon={customPinIcon}>
                      <Popup>
                        <div style={{ padding: '0.25rem' }}>
                          <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.25rem', color: 'white' }}>{w.name}</strong>
                          <span className="status-pill status-active">{t.active}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-neon)' }}></div> {t.active}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'gray' }}></div> {t.inactive}
                </div>
              </div>
            </div>

            {/* CHARTS COLUMN */}
            <div className="charts-column">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                  <h3 className="section-title">{t.taskDist}</h3>
                  <p className="section-subtitle">{t.byType}</p>
                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                  <h3 className="section-title">{t.attendance7}</h3>
                  <p className="section-subtitle">{t.presentPerDay}</p>
                  <div style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                        <Bar dataKey={t.presentToday} fill="var(--accent-neon)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--status-active)" /> {t.attendanceTrend}</h3>
                <p className="section-subtitle">{t.presentVsAbsent}</p>
                <div style={{ flex: 1, marginTop: '-1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completionData}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--status-active)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--status-active)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey={t.present} stroke="var(--status-active)" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                      <Area type="monotone" dataKey={t.absent} stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorPending)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* WORKER TABLE */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="section-title">{t.workerPerf}</h3>
                <p className="section-subtitle">{t.workerPerfSub}</p>
              </div>
              {workers.length > 0 && (
                <button onClick={() => exportPerformancePDF(workers, lang)} style={{ background: 'rgba(107,78,255,0.15)', border: '1px solid rgba(107,78,255,0.3)', color: '#a78bfa', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.85rem' }}>
                  <Download size={16} /> {lang === 'mr' ? 'PDF डाउनलोड करा' : 'Download PDF'}
                </button>
              )}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t.rank}</th>
                    <th>{t.worker}</th>
                    <th>{t.department}</th>
                    <th>{t.attendance}</th>
                    <th>{t.tasks}</th>
                    <th>{t.completion}</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t.noWorkerData}</td></tr>
                  )}
                  {workers.map((w, i) => (
                    <tr key={w.id || i}>
                      <td>{i === 0 ? '🏆 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `#${i + 1}`}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div className="avatar">{w.name ? w.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{w.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{w.department || '--'}</td>
                      <td>{w.attendance?.days_present || 0} {t.days}</td>
                      <td><span style={{ color: '#34d399', fontWeight: 600 }}>{w.tasks?.completed || 0}</span> / {w.tasks?.assigned || 0}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: w.tasks?.completion_rate || '0%', background: 'var(--accent-neon)' }}></div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{w.tasks?.completion_rate || '0%'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PENDING TASK REVIEWS */}
          <div className="glass-panel">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} color="#34d399" /> Pending Task Reviews
            </h3>
            <p className="section-subtitle">Awaiting supervisor verification</p>
            {pendingReviews.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No tasks pending review.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Worker</th>
                      <th>Completed At</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReviews.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.title}</td>
                        <td>{t.worker_name} <br/><span style={{ fontSize: '0.75rem', color: 'gray' }}>{t.worker_employee_id}</span></td>
                        <td>{new Date(t.completed_at).toLocaleString()}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.proof_notes || '--'}</td>
                        <td>
                          <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => {
                            setReviewTaskItem(t);
                            setReviewComment('');
                            setReviewMsg({ type: '', text: '' });
                            setReviewLoading(false);
                            setIsReviewOpen(true);
                          }}>Review</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ATTENDANCE REPORT */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={20} color="#34d399" /> {t.attendanceReport}
                </h3>
                <p className="section-subtitle">
                  {attendanceReport?.summary
                    ? `${attendanceReport.summary.present} ${t.present} / ${attendanceReport.summary.absent} ${t.absent} — ${attendanceReport.summary.attendance_rate} ${t.rate} — ${attendanceReport.summary.geofence_compliance} ${t.geofenceCompliance}`
                    : t.loadingReport}
                </p>
              </div>
              {attendanceReport?.records?.length > 0 && (
                <button onClick={() => exportAttendancePDF(attendanceReport, lang)} style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.85rem' }}>
                  <Download size={16} /> {lang === 'mr' ? 'PDF डाउनलोड करा' : 'Download PDF'}
                </button>
              )}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t.worker}</th>
                    <th>{t.employeeIdCol}</th>
                    <th>{t.department}</th>
                    <th>{t.checkIn}</th>
                    <th>{t.checkOut}</th>
                    <th>{t.geofence}</th>
                    <th>{t.hours}</th>
                  </tr>
                </thead>
                <tbody>
                  {(!attendanceReport?.records || attendanceReport.records.length === 0) && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t.noAttendance}</td></tr>
                  )}
                  {attendanceReport?.records?.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.employee_id}</td>
                      <td>{r.department || '--'}</td>
                      <td>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : <span style={{ color: '#ef4444' }}>{t.absentLabel}</span>}</td>
                      <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '--'}</td>
                      <td>{r.check_in_within_geofence ? <span style={{ color: '#34d399' }}>✅ {t.yes}</span> : <span style={{ color: '#fbbf24' }}>❌ {t.no}</span>}</td>
                      <td>{r.hours_worked ? `${parseFloat(r.hours_worked).toFixed(1)}h` : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RECENT ACTIVITY FEED */}
          <div className="glass-panel">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#a78bfa" /> {t.recentActivity}
            </h3>
            <p className="section-subtitle">{t.recentSub}</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recentActivity.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t.noActivity}</p>
              )}
              {recentActivity.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: act.type === 'attendance' ? 'rgba(52,211,153,0.15)' : act.type === 'task' ? 'rgba(96,165,250,0.15)' : 'rgba(239,68,68,0.15)' }}>
                    {act.type === 'attendance' ? <UserCheck size={16} color="#34d399" /> : act.type === 'task' ? <ClipboardList size={16} color="#60a5fa" /> : <AlertTriangle size={16} color="#ef4444" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      {act.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({act.employee_id})</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {act.type === 'attendance' && (act.action === 'checked_in' ? `✅ ${t.checkedIn}` : `🔄 ${t.checkedOut}`)}
                      {act.type === 'task' && `📋 ${t.taskLabel} ${act.details?.title || act.action} [${act.details?.priority || ''}]`}
                      {act.type === 'anomaly' && `⚠️ ${act.action}: ${act.details?.description || ''}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HEATMAP */}
          <div className="glass-panel">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="#f472b6" /> {t.heatmap}
            </h3>
            <p className="section-subtitle">{heatmapData.length} {t.gpsPoints}</p>
            {heatmapData.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{t.noGps}</p>
            ) : (
              <div style={{ borderRadius: '1rem', overflow: 'hidden', height: '350px' }}>
                <MapContainer center={[15.894238, 73.818228]} zoom={14} style={{ height: '100%', width: '100%', background: 'var(--bg-card)' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
                  {heatmapData.map((pt, i) => (
                    <Marker key={i} position={[pt.lat, pt.lng]} icon={new L.DivIcon({
                      className: 'heatmap-dot',
                      html: `<div style="width:${Math.min(8 + pt.intensity * 2, 24)}px;height:${Math.min(8 + pt.intensity * 2, 24)}px;border-radius:50%;background:rgba(244,114,182,${Math.min(0.3 + pt.intensity * 0.1, 0.9)});box-shadow:0 0 ${pt.intensity * 3}px rgba(244,114,182,0.5);position:relative;top:-4px;left:-4px;"></div>`,
                      iconSize: [24, 24], iconAnchor: [12, 12]
                    })}>
                      <Popup><strong>{t.intensity}</strong> {pt.intensity} {t.pings}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
