import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  Camera, 
  FileText 
} from 'lucide-react';

export default function TeacherSubmissionsList({ assessmentId, onBack, onGradeSubmission }) {
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/submissions/assessment/${assessmentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load submissions');

      setAssessment(data.assessment);
      setSubmissions(data.submissions || []);
    } catch (err) {
      alert('Error loading submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assessmentId) loadData();
  }, [assessmentId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading assessment submissions...</div>;
  }

  if (!assessment) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Assessment not found.</p>
        <button className="btn btn-secondary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const pendingGradingCount = submissions.filter(s => s.status === 'submitted').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Faculty Dashboard
        </button>

        <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
          {submissions.length} Total Submissions
        </span>
      </div>

      {/* Header Info */}
      <div className="card" style={{ marginBottom: '1.75rem', borderLeft: '5px solid var(--teacher-accent)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-neutral" style={{ marginBottom: '0.25rem' }}>
                {assessment.subject}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{assessment.title}</h2>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Duration: {assessment.duration_minutes} Mins | Total Marks: {assessment.total_marks} | Passing Marks: {assessment.passing_marks}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ textAlign: 'center', background: '#ecfdf5', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46' }}>FULLY GRADED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>{gradedCount}</div>
              </div>

              <div style={{ textAlign: 'center', background: '#fef3c7', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e' }}>NEEDS GRADING</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309' }}>{pendingGradingCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={18} color="var(--teacher-accent)" />
            <span>Student Submissions & Evaluation Queue</span>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {submissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No student has submitted answers for this assessment yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Student Name & ID</th>
                    <th>Submitted On</th>
                    <th>Score / Max</th>
                    <th>Percentage</th>
                    <th>Result</th>
                    <th>Evaluation Status</th>
                    <th>Proctoring Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--text-main)' }}>{sub.student_name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {sub.roll_number || 'N/A'} • {sub.student_email}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sub.submit_time ? new Date(sub.submit_time).toLocaleString() : 'In Progress'}
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
                          <span className="badge badge-warning">
                            {sub.pending_written_count > 0 ? `${sub.pending_written_count} Written to Grade` : 'Submitted'}
                          </span>
                        )}
                      </td>
                      <td>
                        {sub.proctoring_status === 'clean' ? (
                          <span className="badge badge-success">Clean</span>
                        ) : (
                          <span className="badge badge-danger">
                            Flagged ({sub.violation_count || sub.tab_switch_count} alerts)
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onGradeSubmission(sub.id)}
                        >
                          <Edit3 size={14} />
                          {sub.status === 'graded' ? 'Review & Edit Grade' : 'Grade Submission'}
                        </button>
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
