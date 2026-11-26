import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus, 
  FileText, 
  Trash2, 
  Edit, 
  Camera, 
  Award, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function TeacherDashboard({ 
  onCreateAssessment, 
  onViewSubmissions, 
  onEditAssessment 
}) {
  const { authFetch, user } = useAuth();

  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/assessments');
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      console.error('Failed to load teacher assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete assessment "${title}"? All submissions will also be deleted.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/assessments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAssessments();
      } else {
        const data = await res.json();
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Error deleting assessment: ' + err.message);
    }
  };

  // Metrics
  const totalAssessments = assessments.length;
  const totalSubmissions = assessments.reduce((acc, a) => acc + (a.total_submissions || 0), 0);
  const pendingGrading = assessments.reduce((acc, a) => acc + (a.pending_grading_count || 0), 0);
  const totalGraded = assessments.reduce((acc, a) => acc + (a.graded_count || 0), 0);

  return (
    <div>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #065f46, #059669)', color: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              FACULTY & INSTRUCTOR DASHBOARD
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '1.85rem', marginTop: '0.5rem' }}>
              {user.name}
            </h1>
            <p style={{ color: '#a7f3d0', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Department: {user.department || 'Computer Science & Engineering'} | Role: Instructor
            </p>
          </div>

          <button 
            className="btn btn-lg"
            onClick={onCreateAssessment}
            style={{ backgroundColor: '#ffffff', color: '#065f46', fontWeight: 700, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
          >
            <Plus size={18} />
            Create New Assessment
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div>
            <div className="stat-label">My Assessments</div>
            <div className="stat-value">{totalAssessments}</div>
          </div>
          <div className="stat-icon">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="stat-card blue">
          <div>
            <div className="stat-label">Student Submissions</div>
            <div className="stat-value">{totalSubmissions}</div>
          </div>
          <div className="stat-icon">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card amber">
          <div>
            <div className="stat-label">Pending Manual Grading</div>
            <div className="stat-value">{pendingGrading}</div>
          </div>
          <div className="stat-icon">
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card purple">
          <div>
            <div className="stat-label">Graded Submissions</div>
            <div className="stat-value">{totalGraded}</div>
          </div>
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Assessments Management List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={20} color="var(--teacher-accent)" />
            <span>Manage Created Assessments & Submissions</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onCreateAssessment}>
            <Plus size={14} /> New Exam
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              Loading faculty assessments...
            </div>
          ) : assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '1rem' }}>No assessments created yet.</p>
              <button className="btn btn-primary" onClick={onCreateAssessment}>
                Create Your First Assessment
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Assessment Title</th>
                    <th>Subject</th>
                    <th>Duration</th>
                    <th>Total Marks</th>
                    <th>Questions</th>
                    <th>Webcam Monitoring</th>
                    <th>Submissions</th>
                    <th>Grading Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{exam.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Created {new Date(exam.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{exam.subject}</span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{exam.duration_minutes} Mins</td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{exam.total_marks}</td>
                      <td>{exam.question_count || 0}</td>
                      <td>
                        {exam.webcam_required === 1 ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Camera size={12} /> Active ({exam.snapshot_interval_seconds}s)
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Disabled</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary-600)' }}>
                          {exam.total_submissions || 0}
                        </strong>
                      </td>
                      <td>
                        {(exam.pending_grading_count || 0) > 0 ? (
                          <span className="badge badge-warning">
                            {exam.pending_grading_count} Needs Grading
                          </span>
                        ) : (
                          <span className="badge badge-success">Up to date</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onViewSubmissions(exam.id)}
                            title="View student submissions & grade written answers"
                          >
                            <Users size={14} />
                            Submissions ({exam.total_submissions || 0})
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onEditAssessment(exam.id)}
                            title="Edit exam questions & settings"
                            style={{ padding: '0.35rem 0.5rem' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(exam.id, exam.title)}
                            title="Delete exam"
                            style={{ padding: '0.35rem 0.5rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
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
    </div>
  );
}
