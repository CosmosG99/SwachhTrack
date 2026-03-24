import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, ClipboardList, CheckCircle2, TrendingUp, 
  MapPin, Clock, Leaf, AlertTriangle, FileText
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MetricCard = ({ title, value, icon, glow }) => (
  <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{title}</p>
      <h2 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0 }}>{value}</h2>
    </div>
    <div style={{ background: glow, padding: '1rem', borderRadius: '50%' }}>
      {icon}
    </div>
  </div>
);

export default function AnalyticsTabs({ activeTab, lang = 'en' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const t = {
    en: {
      load: "Loading module...",
      noData: "No data available.",
      totalPresent: "Total Present Today",
      absentLate: "Absent / Late",
      avgComp: "Avg Compliance",
      overtime: "Overtime Hours",
      geoTitle: "Geofence Compliance Overview",
      dailyDist: "Daily Distribution",
      onTime: "On-Time",
      late: "Late",
      absent: "Absent",
      totalPresntLegend: "Total Present",
      geoCompLegend: "Geofence Compliant",
      recentLogs: "Recent Attendance Logs",
      exportCsv: "Export CSV",
      workerName: "Worker Name",
      id: "ID",
      date: "Date",
      checkIn: "Check-in Time",
      status: "Status",
      geofence: "Geofence",
      borderline: "Borderline",
      insideZone: "Inside Zone",
      outside: "N/A",
      tasksByType: "Tasks by Type",
      detailedMetrics: "Detailed Metrics",
      total: "total",
      completed: "completed",
      inProgress: "in progress",
      topWorker: "Top Worker Leaderboard",
      rank: "Rank",
      worker: "Worker",
      department: "Department",
      attendance: "Attendance",
      tasksComp: "Tasks Completed",
      rate: "Rate",
      days: "days",
      noWorkers: "No workers found in database.",
      opsLog: "Operations Log & Anomalies",
      noActivity: "No recent activity detected.",
      liveHeatmap: "Live Heatmap Activity",
      heatmapSub: "Visualizing dense GPS regions",
      activePoints: "active points today",
      wasteColl: "Waste Collection",
      sweeping: "Sweeping",
      supervision: "Supervision",
    },
    mr: {
      load: "मॉड्यूल लोड होत आहे...",
      noData: "डेटा उपलब्ध नाही.",
      totalPresent: "आज हजर एकूण",
      absentLate: "अनुपस्थित / उशीरा",
      avgComp: "सरासरी अनुपालन",
      overtime: "ओव्हरटाइम तास",
      geoTitle: "जिओफेन्स अनुपालन आढावा",
      dailyDist: "दैनिक वितरण",
      onTime: "वेळेवर",
      late: "उशीरा",
      absent: "अनुपस्थित",
      totalPresntLegend: "एकूण हजर",
      geoCompLegend: "जिओफेन्स सुसंगत",
      recentLogs: "अलीकडील उपस्थिती नोंदी",
      exportCsv: "CSV निर्यात करा",
      workerName: "कामगाराचे नाव",
      id: "आयडी",
      date: "तारीख",
      checkIn: "चेक-इन वेळ",
      status: "स्थिती",
      geofence: "जिओफेन्स",
      borderline: "सीमेवर",
      insideZone: "झोनच्या आत",
      outside: "लागू नाही",
      tasksByType: "प्रकारानुसार कार्ये",
      detailedMetrics: "सविस्तर मेट्रिक्स",
      total: "एकूण",
      completed: "पूर्ण",
      inProgress: "प्रगतीपथावर",
      topWorker: "शीर्ष कामगार लीडरबोर्ड",
      rank: "क्रमांक",
      worker: "कामगार",
      department: "विभाग",
      attendance: "उपस्थिती",
      tasksComp: "कार्ये पूर्ण झाली",
      rate: "दर",
      days: "दिवस",
      noWorkers: "डेटाबेसमध्ये कामगार आढळले नाहीत.",
      opsLog: "ऑपरेशन्स लॉग आणि विसंगती",
      noActivity: "कोणतीही अलीकडील क्रियाकलाप आढळला नाही.",
      liveHeatmap: "थेट हीटमॅप क्रियाकलाप",
      heatmapSub: "दाट GPS प्रदेशांचे दृश्यकरण",
      activePoints: "आज सक्रिय बिंदू",
      wasteColl: "कचरा संकलन",
      sweeping: "झाडणे",
      supervision: "पर्यवेक्षण",
    }
  };

  const mockData = {
    trends: [
      { date: '2026-03-18', present: 28, absent: 4, compliant: 26 },
      { date: '2026-03-19', present: 30, absent: 2, compliant: 29 },
      { date: '2026-03-20', present: 29, absent: 3, compliant: 28 },
      { date: '2026-03-21', present: 27, absent: 5, compliant: 25 },
      { date: '2026-03-22', present: 15, absent: 17, compliant: 15 },
      { date: '2026-03-23', present: 31, absent: 1, compliant: 30 },
      { date: '2026-03-24', present: 32, absent: 0, compliant: 31 },
    ],
    analytics: [
      { type: 'Sweeping', total: 45, completed: 30, in_progress: 15 },
      { type: 'Waste Collection', total: 60, completed: 50, in_progress: 10 },
      { type: 'Drain Cleaning', total: 20, completed: 5, in_progress: 15 },
      { type: 'Bin Emptying', total: 80, completed: 75, in_progress: 5 }
    ],
    workers: [
      { id: '1', name: 'Ramesh Kumar', employee_id: 'EMP-001', department: 'Waste Collection', attendance: { days_present: 24 }, tasks: { assigned: 150, completed: 145, completion_rate: '96%' } },
      { id: '2', name: 'Suresh Patil', employee_id: 'EMP-002', department: 'Sweeping', attendance: { days_present: 23 }, tasks: { assigned: 120, completed: 110, completion_rate: '91%' } },
      { id: '3', name: 'Anita Desai', employee_id: 'EMP-003', department: 'Supervision', attendance: { days_present: 25 }, tasks: { assigned: 40, completed: 40, completion_rate: '100%' } },
    ],
    activities: [
      { name: 'Ramesh Kumar', employee_id: 'EMP-001', type: 'task', action: 'completed_task', details: { title: 'Bin Emptying at Margao Gate' }, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { name: 'Suresh Patil', employee_id: 'EMP-002', type: 'attendance', action: 'clock_in', details: { within_geofence: true }, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
      { name: 'Unknown Worker', employee_id: 'EMP-009', type: 'anomaly', action: 'geofence_breach', details: { description: 'Worker exited active work zone.' }, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    ],
    total_points: 124,
    heatmap: [
      { lat: 15.2832, lng: 73.9862, intensity: 8 },
      { lat: 15.2900, lng: 73.9800, intensity: 5 },
      { lat: 15.2993, lng: 73.9240, intensity: 10 },
      { lat: 15.3050, lng: 73.9300, intensity: 4 },
      { lat: 15.4909, lng: 73.8278, intensity: 7 }
    ]
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 400); 
    return () => clearTimeout(timer);
  }, [activeTab]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>{t[lang].load}</div>;
  }

  if (!data) return <p>{t[lang].noData}</p>;

  return (
    <div style={{ paddingBottom: '2rem' }}>
      
      {/* 2. ATTENDANCE TRENDS TAB */}
      {activeTab === 'attendance' && data.trends && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="top-stats-grid">
            <MetricCard title={t[lang].totalPresent} value="32" icon={<UserCheck size={24} color="#34d399" />} glow="rgba(52, 211, 153, 0.2)" />
            <MetricCard title={t[lang].absentLate} value="3" icon={<AlertTriangle size={24} color="#ef4444" />} glow="rgba(239, 68, 68, 0.2)" />
            <MetricCard title={t[lang].avgComp} value="96%" icon={<CheckCircle2 size={24} color="#60a5fa" />} glow="rgba(96, 165, 250, 0.2)" />
            <MetricCard title={t[lang].overtime} value="12h" icon={<Clock size={24} color="#fbbf24" />} glow="rgba(251, 191, 36, 0.2)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div className="glass-panel" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">{t[lang].geoTitle}</h3>
              <div style={{ flex: 1, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#a1a1aa" fontSize={12} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                    <Bar dataKey="present" fill="rgba(52, 211, 153, 0.5)" name={t[lang].totalPresntLegend} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="compliant" fill="#60a5fa" name={t[lang].geoCompLegend} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">{t[lang].dailyDist}</h3>
              <div style={{ flex: 1, marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: t[lang].onTime, value: 28, color: '#34d399' },
                        { name: t[lang].late, value: 4, color: '#fbbf24' },
                        { name: t[lang].absent, value: 3, color: '#ef4444' }
                      ]} 
                      dataKey="value" 
                      cx="50%" cy="50%" 
                      innerRadius={60} 
                      outerRadius={90}
                    >
                      {[
                        { name: t[lang].onTime, value: 28, color: '#34d399' },
                        { name: t[lang].late, value: 4, color: '#fbbf24' },
                        { name: t[lang].absent, value: 3, color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>{t[lang].recentLogs}</h3>
              <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>{t[lang].exportCsv}</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t[lang].workerName}</th>
                    <th>{t[lang].id}</th>
                    <th>{t[lang].date}</th>
                    <th>{t[lang].checkIn}</th>
                    <th>{t[lang].status}</th>
                    <th>{t[lang].geofence}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.map((worker, i) => (
                    <tr key={worker.id}>
                      <td style={{ fontWeight: 500 }}>{worker.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{worker.employee_id}</td>
                      <td>{new Date().toLocaleDateString()}</td>
                      <td>{['08:05 AM', '08:12 AM', '07:55 AM'][i % 3]}</td>
                      <td>
                        <span className={`status-pill status-${i === 1 ? 'assigned' : 'completed'}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                          {i === 1 ? t[lang].late : t[lang].onTime}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle2 size={16} color={i === 1 ? '#fbbf24' : '#34d399'} />
                          {i === 1 ? t[lang].borderline : t[lang].insideZone}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 500 }}>Rajesh Singh</td>
                    <td style={{ color: 'var(--text-secondary)' }}>EMP-004</td>
                    <td>{new Date().toLocaleDateString()}</td>
                    <td>-- : --</td>
                    <td>
                      <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                        {t[lang].absent}
                      </span>
                    </td>
                    <td><span style={{ color: 'var(--text-secondary)' }}>{t[lang].outside}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TASK ANALYTICS TAB */}
      {activeTab === 'tasks' && data.analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title">{t[lang].tasksByType}</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.analytics} dataKey="total" nameKey="type" cx="50%" cy="50%" innerRadius={80} outerRadius={120} label>
                    {data.analytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#09090b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title">{t[lang].detailedMetrics}</h3>
            {data.analytics.map((item, i) => (
              <div key={i} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {item.type === 'Sweeping' ? t[lang].sweeping : item.type === 'Waste Collection' ? t[lang].wasteColl : item.type}
                  </span>
                  <span>{item.total} {t[lang].total}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span style={{ color: '#34d399' }}>✔ {item.completed} {t[lang].completed}</span>
                  <span style={{ color: '#fbbf24' }}>⌛ {item.in_progress} {t[lang].inProgress}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PERFORMANCE TAB */}
      {activeTab === 'performance' && data.workers && (
        <div className="glass-panel">
          <h3 className="section-title">{t[lang].topWorker}</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t[lang].rank}</th>
                  <th>{t[lang].worker}</th>
                  <th>{t[lang].department}</th>
                  <th>{t[lang].attendance}</th>
                  <th>{t[lang].tasksComp}</th>
                  <th>{t[lang].rate}</th>
                </tr>
              </thead>
              <tbody>
                {data.workers.map((w, i) => (
                  <tr key={w.id}>
                    <td>
                      {i === 0 ? '🏆 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i+1}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{w.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.employee_id}</div>
                    </td>
                    <td>{w.department === 'Waste Collection' ? t[lang].wasteColl : w.department === 'Sweeping' ? t[lang].sweeping : t[lang].supervision}</td>
                    <td>{w.attendance.days_present} {t[lang].days}</td>
                    <td><span style={{ color: '#34d399', fontWeight: 600 }}>{w.tasks.completed}</span> / {w.tasks.assigned}</td>
                    <td>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '1rem', height: '6px', width: '100px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: w.tasks.completion_rate, background: '#a78bfa' }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', marginTop: '4px', display:'block' }}>{w.tasks.completion_rate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.workers.length === 0 && <p style={{ padding: '1rem' }}>{t[lang].noWorkers}</p>}
          </div>
        </div>
      )}

      {/* 6. RECENT ACTIVITY TAB */}
      {activeTab === 'activity' && data.activities && (
        <div className="glass-panel">
          <h3 className="section-title">{t[lang].opsLog}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {data.activities.length === 0 ? <p>{t[lang].noActivity}</p> : null}
            {data.activities.map((act, i) => {
              const isAnomaly = act.type === 'anomaly';
              const Icon = isAnomaly ? AlertTriangle : act.type === 'task' ? ClipboardList : UserCheck;
              const color = isAnomaly ? '#ef4444' : act.type === 'task' ? '#fbbf24' : '#34d399';
              
              return (
                <div key={i} style={{ display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', borderLeft: `4px solid ${color}` }}>
                  <div style={{ background: `rgba(${isAnomaly ? '239, 68, 68' : '255,255,255'}, 0.1)`, padding: '0.75rem', borderRadius: '50%', height: 'fit-content' }}>
                    <Icon color={color} size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      {act.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.9rem' }}>({act.employee_id})</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {act.action.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      {act.details.title || act.details.description || `Geofence compliant: ${act.details.within_geofence}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.5rem' }}>
                      {new Date(act.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. MAP TAB */}
      {activeTab === 'map' && data.heatmap && (
        <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <h3 className="section-title"><MapPin size={20} color="var(--accent-light)" style={{ display:'inline', verticalAlign:'middle' }}/> {t[lang].liveHeatmap}</h3>
          <p className="section-subtitle">{t[lang].heatmapSub} ({data.total_points} {t[lang].activePoints})</p>
          <div style={{ flex: 1, marginTop: '1rem', borderRadius: '1rem', overflow: 'hidden', position: 'relative' }}>
            <MapContainer center={[15.2993, 73.9240]} zoom={10} style={{ height: '100%', width: '100%', background: 'var(--bg-card)' }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {data.heatmap.map((point, i) => (
                <CircleMarker 
                  key={i} center={[point.lat, point.lng]} 
                  radius={point.intensity * 3} 
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6, stroke: false }} 
                />
              ))}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
