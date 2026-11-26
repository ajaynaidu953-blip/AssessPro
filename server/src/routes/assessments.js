const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute, exec } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/assessments - list assessments
router.get('/', authenticateToken, (req, res) => {
  const { role, id: userId } = req.user;

  try {
    let assessments;
    if (role === 'student') {
      // Students see published assessments, joined with their own submission status
      assessments = queryAll(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) as question_count,
          s.id as submission_id,
          s.status as student_submission_status,
          s.total_score as student_score,
          s.max_score as student_max_score,
          s.passed as student_passed
        FROM assessments a
        LEFT JOIN submissions s ON s.assessment_id = a.id AND s.student_id = ?
        WHERE a.status = 'published'
        ORDER BY a.created_at DESC
      `, [userId]);
    } else if (role === 'teacher') {
      // Teachers see their assessments with counts
      assessments = queryAll(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) as question_count,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id) as total_submissions,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id AND status = 'submitted') as pending_grading_count,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id AND status = 'graded') as graded_count
        FROM assessments a
        WHERE a.teacher_id = ? OR ? = 1
        ORDER BY a.created_at DESC
      `, [userId, 0]); // Can view own or all
    } else {
      // Admin sees everything
      assessments = queryAll(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) as question_count,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id) as total_submissions,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id AND status = 'submitted') as pending_grading_count,
          (SELECT COUNT(*) FROM submissions WHERE assessment_id = a.id AND status = 'graded') as graded_count
        FROM assessments a
        ORDER BY a.created_at DESC
      `);
    }

    res.json({ assessments });
  } catch (err) {
    console.error('Error fetching assessments:', err);
    res.status(500).json({ error: 'Failed to retrieve assessments' });
  }
});

// GET /api/assessments/:id - get assessment details
router.get('/:id', authenticateToken, (req, res) => {
  const assessmentId = req.params.id;
  const { role, id: userId } = req.user;

  try {
    const assessment = queryOne('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const questions = queryAll('SELECT * FROM questions WHERE assessment_id = ? ORDER BY order_num ASC', [assessmentId]);

    // Format options JSON
    const formattedQuestions = questions.map(q => {
      let options = [];
      try {
        options = q.options_json ? JSON.parse(q.options_json) : [];
      } catch (e) {
        options = [];
      }

      // If student hasn't submitted, hide correct_answer and explanation to prevent cheating
      if (role === 'student') {
        const studentSub = queryOne(`
          SELECT id, status FROM submissions 
          WHERE assessment_id = ? AND student_id = ?
        `, [assessmentId, userId]);

        const hasFinished = studentSub && (studentSub.status === 'submitted' || studentSub.status === 'graded');

        return {
          id: q.id,
          assessment_id: q.assessment_id,
          type: q.type,
          question_text: q.question_text,
          options,
          points: q.points,
          order_num: q.order_num,
          // Only show correct answer and explanation if already finished
          ...(hasFinished ? { correct_answer: q.correct_answer, explanation: q.explanation } : {})
        };
      }

      return {
        ...q,
        options
      };
    });

    // Check if student has existing submission
    let userSubmission = null;
    if (role === 'student') {
      userSubmission = queryOne(`
        SELECT * FROM submissions 
        WHERE assessment_id = ? AND student_id = ?
        ORDER BY id DESC LIMIT 1
      `, [assessmentId, userId]);
    }

    res.json({
      assessment,
      questions: formattedQuestions,
      userSubmission
    });
  } catch (err) {
    console.error('Error fetching assessment details:', err);
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
});

// POST /api/assessments - create assessment (Teacher or Admin)
router.post('/', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const {
    title, description, subject, duration_minutes, total_marks, passing_marks,
    webcam_required, snapshot_interval_seconds, tab_switch_limit,
    fullscreen_enforced, show_result_immediately, instructions, questions
  } = req.body;

  if (!title || !subject || !duration_minutes) {
    return res.status(400).json({ error: 'Title, subject, and duration are required.' });
  }

  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    const result = execute(`
      INSERT INTO assessments (
        title, description, subject, duration_minutes, total_marks, passing_marks,
        teacher_id, teacher_name, status, webcam_required, snapshot_interval_seconds,
        tab_switch_limit, fullscreen_enforced, show_result_immediately, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      description || '',
      subject.trim(),
      Number(duration_minutes) || 30,
      Number(total_marks) || 100,
      Number(passing_marks) || 40,
      teacherId,
      teacherName,
      'published',
      webcam_required !== undefined ? (webcam_required ? 1 : 0) : 1,
      Number(snapshot_interval_seconds) || 30,
      Number(tab_switch_limit) || 3,
      fullscreen_enforced !== undefined ? (fullscreen_enforced ? 1 : 0) : 1,
      show_result_immediately !== undefined ? (show_result_immediately ? 1 : 0) : 1,
      instructions || 'Ensure continuous webcam visibility. Do not leave the assessment tab.'
    ]);

    const newAssessmentId = result.lastInsertRowid;

    // Insert questions if provided
    let calculatedTotalMarks = 0;
    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        const points = Number(q.points) || 5;
        calculatedTotalMarks += points;
        const optionsJson = q.options ? JSON.stringify(q.options) : null;

        execute(`
          INSERT INTO questions (
            assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newAssessmentId,
          q.type || 'mcq',
          q.question_text || `Question ${idx + 1}`,
          optionsJson,
          q.correct_answer || null,
          points,
          q.explanation || null,
          idx + 1
        ]);
      });

      // Update total marks to match sum of question points
      execute('UPDATE assessments SET total_marks = ? WHERE id = ?', [calculatedTotalMarks, newAssessmentId]);
    }

    res.status(201).json({
      message: 'Assessment created successfully',
      assessmentId: newAssessmentId
    });
  } catch (err) {
    console.error('Error creating assessment:', err);
    res.status(500).json({ error: 'Failed to create assessment: ' + err.message });
  }
});

// PUT /api/assessments/:id - update assessment
router.put('/:id', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const assessmentId = req.params.id;
  const assessment = queryOne('SELECT * FROM assessments WHERE id = ?', [assessmentId]);

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found.' });
  }

  // Teacher can only update their own unless admin
  if (req.user.role !== 'admin' && assessment.teacher_id !== req.user.id) {
    return res.status(403).json({ error: 'You do not have permission to edit this assessment.' });
  }

  const {
    title, description, subject, duration_minutes, total_marks, passing_marks,
    webcam_required, snapshot_interval_seconds, tab_switch_limit,
    fullscreen_enforced, show_result_immediately, instructions, status, questions
  } = req.body;

  try {
    execute(`
      UPDATE assessments SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        subject = COALESCE(?, subject),
        duration_minutes = COALESCE(?, duration_minutes),
        total_marks = COALESCE(?, total_marks),
        passing_marks = COALESCE(?, passing_marks),
        status = COALESCE(?, status),
        webcam_required = COALESCE(?, webcam_required),
        snapshot_interval_seconds = COALESCE(?, snapshot_interval_seconds),
        tab_switch_limit = COALESCE(?, tab_switch_limit),
        fullscreen_enforced = COALESCE(?, fullscreen_enforced),
        show_result_immediately = COALESCE(?, show_result_immediately),
        instructions = COALESCE(?, instructions),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title, description, subject, duration_minutes, total_marks, passing_marks,
      status, webcam_required, snapshot_interval_seconds, tab_switch_limit,
      fullscreen_enforced, show_result_immediately, instructions, assessmentId
    ]);

    // If new questions array passed, re-sync questions
    if (Array.isArray(questions)) {
      execute('DELETE FROM questions WHERE assessment_id = ?', [assessmentId]);
      let total = 0;
      questions.forEach((q, idx) => {
        const points = Number(q.points) || 5;
        total += points;
        const optionsJson = q.options ? JSON.stringify(q.options) : null;
        execute(`
          INSERT INTO questions (
            assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          assessmentId,
          q.type || 'mcq',
          q.question_text,
          optionsJson,
          q.correct_answer || null,
          points,
          q.explanation || null,
          idx + 1
        ]);
      });
      execute('UPDATE assessments SET total_marks = ? WHERE id = ?', [total, assessmentId]);
    }

    res.json({ message: 'Assessment updated successfully' });
  } catch (err) {
    console.error('Error updating assessment:', err);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// DELETE /api/assessments/:id
router.delete('/:id', authenticateToken, requireRole(['teacher', 'admin']), (req, res) => {
  const assessmentId = req.params.id;
  const assessment = queryOne('SELECT * FROM assessments WHERE id = ?', [assessmentId]);

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found.' });
  }

  if (req.user.role !== 'admin' && assessment.teacher_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied.' });
  }

  try {
    execute('DELETE FROM assessments WHERE id = ?', [assessmentId]);
    res.json({ message: 'Assessment deleted successfully' });
  } catch (err) {
    console.error('Error deleting assessment:', err);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

module.exports = router;
