const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, execute } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Protect all admin routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// GET /api/admin/stats - High-level analytics
router.get('/stats', (req, res) => {
  try {
    const totalStudents = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'student'").count;
    const totalTeachers = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").count;
    const totalAssessments = queryOne("SELECT COUNT(*) as count FROM assessments").count;
    const totalSubmissions = queryOne("SELECT COUNT(*) as count FROM submissions").count;
    const gradedSubmissions = queryOne("SELECT COUNT(*) as count FROM submissions WHERE status = 'graded'").count;
    const pendingGrading = queryOne("SELECT COUNT(*) as count FROM submissions WHERE status = 'submitted'").count;
    const flaggedProctoring = queryOne("SELECT COUNT(*) as count FROM submissions WHERE proctoring_status IN ('flagged', 'suspicious', 'disqualified')").count;
    
    const scoreStats = queryOne(`
      SELECT 
        AVG(percentage) as avg_percentage,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_count,
        COUNT(*) as total_evaluated
      FROM submissions 
      WHERE status IN ('submitted', 'graded')
    `);

    const totalAuditChanges = queryOne("SELECT COUNT(*) as count FROM grade_audit_logs").count;

    const passRate = scoreStats.total_evaluated > 0 
      ? Math.round((scoreStats.passed_count / scoreStats.total_evaluated) * 100) 
      : 0;

    res.json({
      stats: {
        totalStudents,
        totalTeachers,
        totalAssessments,
        totalSubmissions,
        gradedSubmissions,
        pendingGrading,
        flaggedProctoring,
        totalAuditChanges,
        avgPercentage: Math.round((scoreStats.avg_percentage || 0) * 10) / 10,
        passRate
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', (req, res) => {
  const { role } = req.query;

  try {
    let sql = 'SELECT id, name, email, role, department, roll_number, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY role ASC, name ASC';

    const users = queryAll(sql, params);
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create new user (Admin, Teacher, or Student)
router.post('/users', (req, res) => {
  const { name, email, password, role, department, roll_number } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  try {
    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = execute(`
      INSERT INTO users (name, email, password, role, department, roll_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name.trim(), email.trim(), hashedPassword, role, department || null, roll_number || null]);

    res.status(201).json({
      message: 'User created successfully',
      userId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - Update user details or password
router.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, password, role, department, roll_number } = req.body;

  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let passwordHash = user.password;
    if (password && password.trim()) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    execute(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          password = ?,
          role = COALESCE(?, role),
          department = COALESCE(?, department),
          roll_number = COALESCE(?, roll_number)
      WHERE id = ?
    `, [name, email, passwordHash, role, department, roll_number, userId]);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  if (Number(userId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  try {
    execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/all-submissions - All student submissions across all assessments
router.get('/all-submissions', (req, res) => {
  try {
    const submissions = queryAll(`
      SELECT 
        s.*,
        a.title as assessment_title,
        a.subject,
        a.passing_marks,
        u.roll_number,
        u.department,
        (SELECT COUNT(*) FROM grade_audit_logs WHERE submission_id = s.id) as mark_override_count,
        (SELECT COUNT(*) FROM proctoring_logs WHERE submission_id = s.id AND (severity = 'violation' OR event_type = 'tab_switch')) as violation_count
      FROM submissions s
      JOIN assessments a ON s.assessment_id = a.id
      JOIN users u ON s.student_id = u.id
      ORDER BY s.submit_time DESC, s.created_at DESC
    `);

    res.json({ submissions });
  } catch (err) {
    console.error('Error fetching all submissions:', err);
    res.status(500).json({ error: 'Failed to fetch all submissions' });
  }
});

module.exports = router;
