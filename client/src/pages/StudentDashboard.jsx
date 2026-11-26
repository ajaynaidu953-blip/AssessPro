import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Award, 
  Clock, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import ExamConsentModal from './ExamConsentModal';

export default function StudentDashboard({ onStartExam, onViewResult }) {
  const { authFetch, user } = useAuth();

  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessmentForConsent, setSelectedAssessmentForConsent] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resAssess, resSubs] = await Promise.all([
        authFetch('/api/assessments'),
        authFetch('/api/submissions/student')
      ]);

      const dataAssess = await resAssess.json();
      const dataSubs = await resSubs.json();

      setAssessments(dataAssess.assessments || []);
      setSubmissions(dataSubs.submissions || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute summary stats
  const completedCount = submissions.filter(s => s.status === 'graded' || s.status === 'submitted').length;
  const passedCount = submissions.filter(s => s.passed === 1).length;
  const avgScore = completedCount > 0
    ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / completedCount)
    : 0;

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              STUDENT EXAMINATION PORTAL
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '1.85rem', marginTop: '0.5rem' }}>
              Welcome back, {user.name}
            </h1>
            <p style={{ color: '#bfdbfe', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              ID: {user.roll_number || 'CS-2026-041'} | Department: {user.department || 'Computer Science & Engineering'}
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.2)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700 }}>
              <ShieldCheck size={16} />
              <span>PROCTOR STATUS</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem' }}>Webcam Active</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div>
            <div className="stat-label">Available Exams</div>
            <div className="stat-value">{assessments.length}</div>
          </div>
          <div className="stat-icon">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="stat-card green">
          <div>
            <div className="stat-label">Completed Exams</div>
            <div className="stat-value">{completedCount}</div>
          </div>
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="stat-card purple">
          <div>
            <div className="stat-label">Average Percentage</div>
            <div className="stat-value">{avgScore}%</div>
          </div>
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card amber">
          <div>
            <div className="stat-label">Assessments Passed</div>
            <div className="stat-value">{passedCount}</div>
          </div>
          <div className="stat-icon">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Available Assessments Section */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={20} color="var(--primary-600)" />
            <span>Scheduled & Active Assessments</span>
          </div>
          <span className="badge badge-info">{assessments.length} Published</span>
        </div>

        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Loading assessments...
            </div>
          ) : assessments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No active assessments available at this time.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {assessments.map((exam) => {
                const isCompleted = exam.student_submission_status === 'submitted' || exam.student_submission_status === 'graded';
                const isInProgress = exam.student_submission_status === 'in_progress';

                return (
                  <div 
                    key={exam.id} 
                    style={{
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.35rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          {exam.subject}
                        </span>
                        {exam.webcam_required === 1 && (
                          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Camera size={12} />
                            <span>Webcam Proctored</span>
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.45rem', lineHeight: '1.3' }}>
                        {exam.title}
                      </h3>

                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
                        {exam.description || 'Continuous monitoring proctored examination.'}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={15} color="var(--primary-600)" />
                          <span>{exam.duration_minutes} Mins</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FileText size={15} color="var(--primary-600)" />
                          <span>{exam.question_count || 0} Questions</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Award size={15} color="var(--primary-600)" />
                          <span>{exam.total_marks} Marks</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Instructor: <strong>{exam.teacher_name || 'Faculty'}</strong>
                      </div>

                      {isCompleted ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onViewResult(exam.submission_id)}
                          style={{ borderColor: '#10b981', color: '#059669', fontWeight: 700 }}
                        >
                          <CheckCircle size={14} />
                          View Result ({exam.student_score}/{exam.student_max_score})
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedAssessmentForConsent(exam)}
                        >
                          <Camera size={14} />
                          {isInProgress ? 'Resume Exam' : 'Start Exam'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Past Submissions Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Award size={20} color="#10b981" />
            <span>My Assessment History & Scorecards</span>
          </div>
          <span className="badge badge-success">{submissions.length} Submissions</span>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {submissions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              You haven't completed any assessments yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Assessment Title</th>
                    <th>Subject</th>
                    <th>Submitted On</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Result</th>
                    <th>Grading Status</th>
                    <th>Proctor Integrity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 700 }}>{sub.assessment_title}</td>
                      <td>
                        <span className="badge badge-neutral">{sub.subject}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sub.submit_time ? new Date(sub.submit_time).toLocaleDateString() : 'In Progress'}
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
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
                        ) : sub.status === 'submitted' ? (
                          <span className="badge badge-warning">Pending Review</span>
                        ) : (
                          <span className="badge badge-neutral">In Progress</span>
                        )}
                      </td>
                      <td>
                        {sub.proctoring_status === 'clean' ? (
                          <span className="badge badge-success">Clean</span>
                        ) : (
                          <span className="badge badge-danger">Flagged ({sub.tab_switch_count} alerts)</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onViewResult(sub.id)}
                        >
                          View Report
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

      {/* Consent Modal */}
      <ExamConsentModal
        isOpen={Boolean(selectedAssessmentForConsent)}
        assessment={selectedAssessmentForConsent}
        onClose={() => setSelectedAssessmentForConsent(null)}
        onProceed={() => {
          if (selectedAssessmentForConsent) {
            onStartExam(selectedAssessmentForConsent.id);
          }
        }}
      />
    </div>
  );
}
