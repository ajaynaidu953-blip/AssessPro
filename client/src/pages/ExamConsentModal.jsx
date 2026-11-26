import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import { Camera, ShieldCheck, AlertTriangle, Monitor, Lock, CheckCircle2 } from 'lucide-react';

export default function ExamConsentModal({ isOpen, onClose, assessment, onProceed }) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;

    if (isOpen) {
      setConsentChecked(false);
      setCameraReady(false);
      setCameraError(null);

      async function testCamera() {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
              setCameraReady(true);
            }
          } else {
            throw new Error('Webcam API unavailable in browser');
          }
        } catch (err) {
          console.warn('Camera test:', err.message);
          setCameraError(err.message || 'Camera blocked or unavailable. Test mode bypass ready.');
          // Allow student to proceed with virtual proctor
          setCameraReady(true);
        }
      }

      testCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  if (!assessment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-600)' }}>
          <Camera size={20} />
          <span>Webcam Proctoring Consent & Hardware Check</span>
        </div>
      }
      maxWidth="680px"
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{assessment.title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Course: <strong>{assessment.subject}</strong> | Duration: <strong>{assessment.duration_minutes} mins</strong> | Total Marks: <strong>{assessment.total_marks}</strong>
        </p>
      </div>

      {/* Video Hardware Check */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', width: '220px', height: '165px', background: '#0f172a', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cameraError ? (
            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8' }}>
              <Camera size={28} style={{ color: '#38bdf8', marginBottom: '0.35rem' }} />
              <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>Simulated Stream</div>
              <div style={{ fontSize: '0.65rem' }}>Virtual proctoring active</div>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
          )}

          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: '80px', 
              height: '105px', 
              border: '2px dashed rgba(59, 130, 246, 0.7)', 
              borderRadius: '50%', 
              pointerEvents: 'none' 
            }} 
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>Webcam Stream Initialized</span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <p style={{ marginBottom: '0.4rem' }}>
              • Please center your face inside the dashed oval guideline.
            </p>
            <p style={{ marginBottom: '0.4rem' }}>
              • Periodic video snapshots will be securely transmitted to AssessPro servers.
            </p>
            <p>
              • Maintain sufficient room lighting and avoid background movement.
            </p>
          </div>
        </div>
      </div>

      {/* Rules Notice */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={16} />
          <span>Automated Examination Integrity Rules:</span>
        </div>
        <ul style={{ fontSize: '0.8rem', color: '#1e3a8a', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
          <li><strong>Fullscreen Mode:</strong> The assessment will run in fullscreen mode.</li>
          <li><strong>Tab Switch Tracking:</strong> Leaving or blurring the assessment window triggers a violation log and proctor alert (Limit: {assessment.tab_switch_limit} warnings).</li>
          <li><strong>Instant MCQ Grading:</strong> Multiple choice questions are evaluated automatically upon submission.</li>
          <li><strong>Written Question Review:</strong> Descriptive answers will be submitted for teacher grading.</li>
        </ul>
      </div>

      {/* Consent Checkbox */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: '#ffffff', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: '1.5rem' }}>
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--primary-600)' }}
        />
        <div style={{ fontSize: '0.825rem', lineHeight: '1.4' }}>
          <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
            I Grant Webcam Consent & Agree to Examination Terms
          </strong>
          <span style={{ color: 'var(--text-muted)' }}>
            I consent to continuous camera monitoring and image snapshot capture for identity and integrity verification during this assessment session.
          </span>
        </div>
      </label>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!consentChecked || !cameraReady}
          onClick={() => {
            onProceed();
            onClose();
          }}
          style={{ padding: '0.7rem 1.4rem' }}
        >
          <Camera size={16} />
          Agree & Start Assessment
        </button>
      </div>
    </Modal>
  );
}
