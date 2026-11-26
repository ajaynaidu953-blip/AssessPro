import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  CheckCircle, 
  Save, 
  Clock, 
  AlertTriangle, 
  Camera, 
  FileText, 
  Award, 
  UserCheck, 
  History,
  ShieldAlert
} from 'lucide-react';

export default function TeacherGradeSubmission({ submissionId, onBack }) {
  const { authFetch, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('grading'); // 'grading', 'proctoring', 'audit'

  // Local state for grading inputs: { [question_id]: { score: number, feedback: string } }
  const [gradesInput, setGradesInput] = useState({});
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/submissions/${submissionId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load submission');

      setData(result);

      // Initialize inputs from existing data
      const initialGrades = {};
      (result.answers || []).forEach(a => {
        initialGrades[a.question_id] = {
          score: a.awarded_score !== null && a.awarded_score !== undefined ? a.awarded_score : '',
          feedback: a.teacher_feedback || ''
        };
      });
      setGradesInput(initialGrades);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId) loadData();
  }, [submissionId]);

  const handleScoreChange = (qId, val) => {
    setGradesInput({
      ...gradesInput,
      [qId]: {
        ...gradesInput[qId],
        score: val
      }
    });
  };

  const handleFeedbackChange = (qId, val) => {
    setGradesInput({
      ...gradesInput,
      [qId]: {
        ...gradesInput[qId],
        feedback: val
      }
    });
  };

  const saveSingleGrade = async (questionId, maxPoints) => {
    const item = gradesInput[questionId];
    if (!item || item.score === '' || isNaN(Number(item.score))) {
      alert('Please enter a valid numeric score.');
      return;
    }

    const numScore = Number(item.score);
    if (numScore < 0 || numScore > maxPoints) {
      alert(`Score must be between 0 and maximum points (${maxPoints}).`);
      return;
    }

    setSavingQuestionId(questionId);
    try {
      const res = await authFetch('/api/grades/manual-grade', {
        method: 'POST',
        body: JSON.stringify({
          submission_id: submissionId,
          question_id: questionId,
          score: numScore,
          teacher_feedback: item.feedback
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save grade');

      setSuccessMessage(`Score (${numScore} pts) and feedback saved successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err) {
      alert('Error saving grade: ' + err.message);
    } finally {
      setSavingQuestionId(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading submission details...</div>;
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
  const writtenAnswers = answers.filter(a => a.type === 'written');
  const mcqAnswers = answers.filter(a => a.type === 'mcq' || a.type === 'true_false');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Submissions
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
            Submission #{submission.id}
          </span>
          <span className={`badge ${submission.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
            Status: {submission.status.toUpperCase()}
          </span>
        </div>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Student Profile & Score Summary */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span className="badge badge-neutral" style={{ marginBottom: '0.25rem' }}>
                {submission.subject}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{submission.assessment_title}</h2>
              <div style={{ marginTop: '0.4rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Student: <strong style={{ color: 'var(--text-main)' }}>{submission.student_name}</strong> ({submission.student_email})
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Submitted: {new Date(submission.submit_time || submission.created_at).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT SCORE</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary-600)' }}>
                  {submission.total_score}
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/{submission.max_score}</span>
                </div>
              </div>

              <div style={{ width: 1, height: 40, background: 'var(--border-color)' }}></div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PERCENTAGE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: submission.passed === 1 ? '#059669' : '#dc2626' }}>
                  {submission.percentage}%
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: submission.passed === 1 ? '#059669' : '#dc2626' }}>
                  {submission.passed === 1 ? 'PASSED' : 'FAILED'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn btn-sm ${activeTab === 'grading' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('grading')}
        >
          <FileText size={15} />
          Written Answers Grading ({writtenAnswers.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('auto')}
        >
          <CheckCircle size={15} />
          Auto-Graded MCQs ({mcqAnswers.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'proctoring' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('proctoring')}
        >
          <Camera size={15} />
          Webcam Proctoring Report ({proctoringLogs.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audit')}
          style={activeTab === 'audit' ? { background: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' } : {}}
        >
          <History size={15} />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Written Questions Manual Grading */}
      {activeTab === 'grading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {writtenAnswers.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              This assessment does not contain descriptive written questions.
            </div>
          ) : (
            writtenAnswers.map((item, idx) => {
              const currentInput = gradesInput[item.question_id] || { score: '', feedback: '' };
              const isGraded = item.manual_graded === 1;

              return (
                <div key={item.question_id} className="card" style={{ borderLeft: `5px solid ${isGraded ? '#059669' : '#f59e0b'}` }}>
                  <div className="card-header" style={{ background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span className="badge badge-info" style={{ fontWeight: 800 }}>
                        Written Question #{item.order_num || idx + 1}
                      </span>
                      {isGraded ? (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> Graded: {item.awarded_score}/{item.max_points} pts
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <Clock size={12} /> Pending Grading
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Max Points: {item.max_points}
                    </div>
                  </div>

                  <div className="card-body">
                    {/* Prompt */}
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.85rem', color: 'var(--text-main)' }}>
                      {item.question_text}
                    </div>

                    {/* Rubric */}
                    {item.explanation && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#1e40af', marginBottom: '1rem' }}>
                        <strong>Instructor Grading Rubric: </strong>
                        {item.explanation}
                      </div>
                    )}

                    {/* Student's Answer */}
                    <div style={{ background: '#f8fafc', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        STUDENT'S SUBMITTED WRITTEN RESPONSE:
                      </div>
                      <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                        {item.student_answer || '[No response provided by student]'}
                      </div>
                    </div>

                    {/* Instructor Score & Feedback Input */}
                    <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: '#f0fdf4' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                        <div>
                          <label className="form-label" style={{ fontWeight: 700, color: '#065f46' }}>
                            Awarded Marks *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={item.max_points}
                            className="form-control"
                            style={{ fontWeight: 800, fontSize: '1.1rem', borderColor: '#a7f3d0' }}
                            value={currentInput.score}
                            onChange={(e) => handleScoreChange(item.question_id, e.target.value)}
                            placeholder={`0 - ${item.max_points}`}
                          />
                          <span style={{ fontSize: '0.7rem', color: '#047857' }}>Max: {item.max_points} pts</span>
                        </div>

                        <div>
                          <label className="form-label" style={{ fontWeight: 700, color: '#065f46' }}>
                            Feedback Comments for Student
                          </label>
                          <textarea
                            className="form-control"
                            rows="2"
                            placeholder="Provide constructive feedback, noting strong points or areas for technical improvement..."
                            value={currentInput.feedback}
                            onChange={(e) => handleFeedbackChange(item.question_id, e.target.value)}
                            style={{ borderColor: '#a7f3d0', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div style={{ paddingTop: '1.75rem' }}>
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => saveSingleGrade(item.question_id, item.max_points)}
                            disabled={savingQuestionId === item.question_id}
                            style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                          >
                            <Save size={16} />
                            {savingQuestionId === item.question_id ? 'Saving...' : 'Save Grade'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Auto-Graded MCQs */}
      {activeTab === 'auto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mcqAnswers.map((item, idx) => (
            <div key={item.question_id} className="card">
              <div className="card-header" style={{ background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-info">MCQ #{item.order_num || idx + 1}</span>
                  {item.is_correct === 1 ? (
                    <span className="badge badge-success">
                      <CheckCircle size={12} /> Correct (+{item.awarded_score} pts)
                    </span>
                  ) : (
                    <span className="badge badge-danger">Incorrect (0 pts)</span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {item.awarded_score} / {item.max_points} pts
                </div>
              </div>
              <div className="card-body">
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{item.question_text}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Student Selected: </span>
                    <span>{item.student_answer || '[None]'}</span>
                  </div>
                  <div style={{ padding: '0.6rem 0.85rem', background: '#ecfdf5', borderRadius: 'var(--radius-md)', border: '1px solid #a7f3d0', color: '#065f46' }}>
                    <span style={{ fontWeight: 700 }}>Correct Answer Key: </span>
                    <span>{item.correct_answer}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Proctoring Report */}
      {activeTab === 'proctoring' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Camera size={18} color="var(--primary-600)" />
              <span>Webcam Snapshots & Anti-Cheating Event Timeline</span>
            </div>
            <span className="badge badge-neutral">
              Status: {submission.proctoring_status.toUpperCase()}
            </span>
          </div>

          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {proctoringLogs.filter(l => l.snapshot_path).length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No snapshots uploaded.</div>
              ) : (
                proctoringLogs.filter(l => l.snapshot_path).map((snap) => (
                  <div key={snap.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#0f172a' }}>
                    <img src={snap.snapshot_path} alt="Proctor Snapshot" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                    <div style={{ padding: '0.5rem', background: '#ffffff', fontSize: '0.75rem' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{new Date(snap.created_at).toLocaleTimeString()}</div>
                      <div style={{ color: snap.severity === 'violation' ? '#b91c1c' : '#059669', fontWeight: 600 }}>{snap.event_type}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Proctor Activity Stream</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {proctoringLogs.map(l => (
                <div key={l.id} style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', background: l.severity === 'violation' ? '#fee2e2' : '#f8fafc', border: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{l.message}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header" style={{ background: '#f5f3ff' }}>
            <div className="card-title" style={{ color: 'var(--admin-accent)' }}>
              <History size={18} />
              <span>Score Change History & Administrative Overrides</span>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No score modifications have been recorded for this student submission.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Target</th>
                      <th>Old Score</th>
                      <th>New Score</th>
                      <th>Diff</th>
                      <th>Modifier</th>
                      <th>Role</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{log.question_id ? `Q#${log.question_id}` : 'Total Score'}</td>
                        <td>{log.old_score}</td>
                        <td style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>{log.new_score}</td>
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
      )}
    </div>
  );
}
