import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle, 
  Save, 
  HelpCircle, 
  Camera, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';

export default function CreateAssessment({ editId = null, onCancel, onSuccess }) {
  const { authFetch } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passingMarks, setPassingMarks] = useState(20);
  const [webcamRequired, setWebcamRequired] = useState(true);
  const [snapshotInterval, setSnapshotInterval] = useState(30);
  const [tabSwitchLimit, setTabSwitchLimit] = useState(3);
  const [instructions, setInstructions] = useState('Maintain continuous webcam visibility. Do not leave the assessment tab.');

  const [questions, setQuestions] = useState([
    {
      id: 1,
      type: 'mcq',
      question_text: 'What is the primary function of an API Gateway in microservices architecture?',
      options: [
        'Centralized request routing, authentication, and rate limiting',
        'Direct physical hard drive data storage',
        'Compiling frontend JavaScript assets',
        'Generating SSL certificates automatically'
      ],
      correct_answer: 'Centralized request routing, authentication, and rate limiting',
      points: 5,
      explanation: 'An API Gateway acts as a single entry point providing reverse proxy, authentication, rate limiting, and routing.'
    },
    {
      id: 2,
      type: 'true_false',
      question_text: 'HTTP/2 supports multiplexing multiple requests over a single TCP connection.',
      options: ['True', 'False'],
      correct_answer: 'True',
      points: 5,
      explanation: 'True: HTTP/2 binary framing layer enables interleaved concurrent requests on one connection.'
    },
    {
      id: 3,
      type: 'written',
      question_text: 'Explain the difference between Optimistic Concurrency Control and Pessimistic Locking in database transactions.',
      options: [],
      correct_answer: '',
      points: 15,
      explanation: 'Grading Rubric: Definition of Optimistic concurrency with version checking (7 pts); Pessimistic locks and isolation levels (8 pts).'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // If editing, load existing assessment
  useEffect(() => {
    if (editId) {
      async function loadExisting() {
        setLoading(true);
        try {
          const res = await authFetch(`/api/assessments/${editId}`);
          const data = await res.json();
          if (res.ok) {
            const a = data.assessment;
            setTitle(a.title);
            setDescription(a.description || '');
            setSubject(a.subject);
            setDurationMinutes(a.duration_minutes);
            setPassingMarks(a.passing_marks);
            setWebcamRequired(a.webcam_required === 1);
            setSnapshotInterval(a.snapshot_interval_seconds || 30);
            setTabSwitchLimit(a.tab_switch_limit || 3);
            setInstructions(a.instructions || '');
            if (data.questions && data.questions.length > 0) {
              setQuestions(data.questions);
            }
          }
        } catch (err) {
          alert('Failed to load assessment: ' + err.message);
        } finally {
          setLoading(false);
        }
      }
      loadExisting();
    }
  }, [editId]);

  // Question manipulation
  const addQuestion = (type = 'mcq') => {
    const newQ = {
      id: Date.now(),
      type,
      question_text: '',
      options: type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : type === 'true_false' ? ['True', 'False'] : [],
      correct_answer: type === 'mcq' ? 'Option A' : type === 'true_false' ? 'True' : '',
      points: type === 'written' ? 15 : 5,
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) {
      alert('An assessment must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updated = [...questions];
    const prevVal = updated[qIdx].options[optIdx];
    updated[qIdx].options[optIdx] = value;
    // If the changed option was the selected correct answer, keep sync
    if (updated[qIdx].correct_answer === prevVal) {
      updated[qIdx].correct_answer = value;
    }
    setQuestions(updated);
  };

  const addOption = (qIdx) => {
    const updated = [...questions];
    updated[qIdx].options.push(`New Option ${updated[qIdx].options.length + 1}`);
    setQuestions(updated);
  };

  const removeOption = (qIdx, optIdx) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) {
      alert('Multiple choice questions require at least two options.');
      return;
    }
    const removed = updated[qIdx].options.splice(optIdx, 1)[0];
    if (updated[qIdx].correct_answer === removed) {
      updated[qIdx].correct_answer = updated[qIdx].options[0];
    }
    setQuestions(updated);
  };

  // Live total points
  const totalPoints = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) {
      alert('Please provide a title and subject for this assessment.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        duration_minutes: Number(durationMinutes),
        total_marks: totalPoints,
        passing_marks: Number(passingMarks),
        webcam_required: webcamRequired ? 1 : 0,
        snapshot_interval_seconds: Number(snapshotInterval),
        tab_switch_limit: Number(tabSwitchLimit),
        fullscreen_enforced: 1,
        show_result_immediately: 1,
        instructions: instructions.trim(),
        questions
      };

      const url = editId ? `/api/assessments/${editId}` : '/api/assessments';
      const method = editId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save assessment');
      }

      onSuccess();
    } catch (err) {
      alert('Error saving assessment: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading assessment...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>
            {questions.length} Questions | {totalPoints} Total Points
          </span>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Publishing...' : editId ? 'Update Assessment' : 'Publish Assessment'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Assessment Overview Card */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="card-header">
            <div className="card-title">
              <FileText size={18} color="var(--teacher-accent)" />
              <span>Assessment Details & Specifications</span>
            </div>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Assessment Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Distributed Cloud Architectures Midterm Examination"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Subject / Course *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cloud Computing"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Minutes) *</label>
                <input
                  type="number"
                  min="5"
                  max="240"
                  className="form-control"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Passing Marks</label>
                <input
                  type="number"
                  min="1"
                  max={totalPoints}
                  className="form-control"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Objectives</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Brief summary of syllabus topics assessed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Proctoring Settings Card */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ background: '#f8fafc' }}>
            <div className="card-title">
              <Camera size={18} color="var(--primary-600)" />
              <span>Webcam & Anti-Cheating Proctoring Configurations</span>
            </div>
          </div>

          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={webcamRequired}
                    onChange={(e) => setWebcamRequired(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary-600)' }}
                  />
                  <span>Enforce Webcam Monitoring</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.4rem', lineHeight: '1.4' }}>
                  Students must consent to camera surveillance and transmit verification snapshots.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Snapshot Capture Interval (Seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  className="form-control"
                  value={snapshotInterval}
                  onChange={(e) => setSnapshotInterval(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Default: 30s</span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tab-Switch Warning Tolerance</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-control"
                  value={tabSwitchLimit}
                  onChange={(e) => setTabSwitchLimit(e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flags session after {tabSwitchLimit} violations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Builder Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Assessment Questions ({questions.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addQuestion('mcq')}>
              <Plus size={14} /> Add MCQ
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addQuestion('true_false')}>
              <Plus size={14} /> Add True/False
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addQuestion('written')}>
              <Plus size={14} /> Add Written / Essay
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="card">
              <div className="card-header" style={{ background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-info" style={{ fontWeight: 800 }}>
                    Question {idx + 1}
                  </span>
                  <select
                    className="form-control"
                    style={{ padding: '0.25rem 0.5rem', width: 'auto', fontSize: '0.8rem', fontWeight: 700 }}
                    value={q.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      updateQuestion(idx, 'type', newType);
                      if (newType === 'mcq' && (!q.options || q.options.length < 2)) {
                        updateQuestion(idx, 'options', ['Option A', 'Option B', 'Option C', 'Option D']);
                        updateQuestion(idx, 'correct_answer', 'Option A');
                      } else if (newType === 'true_false') {
                        updateQuestion(idx, 'options', ['True', 'False']);
                        updateQuestion(idx, 'correct_answer', 'True');
                      }
                    }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="true_false">True / False</option>
                    <option value="written">Written / Descriptive (Manual Teacher Grade)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Points:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="form-control"
                      style={{ width: '65px', padding: '0.25rem 0.5rem', textAlign: 'center', fontWeight: 700 }}
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, 'points', Number(e.target.value))}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeQuestion(idx)}
                    style={{ color: '#ef4444', padding: '0.35rem 0.6rem' }}
                    title="Remove Question"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="card-body">
                {/* Question Text */}
                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter the question prompt clearly..."
                    value={q.question_text}
                    onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                    required
                  />
                </div>

                {/* MCQ Options */}
                {q.type === 'mcq' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Options & Auto-Grade Key (Select the correct radio button)</span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => addOption(idx)}>
                        <Plus size={12} /> Add Choice
                      </button>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="radio"
                            name={`correct_${q.id || idx}`}
                            checked={q.correct_answer === opt}
                            onChange={() => updateQuestion(idx, 'correct_answer', opt)}
                            style={{ width: 18, height: 18, accentColor: '#10b981' }}
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            className="form-control"
                            value={opt}
                            onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => removeOption(idx, optIdx)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True / False */}
                {q.type === 'true_false' && (
                  <div className="form-group">
                    <label className="form-label">Correct Key for Auto-Grading</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      {['True', 'False'].map((tf) => (
                        <label key={tf} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="radio"
                            name={`tf_${q.id || idx}`}
                            checked={q.correct_answer === tf}
                            onChange={() => updateQuestion(idx, 'correct_answer', tf)}
                            style={{ width: 18, height: 18, accentColor: '#10b981' }}
                          />
                          <span>{tf}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Written Criteria / Rubric */}
                {q.type === 'written' && (
                  <div className="form-group" style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ color: 'var(--teacher-accent)' }}>
                      Scoring Rubric & Evaluation Guide (For Instructor Manual Grading)
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="e.g. Award 5 marks for conceptual definition, 5 marks for architecture breakdown, 5 marks for edge-case mitigations."
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(idx, 'explanation', e.target.value)}
                    />
                  </div>
                )}

                {/* Explanation for MCQ */}
                {q.type !== 'written' && (
                  <div className="form-group">
                    <label className="form-label">Solution Explanation (Shown to students post-exam)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. HTTP 201 indicates resource creation..."
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(idx, 'explanation', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            <Save size={18} />
            {saving ? 'Publishing...' : editId ? 'Save & Update Assessment' : 'Save & Publish Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
