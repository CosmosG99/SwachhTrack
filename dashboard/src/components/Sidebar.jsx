import React from 'react';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  BriefcaseBusiness, 
  Trophy, 
  Map as MapIcon, 
  Leaf, 
  Clock,
  LogOut
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout, lang = 'en' }) {
  const t = {
    en: {
      brand: "SwachhTrack™",
      sub: "Core Operations",
      overview: "Overview",
      attendance: "Attendance",
      tasks: "Task Analytics",
      performance: "Worker Perf.",
      map: "Heatmap & Wards",
      activity: "Recent Activity",
      admin: "Admin",
      online: "Online",
      logout: "Sign Out"
    },
    mr: {
      brand: "स्वच्छट्रॅक™",
      sub: "मुख्य ऑपरेशन्स",
      overview: "आढावा",
      attendance: "उपस्थिती",
      tasks: "कार्य विश्लेषण",
      performance: "कामगार कामगिरी",
      map: "नकाशा आणि प्रभाग",
      activity: "अलीकडील क्रियाकलाप",
      admin: "प्रशासक",
      online: "ऑनलाइन",
      logout: "लॉग आउट"
    }
  };

  const menuItems = [
    { id: 'overview', label: t[lang].overview, icon: LayoutDashboard },
    { id: 'attendance', label: t[lang].attendance, icon: CalendarCheck },
    { id: 'tasks', label: t[lang].tasks, icon: BriefcaseBusiness },
    { id: 'performance', label: t[lang].performance, icon: Trophy },
    { id: 'map', label: t[lang].map, icon: MapIcon },
    { id: 'activity', label: t[lang].activity, icon: Clock },
  ];

  return (
    <div style={{
      width: '240px',
      background: 'rgba(20, 20, 25, 0.8)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{ padding: '0 1rem', marginBottom: '2rem' }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          margin: 0,
          background: 'linear-gradient(45deg, var(--accent-neon), #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t[lang].brand}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{t[lang].sub}</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-neon)' : 'currentColor'} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.1)',
            transition: 'all 0.2s',
            textAlign: 'left',
            width: '100%'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
        >
          <LogOut size={18} />
          {t[lang].logout}
        </button>

        <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(45deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            AD
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t[lang].admin}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--status-active)' }}>{t[lang].online}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
