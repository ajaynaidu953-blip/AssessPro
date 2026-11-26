const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { queryAll, queryOne, execute } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const snapshotsDir = path.join(__dirname, '../../uploads/snapshots');
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// POST /api/proctoring/snapshot - Upload webcam snapshot from client
router.post('/snapshot', authenticateToken, (req, res) => {
  const { submission_id, image_base64, trigger = 'periodic' } = req.body;

  if (!submission_id || !image_base64) {
    return res.status(400).json({ error: 'submission_id and image_base64 are required.' });
  }

  try {
    const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submission_id]);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Save image to disk
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `snap_${submission_id}_${Date.now()}.jpg`;
    const filepath = path.join(snapshotsDir, filename);

    fs.writeFileSync(filepath, buffer);

    const relativeUrl = `/uploads/snapshots/${filename}`;

    // Record in proctoring logs
    const msg = trigger === 'violation' 
      ? 'Snapshot captured on proctoring alert (tab switch / window focus loss).' 
      : 'Periodic webcam integrity checkpoint verified.';

    execute(`
      INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, snapshot_path, severity)
      VALUES (?, ?, 'webcam_snapshot', ?, ?, 'info')
    `, [submission_id, submission.student_id, msg, relativeUrl]);

    res.json({
      message: 'Webcam snapshot stored successfully',
      snapshotUrl: relativeUrl
    });
  } catch (err) {
    console.error('Error saving webcam snapshot:', err);
    res.status(500).json({ error: 'Failed to process webcam snapshot: ' + err.message });
  }
});

// POST /api/proctoring/event - Log anti-cheating violation event (Tab switch, Fullscreen exit, etc.)
router.post('/event', authenticateToken, (req, res) => {
  const { submission_id, event_type, message, severity = 'warning' } = req.body;

  if (!submission_id || !event_type) {
    return res.status(400).json({ error: 'submission_id and event_type are required.' });
  }

  try {
    const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submission_id]);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Record proctoring event
    execute(`
      INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, severity)
      VALUES (?, ?, ?, ?, ?)
    `, [submission_id, submission.student_id, event_type, message || `Event: ${event_type}`, severity]);

    // If tab switch, increment counter on submission
    if (event_type === 'tab_switch' || event_type === 'window_blur') {
      const currentCount = (submission.tab_switch_count || 0) + 1;
      let newProctorStatus = submission.proctoring_status;

      if (currentCount >= 3) {
        newProctorStatus = 'flagged';
      } else if (currentCount >= 1 && newProctorStatus === 'clean') {
        newProctorStatus = 'suspicious';
      }

      execute(`
        UPDATE submissions 
        SET tab_switch_count = ?, proctoring_status = ?
        WHERE id = ?
      `, [currentCount, newProctorStatus, submission_id]);

      return res.json({
        message: 'Violation recorded',
        tabSwitchCount: currentCount,
        proctoringStatus: newProctorStatus
      });
    }

    res.json({ message: 'Event logged successfully' });
  } catch (err) {
    console.error('Error logging proctoring event:', err);
    res.status(500).json({ error: 'Failed to log proctoring event' });
  }
});

// GET /api/proctoring/:submissionId - Get proctoring timeline and snapshots
router.get('/:submissionId', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const submissionId = req.params.submissionId;

  try {
    const submission = queryOne(`
      SELECT s.*, u.name as student_name, u.email as student_email, u.roll_number, a.title as assessment_title, a.tab_switch_limit
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      JOIN assessments a ON s.assessment_id = a.id
      WHERE s.id = ?
    `, [submissionId]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const logs = queryAll(`
      SELECT * FROM proctoring_logs 
      WHERE submission_id = ? 
      ORDER BY created_at ASC
    `, [submissionId]);

    const snapshots = logs.filter(l => l.snapshot_path);

    res.json({
      submission,
      logs,
      snapshots,
      totalViolations: logs.filter(l => l.severity === 'violation' || l.event_type === 'tab_switch').length
    });
  } catch (err) {
    console.error('Error fetching proctoring logs:', err);
    res.status(500).json({ error: 'Failed to fetch proctoring logs' });
  }
});

// POST /api/proctoring/:submissionId/status - Update proctoring verdict (clean, suspicious, flagged, disqualified)
router.post('/:submissionId/status', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const submissionId = req.params.submissionId;
  const { proctoring_status, proctoring_notes } = req.body;

  if (!proctoring_status) {
    return res.status(400).json({ error: 'proctoring_status is required.' });
  }

  try {
    execute(`
      UPDATE submissions 
      SET proctoring_status = ?, proctoring_notes = COALESCE(?, proctoring_notes)
      WHERE id = ?
    `, [proctoring_status, proctoring_notes, submissionId]);

    res.json({ message: 'Proctoring verdict updated successfully.' });
  } catch (err) {
    console.error('Error updating proctoring verdict:', err);
    res.status(500).json({ error: 'Failed to update verdict.' });
  }
});

module.exports = router;
