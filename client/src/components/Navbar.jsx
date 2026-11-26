import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  BookOpen, 
  Award, 
  Users, 
  History, 
  LogOut, 
  ChevronDown, 
  Sparkles,
  Camera,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, logout, quickSwitch } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!user) return null;

  const roleBadgeClass = {
    admin: 'admin',
    teacher: 'teacher',
    student: 'student'
  }[user.role] || 'student';

  const handleRoleSwitch = async (email, password, defaultView) => {
    try {
      await quickSwitch(email, password);
      setDropdownOpen(false);
      if (defaultView) setCurrentView(defaultView);
    } catch (err) {
      alert('Quick switch failed: ' + err.message);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div 
          className="brand" 
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (user.role === 'admin') setCurrentView('admin-dashboard');
            else if (user.role === 'teacher') setCurrentView('teacher-dashboard');
            else setCurrentView('student-dashboard');
          }}
        >
          <div className="brand-icon">
            <Camera size={22} />
          </div>
          <div>
            <div className="brand-title">AssessPro</div>
            <div className="brand-subtitle">Webcam Proctored Assessment</div>
          </div>
        </div>

        {/* Navigation links by role */}
        <div className="nav-links">
          {user.role === 'student' && (
            <>
              <button 
                className={`nav-link ${currentView === 'student-dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('student-dashboard')}
              >
                <BookOpen size={16} />
                My Assessments
              </button>
            </>
          )}

          {user.role === 'teacher' && (
            <>
              <button 
                className={`nav-link ${currentView === 'teacher-dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('teacher-dashboard')}
              >
                <BookOpen size={16} />
                Dashboard & Exams
              </button>
              <button 
                className={`nav-link ${currentView === 'create-assessment' ? 'active' : ''}`}
                onClick={() => setCurrentView('create-assessment')}
              >
                <FileText size={16} />
                Create Exam
              </button>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <button 
                className={`nav-link ${currentView === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-dashboard')}
              >
                <ShieldCheck size={16} />
                Admin Overview
              </button>
              <button 
                className={`nav-link ${currentView === 'admin-submissions' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-submissions')}
              >
                <Award size={16} />
                Grade Overrides
              </button>
              <button 
                className={`nav-link ${currentView === 'admin-audit' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-audit')}
              >
                <History size={16} />
                Audit Logs
              </button>
              <button 
                className={`nav-link ${currentView === 'admin-users' ? 'active' : ''}`}
                onClick={() => setCurrentView('admin-users')}
              >
                <Users size={16} />
                Users
              </button>
            </>
          )}
        </div>

        {/* Right side controls */}
        <div className="user-badge-wrapper">
          {/* Quick Demo Role Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#cbd5e1' }}
              title="Switch demo role without logging out"
            >
              <Sparkles size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Switch Role</span>
              <ChevronDown size={14} />
            </button>

            {dropdownOpen && (
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  width: '280px',
                  zIndex: 100,
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  1-CLICK DEMO ROLE SWITCHER
                </div>

                <button 
                  className="nav-link" 
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem' }}
                  onClick={() => handleRoleSwitch('admin@assesspro.edu', 'Admin@123', 'admin-dashboard')}
                >
                  <span className="role-badge admin" style={{ fontSize: '0.65rem' }}>Admin</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Dr. Eleanor Vance</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admin Overrides & Audits</div>
                  </div>
                </button>

                <button 
                  className="nav-link" 
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem' }}
                  onClick={() => handleRoleSwitch('teacher.smith@assesspro.edu', 'Teacher@123', 'teacher-dashboard')}
                >
                  <span className="role-badge teacher" style={{ fontSize: '0.65rem' }}>Teacher</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Prof. Robert Smith</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Exam Creation & Grading</div>
                  </div>
                </button>

                <button 
                  className="nav-link" 
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem' }}
                  onClick={() => handleRoleSwitch('student.alex@assesspro.edu', 'Student@123', 'student-dashboard')}
                >
                  <span className="role-badge student" style={{ fontSize: '0.65rem' }}>Student</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Alex Johnson</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed Web Exam (92%)</div>
                  </div>
                </button>

                <button 
                  className="nav-link" 
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '0.5rem' }}
                  onClick={() => handleRoleSwitch('student.john@assesspro.edu', 'Student@123', 'student-dashboard')}
                >
                  <span className="role-badge student" style={{ fontSize: '0.65rem' }}>Student</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>John Doe (New)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fresh Profile (Ready to test)</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Current User Info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
              <span className={`role-badge ${roleBadgeClass}`}>
                {user.role}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button 
            className="btn btn-secondary btn-sm"
            onClick={logout}
            title="Log out"
            style={{ padding: '0.5rem' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
