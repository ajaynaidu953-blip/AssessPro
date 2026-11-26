import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminOverrideModal from '../components/AdminOverrideModal';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Award, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit3, 
  History, 
  Camera, 
  AlertTriangle 
} from 'lucide-react';

export default function AdminSubmissionDetails({ submissionId, onBack }) {
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // State for override modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [targetQuestion, setTargetQuestion] = useState(null); // null = overall score override

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/submissions/${submissionId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load submission');
      setData(result);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId) loadData();
  }, [submissionId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading administrative submission record...</div>;
  }

  if (!data || !data.submission) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Submission record not found.</p>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
      </div>
    );
  }

  const { submission, answers, proctoringLogs, auditLogs } = data;

  const handleOpenOverride = (questionObj = null) => {
    setTargetQuestion(questionObj);
    setOverrideModalOpen(true);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Admin Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="role-badge admin" style={{ fontSize: '0.8rem' }}>
            Dean / Admin Override Mode Active
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: 'var(--admin-accent)', borderColor: 'var(--admin-accent)', fontWeight: 700 }}
            onClick={() => handleOpenOverride(null)}
          >
            <ShieldAlert size={15} />
            Override Overall Total Score
          </button>
        </div>
      </div>

      {/* Hero Summary Card */}
      <div className="card" style={{ marginBottom: '1.75rem', borderLeft: '6px solid var(--admin-accent)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span className="badge badge-neutral" style={{ marginBottom: '0.25rem' }}>
                {submission.subject}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{submission.assessment_title}</h2>
              <div style={{ marginTop: '0.4rem', fontSize: '0.875rem' }}>
                Student: <strong>{submission.student_name}</strong> ({submission.student_email})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Exam ID: #{submission.assessment_id} | Submission ID: #{submission.id} | Proctoring: <strong>{submission.proctoring_status.toUpperCase()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '1.1rem 1.75rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }}>CURRENT TOTAL MARK</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--admin-accent)' }}>
                  {submission.total_score}
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/{submission.max_score}</span>
                </div>
              </div>

              <div style={{ width: 1, height: 45, background: '#c4b5fd' }}></div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }}>RESULT</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: submission.passed === 1 ? '#059669' : '#dc2626' }}>
                  {submission.percentage}%
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: submission.passed === 1 ? '#059669' : '#dc2626' }}>
                  {submission.passed === 1 ? 'PASSED' : 'FAILED'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Overrides List */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Question-by-Question Marks & Administrative Overrides
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Admins have full authority to override ANY student's mark—including auto-graded MCQs and instructor graded written answers.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {answers.map((item, idx) => {
            const isMcq = item.type === 'mcq' || item.type === 'true_false';
            const isCorrect = item.is_correct === 1;
            const questionAudit = auditLogs.find(l => l.question_id === item.question_id);

            return (
              <div key={item.question_id} className="card" style={{ borderLeft: questionAudit ? '5px solid var(--admin-accent)' : '1px solid var(--border-color)' }}>
                <div className="card-header" style={{ background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="badge badge-info" style={{ fontWeight: 800 }}>
                      Q{idx + 1}
                    </span>
                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                      {item.type}
                    </span>
                    {isMcq ? (
                      isCorrect ? (
                        <span className="badge badge-success">Auto-Graded Correct</span>
                      ) : (
                        <span className="badge badge-danger">Auto-Graded Incorrect</span>
                      )
                    ) : item.manual_graded === 1 ? (
                      <span className="badge badge-success">Teacher Graded</span>
                    ) : (
                      <span className="badge badge-warning">Pending Review</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: (item.awarded_score || 0) > 0 ? '#059669' : '#b91c1c' }}>
                        {item.awarded_score || 0}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}> / {item.max_points} pts</span>
                    </div>

                    {/* Admin Override Action Button */}
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ backgroundColor: '#f5f3ff', color: 'var(--admin-accent)', border: '1px solid #c4b5fd', fontWeight: 700 }}
                      onClick={() => handleOpenOverride(item)}
                    >
                      <Edit3 size={13} />
                      Override Mark
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <div style={{ fontWeight: 600, fontSize: '0.975rem', marginBottom: '0.85rem' }}>
                    {item.question_text}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        STUDENT ANSWER:
                      </span>
                      <span>{item.student_answer || '[No response]'}</span>
                    </div>

                    <div style={{ background: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontWeight: 700, color: '#1e40af', display: 'block', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        {isMcq ? 'CORRECT KEY:' : 'SCORING RUBRIC / KEY:'}
                      </span>
                      <span>{isMcq ? item.correct_answer : item.explanation || 'Instructor evaluation'}</span>
                    </div>
                  </div>

                  {item.teacher_feedback && (
                    <div style={{ fontSize: '0.825rem', color: '#92400e', background: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                      <strong>Instructor Feedback: </strong>{item.teacher_feedback}
                    </div>
                  )}

                  {/* Audit Record if modified */}
                  {questionAudit && (
                    <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.825rem' }}>
                      <div style={{ color: 'var(--admin-accent)', fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <History size={14} />
                        <span>Audit Log: Score changed from {questionAudit.old_score} to {questionAudit.new_score} by {questionAudit.changed_by_name} ({questionAudit.changed_by_role})</span>
                      </div>
                      <div style={{ color: '#4c1d95', fontStyle: 'italic' }}>
                        "Reason: {questionAudit.reason}" ({new Date(questionAudit.created_at).toLocaleString()})
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Audit History Section for this submission */}
      <div className="card">
        <div className="card-header" style={{ background: '#f5f3ff' }}>
          <div className="card-title" style={{ color: 'var(--admin-accent)' }}>
            <History size={18} />
            <span>Complete Audit Trail of Mark Modifications</span>
          </div>
          <span className="badge" style={{ background: '#ede9fe', color: 'var(--admin-accent)' }}>
            {auditLogs.length} Changes Recorded
          </span>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {auditLogs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No score adjustments recorded. The database holds original marks.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Target</th>
                    <th>Old Mark</th>
                    <th>New Mark</th>
                    <th>Difference</th>
                    <th>Authorized By</th>
                    <th>Role</th>
                    <th>Mandatory Audit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{log.question_id ? `Question #${log.question_id}` : 'Total Submission Score'}</td>
                      <td>{log.old_score}</td>
                      <td style={{ fontWeight: 800, color: 'var(--admin-accent)' }}>{log.new_score}</td>
                      <td>
                        <span className={`audit-diff ${log.score_difference >= 0 ? 'plus' : 'minus'}`}>
                          {log.score_difference >= 0 ? `+${log.score_difference}` : log.score_difference}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{log.changed_by_name}</td>
                      <td><span className={`role-badge ${log.changed_by_role}`}>{log.changed_by_role}</span></td>
                      <td style={{ fontSize: '0.825rem' }}><em>{log.reason}</em></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Override Modal */}
      <AdminOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        submission={submission}
        question={targetQuestion}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
