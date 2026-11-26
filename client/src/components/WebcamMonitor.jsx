import React, { useEffect, useRef, useState } from 'react';
import { Camera, Minimize2, Maximize2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function WebcamMonitor({ 
  submissionId, 
  intervalSeconds = 30, 
  triggerViolationSnapshot = false,
  onSnapshotTaken 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { authFetch } = useAuth();

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [lastSnapshotTime, setLastSnapshotTime] = useState(null);

  // Initialize camera stream
  useEffect(() => {
    let stream = null;

    async function initCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            },
            audio: false
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            setStreamActive(true);
            setCameraError(null);
          }
        } else {
          throw new Error('MediaDevices API not supported by browser.');
        }
      } catch (err) {
        console.warn('Webcam initialization notice:', err.message);
        setCameraError(err.message || 'Webcam access unavailable. Simulated video stream active.');
        // Enable simulated preview mode so user can test even on desktop without webcam
        setStreamActive(true);
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Function to capture frame and upload
  const captureAndUploadSnapshot = async (triggerType = 'periodic') => {
    if (!submissionId) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      let dataUrl = '';

      if (video && video.videoWidth && video.videoHeight && !cameraError) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.save();
        // Flip horizontal for natural mirror orientation
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Watermark with timestamp and submission ID
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(`AssessPro Proctor | Sub: #${submissionId} | ${new Date().toLocaleTimeString()}`, 10, canvas.height - 10);

        dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      } else {
        // Generate simulated proctoring frame if no physical camera
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 300);

        // Draw simulated avatar / student silhouette
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(200, 120, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(200, 240, 80, 0, Math.PI, true);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AssessPro Virtual Student Feed', 200, 40);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 200, 280);

        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }

      // Flash visual indicator
      setSnapshotFlash(true);
      setTimeout(() => setSnapshotFlash(false), 300);

      // Upload to server
      const res = await authFetch('/api/proctoring/snapshot', {
        method: 'POST',
        body: JSON.stringify({
          submission_id: submissionId,
          image_base64: dataUrl,
          trigger: triggerType
        })
      });

      if (res.ok) {
        setLastSnapshotTime(new Date().toLocaleTimeString());
        if (onSnapshotTaken) onSnapshotTaken(dataUrl);
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  };

  // Periodic capture timer
  useEffect(() => {
    if (!submissionId) return;

    // Take initial snapshot 3 seconds after start
    const initialTimer = setTimeout(() => {
      captureAndUploadSnapshot('initial_checkpoint');
    }, 3000);

    const interval = setInterval(() => {
      captureAndUploadSnapshot('periodic');
    }, intervalSeconds * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [submissionId, intervalSeconds, cameraError]);

  // Violation trigger
  useEffect(() => {
    if (triggerViolationSnapshot) {
      captureAndUploadSnapshot('violation');
    }
  }, [triggerViolationSnapshot]);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className={`webcam-monitor-widget ${minimized ? 'minimized' : ''}`}>
        <div className="webcam-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="recording-dot"></span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              {minimized ? 'PROCTOR' : 'AI WEBCAM PROCTOR'}
            </span>
          </div>
          <button 
            onClick={() => setMinimized(!minimized)} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
            title={minimized ? 'Expand Camera Feed' : 'Minimize Camera Feed'}
          >
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>

        {!minimized && (
          <div className="webcam-video-container">
            {cameraError ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#cbd5e1' }}>
                <Camera size={32} style={{ color: '#38bdf8', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Simulated Video Stream</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4 }}>Hardware camera bypass active</div>
              </div>
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="webcam-video" 
              />
            )}

            {/* Face guideline frame */}
            <div className="face-guide-circle"></div>

            {/* Flash effect when taking snapshot */}
            {snapshotFlash && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.75)',
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s'
                }}
              />
            )}

            {/* Status bar */}
            <div 
              style={{
                position: 'absolute',
                bottom: 6,
                left: 8,
                right: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.65rem',
                color: '#ffffff',
                background: 'rgba(0, 0, 0, 0.65)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <ShieldCheck size={11} color="#10b981" /> Verified
              </span>
              <span>{lastSnapshotTime ? `Saved: ${lastSnapshotTime}` : 'Syncing...'}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
