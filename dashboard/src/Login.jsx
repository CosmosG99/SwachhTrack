import React, { useState } from 'react';
import { Activity, Mail, Lock, LogIn } from 'lucide-react';

export default function Login({ onLogin, onGoToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill out all fields.');
      return;
    }
    
    setLoading(true);
    // Simulate networking/authentication delay
    setTimeout(() => {
      // Very simple validation logic for demo purposes
      if (email === 'admin@swachhtrack.com' && password === 'admin') {
        onLogin();
      } else {
        setError('Invalid credentials. Hint: admin@swachhtrack.com / admin');
        setLoading(false);
      }
    }, 1500);
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--accent-neon)', 
            padding: '1rem', 
            borderRadius: '1.25rem', 
            boxShadow: '0 0 25px var(--accent-glow)', 
            marginBottom: '1.5rem' 
          }}>
            <Activity color="white" size={36} />
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Admin Portal</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>Access the SwachhTrack Command Center</p>
        </div>

        {error && (
           <div style={{ 
             background: 'rgba(239, 68, 68, 0.1)', 
             border: '1px solid rgba(239, 68, 68, 0.3)', 
             color: '#ef4444', 
             padding: '0.85rem', 
             borderRadius: '0.5rem', 
             marginBottom: '1.5rem', 
             fontSize: '0.85rem', 
             textAlign: 'center' 
           }}>
             {error}
           </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={16} /> Email Address
            </label>
            <input 
              type="email" 
              placeholder="e.g. admin@swachhtrack.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} /> Password
            </label>
            <input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '1rem', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.05rem', borderRadius: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} style={{ animation: 'pulse-pin 1.5s infinite' }} /> Authenticating...
               </span>
            ) : (
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <LogIn size={20} /> Login to Dashboard
               </span>
            )}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={onGoToRegister}
          >
            Register a new worker
          </button>
        </form>
      </div>
    </div>
  );
}
