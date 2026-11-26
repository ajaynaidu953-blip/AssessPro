import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import WebcamMonitor from '../components/WebcamMonitor';
import Modal from '../components/Modal';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Bookmark, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  RotateCcw,
  ShieldAlert,
  Camera,
  Maximize2
} from 'lucide-react';

export default function ExamInterface({ assessmentId, onExitToDashboard, onExamCompleted }) {
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissionId, setSubmissionId] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers map: { [question_id]: string }
  const [answers, setAnswers] = useState({});
  // Flagged questions: Set of question_ids
  const [flagged, setFlagged] = useState(new Set());

  // Timer: seconds remaining
  const [secondsRemaining, setSecondsRemaining] = useState(1800);
  const timerRef = useRef(null);

  // Proctoring Violations
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [triggerViolationSnapshot, setTriggerViolationSnapshot] = useState(false);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-save debouncer
  const saveTimeoutRef = useRef(null);

  // 1. Start assessment session & initialize
  useEffect(() => {
    async function startSession() {
      setLoading(true);
      try {
        const res = await authFetch('/api/submissions/start', {
          method: 'POST',
          body: JSON.stringify({
            assessment_id: assessmentId,
            consent_given: 1
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize exam');
        }

        setSubmissionId(data.submissionId);
        setAssessment(data.assessment);
        setQuestions(data.questions || []);
        if (data.savedAnswers) {
          setAnswers(data.savedAnswers);
        }

        // Set duration in seconds
        const totalDurationSec = (data.assessment.duration_minutes || 30) * 60;
        setSecondsRemaining(totalDurationSec);
      } catch (err) {
        alert('Error starting assessment: ' + err.message);
        onExitToDashboard();
      } finally {
        setLoading(false);
      }
    }

    startSession();
  }, [assessmentId]);

  // 2. Countdown Timer
  useEffect(() => {
    if (loading || !assessment) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, assessment]);

  // 3. Tab-switch & Window Focus Proctoring Listener
  useEffect(() => {
    if (!submissionId || !assessment) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerTabSwitchViolation('Browser tab switch or window minimization detected.');
      }
    };

    const handleWindowBlur = () => {
      triggerTabSwitchViolation('Assessment window lost focus. Student navigated outside test environment.');
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [submissionId, assessment]);

  const triggerTabSwitchViolation = async (msg) => {
    setTabSwitchCount((prev) => {
      const newCount = prev + 1;
      const limit = assessment?.tab_switch_limit || 3;

      setViolationMessage(
        `WARNING: You have switched away from the assessment window! Violation #${newCount} of ${limit} permitted. Leaving the exam tab is recorded in your proctoring audit log.`
      );
      setShowViolationModal(true);
      setTriggerViolationSnapshot(true);
      setTimeout(() => setTriggerViolationSnapshot(false), 1000);

      // Log violation on backend
      authFetch('/api/proctoring/event', {
        method: 'POST',
        body: JSON.stringify({
          submission_id: submissionId,
          event_type: 'tab_switch',
          message: `${msg} (Violation count: ${newCount})`,
          severity: newCount >= limit ? 'violation' : 'warning'
        })
      }).catch(console.error);

      return newCount;
    });
  };

  // 4. Request Fullscreen
  const enterFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  // 5. Answer Change Handler & Auto-Save
  const handleAnswerChange = (questionId, value) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    // Debounced backend progress save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      authFetch(`/api/submissions/${submissionId}/save-progress`, {
        method: 'POST',
        body: JSON.stringify({
          answers: [{ question_id: questionId, student_answer: value }]
        })
      }).catch(console.error);
    }, 1200);
  };

  const toggleFlag = (questionId) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // 6. Final Exam Submit
  const handleFinalSubmit = async (autoSubmitted = false) => {
    setSubmitting(true);
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      const answersArray = Object.entries(answers).map(([qId, ans]) => ({
        question_id: Number(qId),
        student_answer: ans
      }));

      const res = await authFetch(`/api/submissions/${submissionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersArray,
          proctoring_summary: {
            tabSwitchCount,
            proctoringStatus: tabSwitchCount >= 3 ? 'flagged' : tabSwitchCount > 0 ? 'suspicious' : 'clean'
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit exam');
      }

      setShowSubmitModal(false);
      onExamCompleted(submissionId);
    } catch (err) {
      alert('Submission error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer MM:SS
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Initializing Proctoring Environment...
        </div>
        <p>Configuring secure assessment session and webcam stream.</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header Bar */}
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <span className="badge badge-neutral" style={{ marginBottom: '0.25rem' }}>
            {assessment.subject}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{assessment.title}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Proctoring Status Pill */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '9999px',
              backgroundColor: tabSwitchCount > 0 ? 'var(--warning-bg)' : '#ecfdf5',
              border: `1px solid ${tabSwitchCount > 0 ? '#fde68a' : '#a7f3d0'}`,
              color: tabSwitchCount > 0 ? '#b45309' : '#059669',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <Camera size={14} />
            <span>
              {tabSwitchCount > 0 
                ? `Violations: ${tabSwitchCount}/${assessment.tab_switch_limit}` 
                : 'Proctor: Secure'}
            </span>
          </div>

          {/* Countdown Timer */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: secondsRemaining < 300 ? '#fee2e2' : '#eff6ff',
              color: secondsRemaining < 300 ? '#dc2626' : '#1e40af',
              border: `1px solid ${secondsRemaining < 300 ? '#fecaca' : '#bfdbfe'}`,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '1.15rem'
            }}
          >
            <Clock size={18} />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Fullscreen Button */}
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={enterFullscreen}
            title="Expand Fullscreen"
          >
            <Maximize2 size={15} />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Main Examination Layout */}
      <div className="exam-layout">
        {/* Left: Question Box */}
        <div className="card">
          <div className="card-header" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                {currentQ.type === 'mcq' ? 'Multiple Choice' : currentQ.type === 'true_false' ? 'True / False' : 'Descriptive Written'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                {currentQ.points} Points
              </span>
              <button
                type="button"
                className={`btn btn-sm ${flagged.has(currentQ.id) ? 'btn-warning' : 'btn-secondary'}`}
                onClick={() => toggleFlag(currentQ.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Bookmark size={14} />
                {flagged.has(currentQ.id) ? 'Flagged' : 'Flag'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Question Text */}
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.75rem', lineHeight: '1.6' }}>
              {currentQ.question_text}
            </div>

            {/* Answer Input depending on Type */}
            {(currentQ.type === 'mcq' || currentQ.type === 'true_false') && (
              <div>
                {(currentQ.options || []).map((option, optIdx) => {
                  const isSelected = answers[currentQ.id] === option;
                  return (
                    <div
                      key={optIdx}
                      className={`option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleAnswerChange(currentQ.id, option)}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQ.id}`}
                        className="option-radio"
                        checked={isSelected}
                        onChange={() => handleAnswerChange(currentQ.id, option)}
                      />
                      <div style={{ fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1e40af' : 'var(--text-main)' }}>
                        {option}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.type === 'written' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Type your detailed answer below. Auto-saved as you type.</span>
                  <span>Word count: {(answers[currentQ.id] || '').trim().split(/\s+/).filter(Boolean).length}</span>
                </div>
                <textarea
                  className="form-control"
                  rows="9"
                  placeholder="Provide your structured, detailed written response here..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  style={{ fontSize: '0.925rem', lineHeight: '1.6', fontFamily: 'inherit' }}
                />
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAnswerChange(currentQ.id, '')}
              style={{ color: '#ef4444' }}
            >
              <RotateCcw size={14} />
              Clear Answer
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                <ArrowLeft size={16} />
                Previous
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                >
                  Save & Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowSubmitModal(true)}
                  style={{ fontWeight: 700 }}
                >
                  <Send size={16} />
                  Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Question Palette & Status */}
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '1rem' }}>Question Palette</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {answeredCount}/{questions.length} Done
              </span>
            </div>

            <div className="card-body">
              {/* Palette Grid */}
              <div className="palette-grid">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] && answers[q.id].trim() !== '';
                  const isFlagged = flagged.has(q.id);
                  const isCurrent = idx === currentIndex;

                  let statusClass = 'unvisited';
                  if (isAnswered) statusClass = 'answered';
                  else if (isFlagged) statusClass = 'flagged';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`palette-btn ${statusClass} ${isCurrent ? 'current' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, background: '#10b981', borderRadius: 3, display: 'inline-block' }}></span>
                  <span>Answered</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 3, display: 'inline-block' }}></span>
                  <span>Flagged</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 3, display: 'inline-block' }}></span>
                  <span>Unvisited</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, border: '2px solid #2563eb', borderRadius: 3, display: 'inline-block' }}></span>
                  <span>Current</span>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', fontWeight: 700 }}
                onClick={() => setShowSubmitModal(true)}
              >
                <Send size={15} />
                Finish & Submit Exam
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Live Webcam Monitor */}
      <WebcamMonitor 
        submissionId={submissionId} 
        intervalSeconds={assessment.snapshot_interval_seconds || 30}
        triggerViolationSnapshot={triggerViolationSnapshot}
      />

      {/* Violation Alert Modal */}
      <Modal
        isOpen={showViolationModal}
        onClose={() => setShowViolationModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c' }}>
            <ShieldAlert size={22} />
            <span>Proctoring Alert: Tab Switch Detected!</span>
          </div>
        }
        maxWidth="540px"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#991b1b' }}>
            Focus Lost from Assessment Window
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            {violationMessage}
          </p>

          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '1.5rem', textAlign: 'left' }}>
            • A webcam snapshot was recorded on this alert.<br />
            • Exceeding <strong>{assessment.tab_switch_limit}</strong> warnings flags your session for Dean & Instructor disciplinary review.
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowViolationModal(false);
              enterFullscreen();
            }}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            I Understand - Return to Assessment
          </button>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Final Examination Submission"
        maxWidth="520px"
      >
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Are you sure you are ready to conclude your examination session? Once submitted, your answers cannot be modified.
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span>Total Questions:</span>
              <span style={{ fontWeight: 700 }}>{questions.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#059669' }}>Answered:</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>{answeredCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: unansweredCount > 0 ? '#b91c1c' : 'var(--text-muted)' }}>Unanswered:</span>
              <span style={{ fontWeight: 700, color: unansweredCount > 0 ? '#b91c1c' : 'var(--text-muted)' }}>{unansweredCount}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
            >
              Continue Test
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => handleFinalSubmit(false)}
              disabled={submitting}
              style={{ fontWeight: 700, padding: '0.65rem 1.4rem' }}
            >
              {submitting ? 'Auto-Grading & Submitting...' : 'Yes, Submit Final Exam'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
