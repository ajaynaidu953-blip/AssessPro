import React, { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CheckCircle2, History, AlertTriangle } from 'lucide-react';

export default function AdminOverrideModal({ 
  isOpen, 
  onClose, 
  submission, 
  question = null, 
  onSuccess 
}) {
  const { authFetch } = useAuth();

  const isQuestionOverride = Boolean(question);
  const currentScore = isQuestionOverride 
    ? (question.awarded_score !== null && question.awarded_score !== undefined ? question.awarded_score : 0)
    : (submission?.total_score || 0);

  const maxPoints = isQuestionOverride ? (question.max_points || question.points) : (submission?.max_score || 100);

  const [newScore, setNewScore] = useState(currentScore);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync initial state when modal opens or question changes
  React.useEffect(() => {
    if (isOpen) {
      setNewScore(currentScore);
      setReason('');
      setError(null);
    }
  }, [isOpen, currentScore]);

  const presetReasons = [
    'Academic review: Grade adjustment granted after student re-evaluation appeal.',
    'Administrative moderation: Grace marks awarded due to curriculum syllabus ambiguity.',
    'Proctoring evaluation: Manual penalty deduction after violation timeline review.',
    'Bonus score awarded for advanced technical depth and comprehensive explanation.'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newScore === '' || isNaN(Number(newScore))) {
      setError('Please enter a valid numeric score.');
      return;
    }

    const numScore = Number(newScore);
    if (numScore < 0) {
      setError('Score cannot be negative.');
      return;
    }

    if (!reason.trim()) {
      setError('A comprehensive justification reason is mandatory for admin audit tracking.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        submission_id: submission.id,
        new_score: numScore,
        reason: reason.trim(),
        ...(isQuestionOverride ? { question_id: question.question_id || question.id } : {})
      };

      const res = await authFetch('/api/grades/admin-override', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to override mark.');
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!submission) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-accent)' }}>
          <ShieldAlert size={20} />
          <span>Admin Mark Override & Audit Trail</span>
        </div>
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student:</span>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{submission.student_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assessment:</span>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{submission.assessment_title}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target:</span>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-accent)' }}>
              {isQuestionOverride 
                ? `Question #${question.order_num || question.id} (${question.type?.toUpperCase()})` 
                : 'Overall Assessment Total Score'}
            </span>
          </div>
        </div>

        {isQuestionOverride && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>QUESTION TEXT:</div>
            <div>{question.question_text}</div>
            {question.student_answer && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem' }}>STUDENT'S ANSWER: </span>
                <span style={{ fontStyle: 'italic' }}>{question.student_answer}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label className="form-label">Current Mark</label>
            <div style={{ padding: '0.65rem 0.85rem', background: '#f1f5f9', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontWeight: 700, color: 'var(--text-muted)' }}>
              {currentScore} / {maxPoints}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ color: 'var(--admin-accent)' }}>
              New Administrative Mark *
            </label>
            <input 
              type="number"
              step="0.5"
              min="0"
              max={maxPoints}
              className="form-control"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              required
              style={{ fontWeight: 700, fontSize: '1rem' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Audit Justification Reason *</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mandatory for compliance log</span>
          </label>
          <textarea 
            className="form-control"
            rows="3"
            placeholder="State the formal academic or administrative justification for altering this score..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        {/* Preset quick reasons */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            QUICK AUDIT PRESETS:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {presetReasons.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReason(p)}
                style={{
                  textAlign: 'left',
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ backgroundColor: 'var(--admin-accent)', borderColor: 'var(--admin-accent)' }}
          >
            {loading ? 'Committing Override...' : 'Apply Override & Save to Audit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
