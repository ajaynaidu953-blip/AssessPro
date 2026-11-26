const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute, gradeMCQAnswers } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/submissions/start - Student starts an assessment
router.post('/start', authenticateToken, requireRole(['student']), (req, res) => {
  const { assessment_id, consent_given } = req.body;

  if (!assessment_id) {
    return res.status(400).json({ error: 'Assessment ID is required.' });
  }

  if (!consent_given) {
    return res.status(400).json({ error: 'Webcam monitoring consent must be granted to attend the assessment.' });
  }

  try {
    const assessment = queryOne('SELECT * FROM assessments WHERE id = ?', [assessment_id]);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    if (assessment.status !== 'published') {
      return res.status(400).json({ error: 'Assessment is not published or active.' });
    }

    // Check if student already submitted
    const existing = queryOne(`
      SELECT * FROM submissions 
      WHERE assessment_id = ? AND student_id = ?
      ORDER BY id DESC LIMIT 1
    `, [assessment_id, req.user.id]);

    if (existing && (existing.status === 'submitted' || existing.status === 'graded')) {
      return res.status(400).json({ 
        error: 'You have already submitted this assessment.',
        submissionId: existing.id
      });
    }

    let submissionId;
    if (existing && existing.status === 'in_progress') {
      // Resume in-progress submission
      submissionId = existing.id;
    } else {
      // Create new submission record
      const result = execute(`
        INSERT INTO submissions (
          assessment_id, student_id, student_name, student_email,
          status, start_time, total_score, max_score, percentage,
          proctoring_status, consent_given
        ) VALUES (?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP, 0, ?, 0, 'clean', 1)
      `, [
        assessment_id,
        req.user.id,
        req.user.name,
        req.user.email,
        assessment.total_marks
      ]);
      submissionId = result.lastInsertRowid;

      // Log consent in proctoring logs
      execute(`
        INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, severity)
        VALUES (?, ?, 'consent_granted', 'Student formally agreed to webcam surveillance and anti-cheating monitoring.', 'info')
      `, [submissionId, req.user.id]);
    }

    // Return submission and questions
    const questions = queryAll('SELECT id, assessment_id, type, question_text, options_json, points, order_num FROM questions WHERE assessment_id = ? ORDER BY order_num ASC', [assessment_id]);
    
    // Existing saved answers if any
    const savedAnswers = queryAll('SELECT question_id, student_answer FROM student_answers WHERE submission_id = ?', [submissionId]);
    const answersMap = {};
    savedAnswers.forEach(a => {
      answersMap[a.question_id] = a.student_answer;
    });

    const formattedQuestions = questions.map(q => {
      let options = [];
      try {
        options = q.options_json ? JSON.parse(q.options_json) : [];
      } catch (e) {
        options = [];
      }
      return {
        id: q.id,
        assessment_id: q.assessment_id,
        type: q.type,
        question_text: q.question_text,
        options,
        points: q.points,
        order_num: q.order_num
      };
    });

    res.json({
      submissionId,
      assessment,
      questions: formattedQuestions,
      savedAnswers: answersMap,
      startTime: existing ? existing.start_time : new Date().toISOString()
    });
  } catch (err) {
    console.error('Error starting submission:', err);
    res.status(500).json({ error: 'Failed to start assessment: ' + err.message });
  }
});

// POST /api/submissions/:id/save-progress - Save answers during exam
router.post('/:id/save-progress', authenticateToken, (req, res) => {
  const submissionId = req.params.id;
  const { answers } = req.body; // array of { question_id, student_answer }

  try {
    const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (submission.student_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (submission.status !== 'in_progress') {
      return res.status(400).json({ error: 'Assessment is already submitted.' });
    }

    if (Array.isArray(answers)) {
      for (const item of answers) {
        const existingAns = queryOne('SELECT id FROM student_answers WHERE submission_id = ? AND question_id = ?', [submissionId, item.question_id]);
        if (existingAns) {
          execute(`
            UPDATE student_answers 
            SET student_answer = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [item.student_answer, existingAns.id]);
        } else {
          execute(`
            INSERT INTO student_answers (submission_id, question_id, student_answer)
            VALUES (?, ?, ?)
          `, [submissionId, item.question_id, item.student_answer]);
        }
      }
    }

    res.json({ message: 'Progress saved successfully.' });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ error: 'Failed to save progress.' });
  }
});

// POST /api/submissions/:id/submit - Final submission with auto-grading of MCQs
router.post('/:id/submit', authenticateToken, (req, res) => {
  const submissionId = req.params.id;
  const { answers, proctoring_summary } = req.body;

  try {
    const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (submission.student_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    if (submission.status === 'submitted' || submission.status === 'graded') {
      return res.status(400).json({ error: 'Assessment has already been submitted.' });
    }

    // Save final answers
    if (Array.isArray(answers)) {
      for (const item of answers) {
        const existingAns = queryOne('SELECT id FROM student_answers WHERE submission_id = ? AND question_id = ?', [submissionId, item.question_id]);
        if (existingAns) {
          execute(`
            UPDATE student_answers 
            SET student_answer = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [item.student_answer, existingAns.id]);
        } else {
          execute(`
            INSERT INTO student_answers (submission_id, question_id, student_answer)
            VALUES (?, ?, ?)
          `, [submissionId, item.question_id, item.student_answer]);
        }
      }
    }

    // Auto-grade MCQs and True/False questions immediately
    const gradingResult = gradeMCQAnswers(submissionId);

    // Update proctoring summary if passed
    if (proctoring_summary) {
      if (proctoring_summary.tabSwitchCount !== undefined) {
        execute('UPDATE submissions SET tab_switch_count = ? WHERE id = ?', [proctoring_summary.tabSwitchCount, submissionId]);
      }
      if (proctoring_summary.proctoringStatus) {
        execute('UPDATE submissions SET proctoring_status = ? WHERE id = ?', [proctoring_summary.proctoringStatus, submissionId]);
      }
    }

    // Log final exam submit event
    execute(`
      INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, severity)
      VALUES (?, ?, 'exam_completed', 'Student completed and submitted examination.', 'info')
    `, [submissionId, submission.student_id]);

    const updatedSubmission = queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId]);

    res.json({
      message: 'Assessment submitted successfully!',
      submission: updatedSubmission,
      gradingResult
    });
  } catch (err) {
    console.error('Error submitting assessment:', err);
    res.status(500).json({ error: 'Failed to submit assessment: ' + err.message });
  }
});

// GET /api/submissions/student - Get student's past and current submissions
router.get('/student', authenticateToken, requireRole(['student']), (req, res) => {
  try {
    const submissions = queryAll(`
      SELECT 
        s.*,
        a.title as assessment_title,
        a.subject,
        a.duration_minutes,
        a.passing_marks,
        a.teacher_name,
        (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) as question_count
      FROM submissions s
      JOIN assessments a ON s.assessment_id = a.id
      WHERE s.student_id = ?
      ORDER BY s.created_at DESC
    `, [req.user.id]);

    res.json({ submissions });
  } catch (err) {
    console.error('Error fetching student submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// GET /api/submissions/assessment/:assessmentId - Get all submissions for an assessment (Teacher/Admin)
router.get('/assessment/:assessmentId', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const assessmentId = req.params.assessmentId;

  try {
    const assessment = queryOne('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    if (req.user.role !== 'admin' && assessment.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const submissions = queryAll(`
      SELECT 
        s.*,
        u.roll_number,
        u.department,
        (SELECT COUNT(*) FROM proctoring_logs WHERE submission_id = s.id AND severity = 'violation') as violation_count,
        (SELECT COUNT(*) FROM student_answers sa JOIN questions q ON sa.question_id = q.id WHERE sa.submission_id = s.id AND q.type = 'written' AND sa.manual_graded = 0) as pending_written_count
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      WHERE s.assessment_id = ?
      ORDER BY s.submit_time DESC, s.created_at DESC
    `, [assessmentId]);

    res.json({ assessment, submissions });
  } catch (err) {
    console.error('Error fetching assessment submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

// GET /api/submissions/:id - View detailed submission with questions, student answers, feedback, proctoring
router.get('/:id', authenticateToken, (req, res) => {
  const submissionId = req.params.id;

  try {
    const submission = queryOne(`
      SELECT s.*, a.title as assessment_title, a.subject, a.duration_minutes, a.passing_marks, a.teacher_name, a.teacher_id
      FROM submissions s
      JOIN assessments a ON s.assessment_id = a.id
      WHERE s.id = ?
    `, [submissionId]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Role authorization check
    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'teacher' && submission.teacher_id !== req.user.id) {
      // Check if admin, otherwise only their own
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Fetch questions and answers
    const answers = queryAll(`
      SELECT 
        q.id as question_id,
        q.type,
        q.question_text,
        q.options_json,
        q.correct_answer,
        q.points as max_points,
        q.explanation,
        q.order_num,
        sa.id as answer_id,
        sa.student_answer,
        sa.is_correct,
        sa.auto_graded,
        sa.manual_graded,
        sa.score as awarded_score,
        sa.teacher_feedback,
        sa.graded_by_name,
        sa.updated_at as answer_updated_at
      FROM questions q
      LEFT JOIN student_answers sa ON sa.question_id = q.id AND sa.submission_id = ?
      WHERE q.assessment_id = ?
      ORDER BY q.order_num ASC
    `, [submissionId, submission.assessment_id]);

    const formattedAnswers = answers.map(item => {
      let options = [];
      try {
        options = item.options_json ? JSON.parse(item.options_json) : [];
      } catch (e) {
        options = [];
      }
      return {
        ...item,
        options
      };
    });

    // Proctoring events & snapshots
    const proctoringLogs = queryAll(`
      SELECT * FROM proctoring_logs 
      WHERE submission_id = ? 
      ORDER BY created_at ASC
    `, [submissionId]);

    // Grade audit logs for this submission
    const auditLogs = queryAll(`
      SELECT * FROM grade_audit_logs 
      WHERE submission_id = ? 
      ORDER BY created_at DESC
    `, [submissionId]);

    res.json({
      submission,
      answers: formattedAnswers,
      proctoringLogs,
      auditLogs
    });
  } catch (err) {
    console.error('Error fetching submission details:', err);
    res.status(500).json({ error: 'Failed to retrieve submission details.' });
  }
});

module.exports = router;
