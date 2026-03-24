import React, { useState } from 'react';
import { Activity, User, Mail, MapPinHouse, Phone, Lock, UserPlus } from 'lucide-react';

export default function WorkerRegister({ onBackToLogin }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Mobile number must be at least 10 digits.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess('Worker registration completed. You can now login.');
      setForm({
        name: '',
        email: '',
        address: '',
        mobile: '',
        password: '',
        confirmPassword: '',
      });
    }, 1000);
  };

  return (
    <div className="auth-page">
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <Activity color="white" size={36} />
          </div>
          <h2>Worker Registration</h2>
          <p>Create a new worker account for SwachhTrack dashboard access</p>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}
        {success && <div className="auth-message auth-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="auth-label"><User size={16} /> Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="auth-label"><Mail size={16} /> Email Address</label>
            <input
              type="email"
              placeholder="e.g. worker@swachhtrack.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="auth-label"><MapPinHouse size={16} /> Address</label>
            <input
              type="text"
              placeholder="Enter residential address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="auth-label"><Phone size={16} /> Mobile Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={form.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="auth-label"><Lock size={16} /> Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="auth-label"><Lock size={16} /> Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ animation: 'pulse-pin 1.5s infinite' }} /> Registering...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} /> Register Worker
              </span>
            )}
          </button>

          <button
            type="button"
            className="auth-link-button"
            onClick={onBackToLogin}
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}
