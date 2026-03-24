import React, { useState } from 'react';
import {
  Activity, Plus, Users, UserCheck, ClipboardList, CheckCircle2,
  MapPin, MoreVertical, TrendingUp, X
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

// --- MOCK DATA ---
const topMetrics = [
  { title: "Total Workers", value: "8", icon: <Users size={24} color="#a78bfa" />, glow: "rgba(167, 139, 250, 0.2)" },
  { title: "Active Now", value: "4", icon: <UserCheck size={24} color="#34d399" />, glow: "rgba(52, 211, 153, 0.2)" },
  { title: "Assigned", value: "2", icon: <ClipboardList size={24} color="#fbbf24" />, glow: "rgba(251, 191, 36, 0.2)" },
  { title: "Completed", value: "2", icon: <CheckCircle2 size={24} color="#60a5fa" />, glow: "rgba(96, 165, 250, 0.2)" },
];

const completionData = [
  { week: 'Week 1', completed: 400, pending: 240 },
  { week: 'Week 2', completed: 300, pending: 139 },
  { week: 'Week 3', completed: 200, pending: 980 },
  { week: 'Week 4', completed: 278, pending: 390 },
  { week: 'Week 5', completed: 189, pending: 480 },
  { week: 'Week 6', completed: 239, pending: 380 },
];

const dailyData = [
  { day: 'Mon', tasks: 30 },
  { day: 'Tue', tasks: 35 },
  { day: 'Wed', tasks: 45 },
  { day: 'Thu', tasks: 15 },
  { day: 'Fri', tasks: 10 },
  { day: 'Sat', tasks: 25 },
  { day: 'Sun', tasks: 30 },
];

const pieData = [
  { name: 'Active', value: 4, color: '#34d399' },
  { name: 'Assigned', value: 2, color: '#fbbf24' },
  { name: 'Completed', value: 2, color: '#60a5fa' },
];

const customPinIcon = new L.DivIcon({
  className: 'custom-map-pin',
  html: '<div class="map-pin" style="position: relative; top: -8px; left: -8px;"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const initialWorkers = [
  { id: '128c3726', name: 'David Kim', initials: 'DK', loc: 'Panjim Station', assigned: 'North Goa Hub', status: 'Active', progress: 45, lat: 15.4909, lng: 73.8278 },
  { id: 'e077546d', name: 'Emily Watson', initials: 'EW', loc: 'Margao Gate', assigned: 'South Goa Park', status: 'Assigned', progress: 0, lat: 15.2832, lng: 73.9862 },
  { id: 'ecfd95e0', name: 'Jennifer Liu', initials: 'JL', loc: 'Vasco Airport Road', assigned: 'Logistics Center', status: 'Assigned', progress: 15, lat: 15.3973, lng: 73.8122 },
  { id: '5fd3dcc1', name: 'John Mitchell', initials: 'JM', loc: 'Mapusa Office', assigned: 'Tech Hub District', status: 'Active', progress: 75, lat: 15.5494, lng: 73.7554 },
  { id: '0949875e', name: 'Lisa Anderson', initials: 'LA', loc: 'Ponda Bay', assigned: 'Innovation Center', status: 'Completed', progress: 100, lat: 15.4026, lng: 73.9822 },
  { id: '1dbub8dd', name: 'Marcus Rodriguez', initials: 'MR', loc: 'Anjuna Terminal', assigned: 'Commerce Plaza', status: 'Completed', progress: 100, lat: 15.6026, lng: 73.7386 },
  { id: 'e0eaf966', name: 'Robert Taylor', initials: 'RT', loc: 'Canacona District', assigned: 'Warehouse Zone', status: 'Active', progress: 30, lat: 15.0100, lng: 74.0232 },
  { id: '42e5d5cd', name: 'Sarah Chen', initials: 'SC', loc: 'Benaulim Plaza', assigned: 'Innovation Center', status: 'Active', progress: 60, lat: 15.2343, lng: 73.9317 },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [workersList, setWorkersList] = useState(initialWorkers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: '',
    loc: '',
    assigned: '',
    status: 'Active',
    progress: 0
  });

  const handleAddWorker = (e) => {
    e.preventDefault();
    const newId = Math.random().toString(36).substring(2, 10);
    const initials = newWorker.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'NW';

    // Assign a slightly random location around Goa
    const randomLat = 15.2 + (Math.random() * 0.4);
    const randomLng = 73.7 + (Math.random() * 0.4);

    const workerObj = {
      id: newId,
      name: newWorker.name || 'New Worker',
      initials,
      loc: newWorker.loc || 'Unknown Location',
      assigned: newWorker.assigned || 'Unassigned',
      status: newWorker.status,
      progress: parseInt(newWorker.progress) || 0,
      lat: randomLat,
      lng: randomLng
    };

    setWorkersList([workerObj, ...workersList]);
    setIsModalOpen(false);
    setNewWorker({ name: '', loc: '', assigned: '', status: 'Active', progress: 0 });
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="dashboard-container">
      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Add New Worker
              <X style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsModalOpen(false)} />
            </h2>
            <form onSubmit={handleAddWorker}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  value={newWorker.name}
                  onChange={e => setNewWorker({ ...newWorker, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label>Current Location</label>
                <input
                  value={newWorker.loc}
                  onChange={e => setNewWorker({ ...newWorker, loc: e.target.value })}
                  placeholder="e.g. Panjim Station"
                  required
                />
              </div>
              <div className="form-group">
                <label>Assigned Location</label>
                <input
                  value={newWorker.assigned}
                  onChange={e => setNewWorker({ ...newWorker, assigned: e.target.value })}
                  placeholder="e.g. North Goa Hub"
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={newWorker.status}
                  onChange={e => setNewWorker({ ...newWorker, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Progress (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={newWorker.progress}
                  onChange={e => setNewWorker({ ...newWorker, progress: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.65rem 1.25rem', fontFamily: 'Outfit' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-neon)', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px var(--accent-glow)' }}>
            <Activity color="white" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>SwachhTrack Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Command Center</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Add Worker
        </button>
      </header>

      {/* TOP STATS */}
      <div className="top-stats-grid">
        {topMetrics.map((metric, i) => (
          <div key={i} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{metric.title}</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0 }}>
                {i === 0 ? workersList.length : metric.value}
              </h2>
            </div>
            <div style={{ background: metric.glow, padding: '1rem', borderRadius: '50%' }}>
              {metric.icon}
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="main-content-grid">
        {/* MAP */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={20} color="var(--accent-light)" /> Live Location Tracking</h3>
            <p className="section-subtitle">Real-time worker positions</p>
          </div>
          <div style={{ flex: 1, minHeight: '450px', borderRadius: '1rem', overflow: 'hidden' }}>
            <MapContainer
              center={[15.2993, 73.9240]}
              zoom={10}
              style={{ height: '100%', width: '100%', background: 'var(--bg-card)' }}
              scrollWheelZoom={false}
            >
              {/* Dark mode styled map tiles */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {workersList.map((worker) => (
                <Marker key={worker.id} position={[worker.lat, worker.lng]} icon={customPinIcon}>
                  <Popup>
                    <div style={{ padding: '0.25rem' }}>
                      <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.25rem', color: 'white' }}>{worker.name}</strong>
                      <span className={`status-pill status-${worker.status.toLowerCase()}`}>{worker.status}</span>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />{worker.loc}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-neon)' }}></div> Active
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'gray' }}></div> Inactive
            </div>
          </div>
        </div>

        {/* CHARTS COLUMN */}
        <div className="charts-column">
          {/* Top Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Status Distribution */}
            <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">Status Distribution</h3>
              <p className="section-subtitle">Current worker status</p>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Activity */}
            <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">Daily Activity</h3>
              <p className="section-subtitle">Tasks completed</p>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                    <Bar dataKey="tasks" fill="var(--accent-neon)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Completion Trend */}
          <div className="glass-panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--status-active)" /> Completion Trend</h3>
            <p className="section-subtitle">Completed vs pending tasks over time</p>
            <div style={{ flex: 1, marginTop: '-1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionData}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-active)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--status-active)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-assigned)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--status-assigned)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="week" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="completed" stroke="var(--status-active)" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                  <Area type="monotone" dataKey="pending" stroke="var(--status-assigned)" strokeWidth={3} fillOpacity={1} fill="url(#colorPending)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel">
        <h3 className="section-title">Worker Management</h3>
        <p className="section-subtitle">Track and manage all field workers</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Current Location</th>
                <th>Assigned Location</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workersList.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="avatar">{worker.initials}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{worker.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {worker.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} /> {worker.loc}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} /> {worker.assigned}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-${worker.status.toLowerCase()}`}>
                      {worker.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${worker.progress}%`, background: worker.progress === 100 ? 'var(--status-completed)' : (worker.progress === 0 ? 'var(--status-assigned)' : 'var(--accent-neon)') }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{worker.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
