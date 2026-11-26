const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute, recalculateSubmissionTotal } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/grades/manual-grade - Teacher grades written response
router.post('/manual-grade', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const { submission_id, question_id, score, teacher_feedback } = req.body;

  if (!submission_id || !question_id || score === undefined) {
    return res.status(400).json({ error: 'submission_id, question_id, and score are required.' });
  }

  try {
    const submission = queryOne(`
      SELECT s.*, a.teacher_id, a.title as assessment_title, u.name as student_name
      FROM submissions s
      JOIN assessments a ON s.assessment_id = a.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = ?
    `, [submission_id]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    if (req.user.role !== 'admin' && submission.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to grade this submission.' });
    }

    const question = queryOne('SELECT * FROM questions WHERE id = ?', [question_id]);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > question.points) {
      return res.status(400).json({ error: `Score must be between 0 and maximum points (${question.points}).` });
    }

    // Get current answer record
    let currentAns = queryOne('SELECT * FROM student_answers WHERE submission_id = ? AND question_id = ?', [submission_id, question_id]);
    const oldScore = currentAns ? (currentAns.score || 0) : 0;

    if (currentAns) {
      execute(`
        UPDATE student_answers 
        SET manual_graded = 1, score = ?, max_score = ?, teacher_feedback = ?, graded_by_user_id = ?, graded_by_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [numScore, question.points, teacher_feedback || '', req.user.id, req.user.name, currentAns.id]);
    } else {
      execute(`
        INSERT INTO student_answers (
          submission_id, question_id, manual_graded, score, max_score, teacher_feedback, graded_by_user_id, graded_by_name
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `, [submission_id, question_id, numScore, question.points, teacher_feedback || '', req.user.id, req.user.name]);
    }

    // Record audit trail if score changed or initial grade
    const diff = numScore - oldScore;
    execute(`
      INSERT INTO grade_audit_logs (
        submission_id, student_id, student_name, assessment_id, assessment_title,
        question_id, question_text, old_score, new_score, score_difference,
        changed_by_user_id, changed_by_name, changed_by_role, change_type, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_grade', ?)
    `, [
      submission_id, submission.student_id, submission.student_name, submission.assessment_id, submission.assessment_title,
      question_id, question.question_text, oldScore, numScore, diff,
      req.user.id, req.user.name, req.user.role,
      teacher_feedback ? `Teacher evaluation: ${teacher_feedback}` : 'Standard manual evaluation of written response.'
    ]);

    // Recalculate overall submission marks
    const updatedStats = recalculateSubmissionTotal(submission_id);

    res.json({
      message: 'Score and feedback saved successfully.',
      updatedScore: numScore,
      submissionStats: updatedStats
    });
  } catch (err) {
    console.error('Error in manual grading:', err);
    res.status(500).json({ error: 'Failed to record manual grade: ' + err.message });
  }
});

// POST /api/grades/admin-override - Admin has full permission to change ANY marks
router.post('/admin-override', authenticateToken, requireRole(['admin']), (req, res) => {
  const { submission_id, question_id, new_score, reason } = req.body;

  if (!submission_id || new_score === undefined || !reason || !reason.trim()) {
    return res.status(400).json({ 
      error: 'submission_id, new_score, and a mandatory justification reason are required for admin mark overrides.' 
    });
  }

  try {
    const submission = queryOne(`
      SELECT s.*, a.title as assessment_title, a.passing_marks, u.name as student_name
      FROM submissions s
      JOIN assessments a ON s.assessment_id = a.id
      JOIN users u ON s.student_id = u.id
      WHERE s.id = ?
    `, [submission_id]);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const numScore = Number(new_score);
    if (isNaN(numScore) || numScore < 0) {
      return res.status(400).json({ error: 'New score must be a non-negative number.' });
    }

    if (question_id) {
      // Overriding a specific question (could be auto-graded MCQ, True/False, or written!)
      const question = queryOne('SELECT * FROM questions WHERE id = ?', [question_id]);
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      if (numScore > question.points) {
        return res.status(400).json({ error: `Score cannot exceed maximum points for question (${question.points}).` });
      }

      const answer = queryOne('SELECT * FROM student_answers WHERE submission_id = ? AND question_id = ?', [submission_id, question_id]);
      const oldScore = answer ? (answer.score || 0) : 0;
      const isAutoGraded = answer ? answer.auto_graded : (question.type === 'mcq' ? 1 : 0);

      if (answer) {
        execute(`
          UPDATE student_answers 
          SET score = ?, manual_graded = 1, is_correct = ?, teacher_feedback = ?, graded_by_user_id = ?, graded_by_name = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          numScore,
          numScore >= question.points ? 1 : 0,
          `[Admin Override] ${reason.trim()}`,
          req.user.id,
          req.user.name,
          answer.id
        ]);
      } else {
        execute(`
          INSERT INTO student_answers (
            submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score, teacher_feedback, graded_by_user_id, graded_by_name
          ) VALUES (?, ?, '[No Answer Recorded]', ?, ?, 1, ?, ?, ?, ?, ?)
        `, [
          submission_id, question_id,
          numScore >= question.points ? 1 : 0,
          isAutoGraded,
          numScore,
          question.points,
          `[Admin Override] ${reason.trim()}`,
          req.user.id,
          req.user.name
        ]);
      }

      const diff = numScore - oldScore;

      // Log in grade_audit_logs with full history
      execute(`
        INSERT INTO grade_audit_logs (
          submission_id, student_id, student_name, assessment_id, assessment_title,
          question_id, question_text, old_score, new_score, score_difference,
          changed_by_user_id, changed_by_name, changed_by_role, change_type, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'admin_override', ?)
      `, [
        submission_id, submission.student_id, submission.student_name, submission.assessment_id, submission.assessment_title,
        question_id, question.question_text, oldScore, numScore, diff,
        req.user.id, req.user.name,
        reason.trim()
      ]);

      const updatedStats = recalculateSubmissionTotal(submission_id);

      res.json({
        message: 'Question mark successfully overridden by administrator.',
        questionId: question_id,
        oldScore,
        newScore: numScore,
        difference: diff,
        submissionStats: updatedStats
      });
    } else {
      // Overriding overall submission total score directly
      const oldTotal = submission.total_score || 0;
      const diff = numScore - oldTotal;
      const percentage = submission.max_score > 0 ? Math.round((numScore / submission.max_score) * 100 * 10) / 10 : 0;
      const passed = numScore >= (submission.passing_marks || 40) ? 1 : 0;

      execute(`
        UPDATE submissions 
        SET total_score = ?, percentage = ?, passed = ?
        WHERE id = ?
      `, [numScore, percentage, passed, submission_id]);

      // Log in grade_audit_logs
      execute(`
        INSERT INTO grade_audit_logs (
          submission_id, student_id, student_name, assessment_id, assessment_title,
          question_id, question_text, old_score, new_score, score_difference,
          changed_by_user_id, changed_by_name, changed_by_role, change_type, reason
        ) VALUES (?, ?, ?, ?, ?, NULL, 'Overall Assessment Total Score Override', ?, ?, ?, ?, ?, 'admin', 'admin_override', ?)
      `, [
        submission_id, submission.student_id, submission.student_name, submission.assessment_id, submission.assessment_title,
        oldTotal, numScore, diff,
        req.user.id, req.user.name,
        reason.trim()
      ]);

      res.json({
        message: 'Overall assessment mark overridden successfully.',
        oldScore: oldTotal,
        newScore: numScore,
        difference: diff,
        percentage,
        passed
      });
    }
  } catch (err) {
    console.error('Error in admin mark override:', err);
    res.status(500).json({ error: 'Failed to override mark: ' + err.message });
  }
});

// GET /api/grades/audit-logs - Retrieve complete history of all mark changes
router.get('/audit-logs', authenticateToken, requireRole(['admin', 'teacher']), (req, res) => {
  const { submission_id, student_id, assessment_id, limit = 100 } = req.query;

  try {
    let sql = `
      SELECT gal.*, u.email as student_email
      FROM grade_audit_logs gal
      JOIN users u ON gal.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (submission_id) {
      sql += ' AND gal.submission_id = ?';
      params.push(submission_id);
    }
    if (student_id) {
      sql += ' AND gal.student_id = ?';
      params.push(student_id);
    }
    if (assessment_id) {
      sql += ' AND gal.assessment_id = ?';
      params.push(assessment_id);
    }

    sql += ' ORDER BY gal.created_at DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const logs = queryAll(sql, params);
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
