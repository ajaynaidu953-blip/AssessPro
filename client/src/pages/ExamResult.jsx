import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  FileText,
  History,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

export default function ExamResult({ submissionId, onBackToDashboard }) {
  const { authFetch, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'proctoring', 'audit'

  useEffect(() => {
    async function fetchResult() {
      setLoading(true);
      try {
        const res = await authFetch(`/api/submissions/${submissionId}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to load result');

        setData(result);

        // Confetti celebration if passed!
        if (result.submission && result.submission.passed === 1) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } catch (err) {
        alert('Error loading result: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    if (submissionId) {
      fetchResult();
    }
  }, [submissionId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Compiling Assessment Results & Proctoring Audit...
        </div>
      </div>
    );
  }

  if (!data || !data.submission) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No submission found.</p>
        <button className="btn btn-secondary" onClick={onBackToDashboard}>Back to Dashboard</button>
      </div>
    );
  }

  const { submission, answers, proctoringLogs, auditLogs } = data;

  // Calculate breakdown
  let autoGradedScore = 0;
  let autoGradedMax = 0;
  let writtenScore = 0;
  let writtenMax = 0;
  let pendingWrittenCount = 0;

  answers.forEach(a => {
    if (a.type === 'mcq' || a.type === 'true_false') {
      autoGradedScore += (a.awarded_score || 0);
      autoGradedMax += (a.max_points || 0);
    } else {
      writtenScore += (a.awarded_score || 0);
      writtenMax += (a.max_points || 0);
      if (a.manual_graded === 0) pendingWrittenCount++;
    }
  });

  const isPassed = submission.passed === 1;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBackToDashboard}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Hero Scorecard Card */}
      <div 
        style={{
          background: isPassed 
            ? 'linear-gradient(135deg, #065f46, #059669)' 
            : 'linear-gradient(135deg, #991b1b, #dc2626)',
          color: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              OFFICIAL ASSESSMENT SCORECARD
            </span>
            <h1 style={{ color: '#ffffff', fontSize: '1.9rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              {submission.assessment_title}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9rem' }}>
              Student: <strong>{submission.student_name}</strong> | Course: <strong>{submission.subject}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '1.25rem 2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.8)' }}>
                FINAL SCORE
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                {submission.total_score}
                <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>
                  /{submission.max_score}
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 50, background: 'rgba(255, 255, 255, 0.25)' }}></div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.8)' }}>
                RESULT
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                {submission.percentage}% (Pass: {submission.passing_marks})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>MCQ AUTO-GRADED</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-600)', marginTop: '0.25rem' }}>
            {autoGradedScore} / {autoGradedMax}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Evaluated instantaneously by system
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>WRITTEN / DESCRIPTIVE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            {writtenScore} / {writtenMax}
          </div>
          <div style={{ fontSize: '0.75rem', color: pendingWrittenCount > 0 ? '#b45309' : '#059669', marginTop: '0.25rem' }}>
            {pendingWrittenCount > 0 ? `${pendingWrittenCount} Pending teacher review` : 'Graded with instructor feedback'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>WEBCAM PROCTORING</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: submission.proctoring_status === 'clean' ? '#059669' : '#b91c1c', marginTop: '0.25rem', textTransform: 'capitalize' }}>
            {submission.proctoring_status}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {submission.tab_switch_count} Tab-switch alerts recorded
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADMIN AUDIT TRAIL</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: auditLogs.length > 0 ? 'var(--admin-accent)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
            {auditLogs.length} Adjustments
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {auditLogs.length > 0 ? 'Official overrides in history' : 'Original grade maintained'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'questions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('questions')}
        >
          <FileText size={15} />
          Question-by-Question Evaluation ({answers.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'proctoring' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('proctoring')}
        >
          <Camera size={15} />
          Webcam Integrity & Violations ({proctoringLogs.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audit')}
          style={activeTab === 'audit' ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : {}}
        >
          <History size={15} />
          Score Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Questions Detailed Review */}
      {activeTab === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {answers.map((item, idx) => {
            const isMcq = item.type === 'mcq' || item.type === 'true_false';
            const isCorrect = item.is_correct === 1;
            const hasScore = item.awarded_score !== null && item.awarded_score !== undefined;

            // Check if there is an audit log for this specific question
            const questionAudit = auditLogs.find(l => l.question_id === item.question_id);

            return (
              <div 
                key={item.question_id} 
                className="card"
                style={{
                  borderLeft: isMcq 
                    ? `5px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                    : `5px solid ${item.manual_graded === 1 ? '#059669' : '#f59e0b'}`
                }}
              >
                <div className="card-header" style={{ background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>
                      Q{idx + 1}
                    </span>
                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      {item.type}
                    </span>
                    {isMcq ? (
                      isCorrect ? (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> Auto-Graded Correct
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <XCircle size={12} /> Auto-Graded Incorrect
                        </span>
                      )
                    ) : item.manual_graded === 1 ? (
                      <span className="badge badge-success">
                        <CheckCircle size={12} /> Evaluated by {item.graded_by_name || 'Instructor'}
                      </span>
                    ) : (
                      <span className="badge badge-warning">
                        <Clock size={12} /> Pending Manual Review
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: (item.awarded_score || 0) > 0 ? '#059669' : '#b91c1c' }}>
                      {item.awarded_score || 0}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}> / {item.max_points} pts</span>
                  </div>
                </div>

                <div className="card-body">
                  {/* Question Text */}
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                    {item.question_text}
                  </div>

                  {/* Student's Answer */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      YOUR SUBMITTED ANSWER:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: item.student_answer ? 'normal' : 'italic' }}>
                      {item.student_answer || '[No response submitted]'}
                    </div>
                  </div>

                  {/* Correct Key (For MCQ) */}
                  {isMcq && (
                    <div style={{ background: '#ecfdf5', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.2rem' }}>
                        CORRECT ANSWER KEY:
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#047857', fontWeight: 600 }}>
                        {item.correct_answer}
                      </div>
                    </div>
                  )}

                  {/* Explanation or Rubric */}
                  {item.explanation && (
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', marginBottom: '0.75rem' }}>
                      <strong style={{ color: '#1e40af' }}>Solution / Scoring Rubric: </strong>
                      {item.explanation}
                    </div>
                  )}

                  {/* Teacher Feedback if written */}
                  {item.teacher_feedback && (
                    <div style={{ background: '#fef3c7', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>
                      <strong>Instructor Feedback: </strong>
                      {item.teacher_feedback}
                    </div>
                  )}

                  {/* Prominent Admin Override Callout if altered! */}
                  {questionAudit && (
                    <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--admin-accent)', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <ShieldAlert size={16} />
                        <span>ADMINISTRATIVE MARK OVERRIDE VERIFIED</span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: '#4c1d95', lineHeight: '1.4' }}>
                        Score altered from <strong>{questionAudit.old_score}</strong> to <strong>{questionAudit.new_score}</strong> by <strong>{questionAudit.changed_by_name} ({questionAudit.changed_by_role.toUpperCase()})</strong>.
                        <div style={{ marginTop: '0.35rem', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.7)', padding: '0.4rem 0.6rem', borderRadius: 4, border: '1px solid #ddd6fe' }}>
                          "Reason: {questionAudit.reason}"
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Proctoring Logs & Snapshots */}
      {activeTab === 'proctoring' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Camera size={20} color="var(--primary-600)" />
              <span>Webcam Integrity Audit & Session Activity</span>
            </div>
            <span className="badge badge-info">{proctoringLogs.length} Events</span>
          </div>

          <div className="card-body">
            {/* Snapshots Gallery */}
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>Captured Webcam Integrity Snapshots</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {proctoringLogs.filter(l => l.snapshot_path).length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', gridColumn: '1/-1' }}>
                  No image snapshots captured for this session.
                </div>
              ) : (
                proctoringLogs.filter(l => l.snapshot_path).map((snap) => (
                  <div key={snap.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#0f172a' }}>
                    <img 
                      src={snap.snapshot_path} 
                      alt="Proctor Snapshot" 
                      style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
                    />
                    <div style={{ padding: '0.5rem', background: '#ffffff', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>{new Date(snap.created_at).toLocaleTimeString()}</div>
                      <div style={{ fontSize: '0.7rem', color: snap.severity === 'violation' ? '#b91c1c' : '#059669', fontWeight: 600 }}>
                        {snap.event_type}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Event Timeline */}
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>Proctoring Event Timeline</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {proctoringLogs.map((log) => {
                const isViolation = log.severity === 'violation' || log.event_type === 'tab_switch';
                return (
                  <div 
                    key={log.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isViolation ? '#fee2e2' : '#f8fafc',
                      border: `1px solid ${isViolation ? '#fecaca' : 'var(--border-color)'}`,
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {isViolation ? (
                        <AlertTriangle size={18} color="#dc2626" />
                      ) : (
                        <ShieldCheck size={18} color="#059669" />
                      )}
                      <div>
                        <strong style={{ color: isViolation ? '#991b1b' : 'var(--text-main)', display: 'block' }}>
                          {log.event_type.toUpperCase()}: {log.message}
                        </strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Complete Audit History */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header" style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}>
            <div className="card-title" style={{ color: 'var(--admin-accent)' }}>
              <History size={20} />
              <span>Full Database Audit Trail for this Assessment</span>
            </div>
            <span className="badge" style={{ background: '#ede9fe', color: 'var(--admin-accent)' }}>
              {auditLogs.length} Official Overrides
            </span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No score modifications have been recorded. Original auto-grade & instructor marks are unaltered.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Target</th>
                      <th>Previous Score</th>
                      <th>New Score</th>
                      <th>Difference</th>
                      <th>Adjusted By</th>
                      <th>Role</th>
                      <th>Audit Reason & Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {log.question_id ? `Question #${log.question_id}` : 'Overall Score'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{log.old_score}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--admin-accent)' }}>
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
                          <em>{log.reason}</em>
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
    </div>
  );
}
