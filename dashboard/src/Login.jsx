import React, { useState } from 'react';
import { Activity, Lock, LogIn, User } from 'lucide-react';
import { loginUser } from './api';
import translations from './i18n';

export default function Login({ onLogin, lang = 'en', onChangeLang }) {
  const [employeeId, setEmployeeId] = useState('ADMIN001');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = translations[lang];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId || !password) {
      setError(t.fillAll);
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(employeeId, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        {/* Language selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <select
            value={lang}
            onChange={(e) => onChangeLang(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit', outline: 'none' }}
          >
            <option value="en" style={{ color: 'black' }}>English</option>
            <option value="mr" style={{ color: 'black' }}>मराठी</option>
          </select>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--accent-neon)', padding: '1rem', borderRadius: '1.25rem', boxShadow: '0 0 25px var(--accent-glow)', marginBottom: '1.5rem' }}>
            <Activity color="white" size={36} />
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{t.portal}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>{t.portalSub}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} /> {t.employeeId}
            </label>
            <input type="text" placeholder="e.g. ADMIN001" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', boxSizing: 'border-box' }} />
          </div>
          <div className="form-group" style={{ marginBottom: '2.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> {t.password}
            </label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.05rem', borderRadius: '0.75rem' }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ animation: 'pulse-pin 1.5s infinite' }} /> {t.authenticating}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={20} /> {t.loginBtn}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
