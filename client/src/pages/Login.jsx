import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, ArrowRight, Camera, Sparkles, AlertCircle } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  };

  const handleQuickLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1rem auto',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Camera size={30} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>AssessPro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Online Assessment & Webcam Monitoring System
          </p>
        </div>

        {/* Quick Demo Login Cards */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginBottom: '0.65rem' }}>
            <Sparkles size={14} />
            <span>1-CLICK QUICK DEMO LOGIN (SELECT ROLE):</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@assesspro.edu', 'Admin@123')}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.6rem 0.3rem',
                border: '1.5px solid #ddd6fe',
                background: '#f5f3ff'
              }}
            >
              <span className="role-badge admin" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Admin</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Dr. Vance</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('teacher.smith@assesspro.edu', 'Teacher@123')}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.6rem 0.3rem',
                border: '1.5px solid #a7f3d0',
                background: '#ecfdf5'
              }}
            >
              <span className="role-badge teacher" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Teacher</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Prof. Smith</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('student.alex@assesspro.edu', 'Student@123')}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0.6rem 0.3rem',
                border: '1.5px solid #bfdbfe',
                background: '#eff6ff'
              }}
            >
              <span className="role-badge student" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>Student</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Alex (Graded)</span>
            </button>
          </div>
        </div>

        {/* Main Login Form */}
        <div className="card">
          <div className="card-body">
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. admin@assesspro.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
              >
                {loading ? 'Authenticating...' : 'Sign In to AssessPro'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div className="card-footer" style={{ justifyContent: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Register as Student / Teacher
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
