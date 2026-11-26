const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, execute, queryAll } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    roll_number: user.roll_number
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Login successful',
    token,
    user: tokenPayload
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role, department, roll_number } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  const validRoles = ['teacher', 'student'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be either teacher or student.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = execute(`
    INSERT INTO users (name, email, password, role, department, roll_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name.trim(), email.trim(), hashedPassword, role, department || null, roll_number || null]);

  const newUser = {
    id: result.lastInsertRowid,
    name: name.trim(),
    email: email.trim(),
    role,
    department: department || null,
    roll_number: roll_number || null
  };

  const token = jwt.sign(newUser, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: newUser
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = queryOne('SELECT id, name, email, role, department, roll_number, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user });
});

// GET /api/auth/demo-accounts (convenient for instant testing)
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: [
      {
        role: 'admin',
        title: 'System Admin (Dean)',
        email: 'admin@assesspro.edu',
        password: 'Admin@123',
        description: 'Full privileges: mark overrides on all exams, user management, global audit logs'
      },
      {
        role: 'teacher',
        title: 'Prof. Robert Smith',
        email: 'teacher.smith@assesspro.edu',
        password: 'Teacher@123',
        description: 'Create assessments, manual grading of written responses, view proctoring reports'
      },
      {
        role: 'teacher',
        title: 'Dr. Maria Garcia',
        email: 'teacher.garcia@assesspro.edu',
        password: 'Teacher@123',
        description: 'AI & Data Science Faculty'
      },
      {
        role: 'student',
        title: 'Alex Johnson (Student)',
        email: 'student.alex@assesspro.edu',
        password: 'Student@123',
        description: 'Take exams with webcam monitoring, view auto-graded & manual scores'
      },
      {
        role: 'student',
        title: 'Emma Watson (Student)',
        email: 'student.emma@assesspro.edu',
        password: 'Student@123',
        description: 'Has sample submission with proctoring violation alerts'
      },
      {
        role: 'student',
        title: 'John Doe (Student)',
        email: 'student.john@assesspro.edu',
        password: 'Student@123',
        description: 'Fresh student profile ready to take any published exam'
      }
    ]
  });
});

module.exports = router;
