import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Award, 
  History, 
  AlertTriangle, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Camera, 
  CheckCircle,
  TrendingUp,
  Download
} from 'lucide-react';
import Modal from '../components/Modal';

export default function AdminDashboard({ onInspectSubmission }) {
  const { authFetch, user } = useAuth();

  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions', 'audit', 'users'
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // User Management Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    roll_number: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStats, resSubs, resAudit, resUsers] = await Promise.all([
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/all-submissions'),
        authFetch('/api/grades/audit-logs'),
        authFetch('/api/admin/users')
      ]);

      const dataStats = await resStats.json();
      const dataSubs = await resSubs.json();
      const dataAudit = await resAudit.json();
      const dataUsers = await resUsers.json();

      setStats(dataStats.stats || null);
      setSubmissions(dataSubs.submissions || []);
      setAuditLogs(dataAudit.logs || []);
      setUsersList(dataUsers.users || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // User CRUD
  const handleOpenUserModal = (existing = null) => {
    if (existing) {
      setEditingUser(existing);
      setUserForm({
        name: existing.name,
        email: existing.email,
        password: '',
        role: existing.role,
        department: existing.department || '',
        roll_number: existing.roll_number || ''
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        department: '',
        roll_number: ''
      });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(userForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');

      setUserModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving user: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) return;

    try {
      const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      (s.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assessment_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'flagged') return matchesSearch && s.proctoring_status === 'flagged';
    if (statusFilter === 'overridden') return matchesSearch && (s.mark_override_count || 0) > 0;
    return matchesSearch;
  });

  return (
    <div>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', color: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              DEAN & SYSTEM ADMINISTRATION SUITE
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '1.85rem', marginTop: '0.5rem' }}>
              Institution Control Center
            </h1>
            <p style={{ color: '#ddd6fe', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Superuser Authority: Universal Mark Overrides, Audit Trail Forensics & Security Proctoring
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenUserModal(null)}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', fontWeight: 700 }}
            >
              <Plus size={14} /> Add User
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => window.print()}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', fontWeight: 700 }}
            >
              <Download size={14} /> Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card purple">
            <div>
              <div className="stat-label">Total Students</div>
              <div className="stat-value">{stats.totalStudents}</div>
            </div>
            <div className="stat-icon"><Users size={24} /></div>
          </div>

          <div className="stat-card green">
            <div>
              <div className="stat-label">Active Faculty</div>
              <div className="stat-value">{stats.totalTeachers}</div>
            </div>
            <div className="stat-icon"><BookOpen size={24} /></div>
          </div>

          <div className="stat-card blue">
            <div>
              <div className="stat-label">Total Submissions</div>
              <div className="stat-value">{stats.totalSubmissions}</div>
            </div>
            <div className="stat-icon"><FileText size={24} /></div>
          </div>

          <div className="stat-card amber">
            <div>
              <div className="stat-label">Average Performance</div>
              <div className="stat-value">{stats.avgPercentage}%</div>
            </div>
            <div className="stat-icon"><TrendingUp size={24} /></div>
          </div>

          <div className="stat-card red">
            <div>
              <div className="stat-label">Proctoring Flags</div>
              <div className="stat-value">{stats.flaggedProctoring}</div>
            </div>
            <div className="stat-icon"><AlertTriangle size={24} /></div>
          </div>

          <div className="stat-card purple">
            <div>
              <div className="stat-label">Mark Overrides in Audit</div>
              <div className="stat-value">{stats.totalAuditChanges}</div>
            </div>
            <div className="stat-icon"><History size={24} /></div>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('submissions')}
          style={activeTab === 'submissions' ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : {}}
        >
          <Award size={15} />
          Student Submissions & Mark Overrides ({submissions.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audit')}
          style={activeTab === 'audit' ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : {}}
        >
          <History size={15} />
          Global Grade Audit Trail ({auditLogs.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
          style={activeTab === 'users' ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : {}}
        >
          <Users size={15} />
          User Management ({usersList.length})
        </button>
      </div>

      {/* Tab 1: All Submissions & Mark Overrides */}
      {activeTab === 'submissions' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="card-title">
              <Award size={18} color="var(--admin-accent)" />
              <span>Universal Student Mark Override Portal</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '220px', paddingLeft: '2rem', height: '36px', fontSize: '0.8rem' }}
                  placeholder="Search student or exam..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              </div>

              <select
                className="form-control"
                style={{ width: 'auto', height: '36px', fontSize: '0.8rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Submissions</option>
                <option value="overridden">Modified Marks Only</option>
                <option value="flagged">Proctoring Flagged Only</option>
              </select>
            </div>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Name & ID</th>
                    <th>Assessment Title</th>
                    <th>Score / Total</th>
                    <th>Percentage</th>
                    <th>Result</th>
                    <th>Grading Status</th>
                    <th>Proctoring Status</th>
                    <th>Audit Overrides</th>
                    <th>Administrative Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <strong style={{ color: 'var(--text-main)', display: 'block' }}>{sub.student_name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sub.roll_number || 'N/A'} • {sub.student_email}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sub.assessment_title}</div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{sub.subject}</span>
                      </td>
                      <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {sub.total_score} / {sub.max_score}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {sub.percentage}%
                      </td>
                      <td>
                        {sub.passed === 1 ? (
                          <span className="badge badge-success">Passed</span>
                        ) : (
                          <span className="badge badge-danger">Failed</span>
                        )}
                      </td>
                      <td>
                        {sub.status === 'graded' ? (
                          <span className="badge badge-success">Graded</span>
                        ) : (
                          <span className="badge badge-warning">Needs Review</span>
                        )}
                      </td>
                      <td>
                        {sub.proctoring_status === 'clean' ? (
                          <span className="badge badge-success">Clean</span>
                        ) : (
                          <span className="badge badge-danger" title={`${sub.violation_count || sub.tab_switch_count} violations recorded`}>
                            Flagged ({sub.violation_count || sub.tab_switch_count} alerts)
                          </span>
                        )}
                      </td>
                      <td>
                        {(sub.mark_override_count || 0) > 0 ? (
                          <span className="badge" style={{ background: '#f5f3ff', color: 'var(--admin-accent)', border: '1px solid #c4b5fd', fontWeight: 700 }}>
                            {sub.mark_override_count} Changed
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--admin-accent)', color: '#ffffff', fontWeight: 700 }}
                          onClick={() => onInspectSubmission(sub.id)}
                        >
                          <ShieldCheck size={14} />
                          Inspect & Override Marks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Global Grade Audit Trail */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header" style={{ background: '#f5f3ff' }}>
            <div className="card-title" style={{ color: 'var(--admin-accent)' }}>
              <History size={18} />
              <span>Complete Institutional Grade Audit Trail (Immutable Log)</span>
            </div>
            <span className="badge" style={{ background: '#ede9fe', color: 'var(--admin-accent)' }}>
              {auditLogs.length} Recorded Adjustments
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No score modifications have been recorded yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Audit Timestamp</th>
                      <th>Student</th>
                      <th>Assessment</th>
                      <th>Target Component</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Delta</th>
                      <th>Modifier</th>
                      <th>Role</th>
                      <th>Mandatory Justification Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {log.student_name}
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {log.student_email}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{log.assessment_title}</td>
                        <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {log.question_id ? `Question #${log.question_id}` : 'Overall Score Override'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{log.old_score}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--admin-accent)' }}>
                          {log.new_score}
                        </td>
                        <td>
                          <span className={`audit-diff ${log.score_difference >= 0 ? 'plus' : 'minus'}`}>
                            {log.score_difference >= 0 ? `+${log.score_difference}` : log.score_difference}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{log.changed_by_name}</td>
                        <td>
                          <span className={`role-badge ${log.changed_by_role}`}>
                            {log.changed_by_role}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem', maxWidth: '300px' }}>
                          <div style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                            <em>{log.reason}</em>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: User Management */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Users size={18} color="var(--primary-600)" />
              <span>Institutional Accounts Management</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleOpenUserModal(null)}>
              <Plus size={14} /> Add New User
            </button>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Department / Major</th>
                    <th>Roll / ID Number</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.department || 'N/A'}</td>
                      <td>{u.roll_number || 'N/A'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenUserModal(u)}
                            style={{ padding: '0.35rem 0.5rem' }}
                            title="Edit User"
                          >
                            <Edit size={14} />
                          </button>
                          {u.id !== user.id && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              style={{ padding: '0.35rem 0.5rem' }}
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `Edit Account: ${editingUser.name}` : 'Create New Account'}
        maxWidth="520px"
      >
        <form onSubmit={handleSaveUser}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role *</label>
            <select
              className="form-control"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher / Instructor</option>
              <option value="admin">Administrator / Dean</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                value={userForm.department}
                onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number / ID</label>
              <input
                type="text"
                className="form-control"
                value={userForm.roll_number}
                onChange={(e) => setUserForm({ ...userForm, roll_number: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {editingUser ? 'New Password (Leave blank to keep existing)' : 'Password *'}
            </label>
            <input
              type="password"
              className="form-control"
              placeholder={editingUser ? 'Leave empty to preserve password' : 'Enter strong password'}
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required={!editingUser}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setUserModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingUser ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
