const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'assesspro.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

// Helper query wrappers
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function exec(sql) {
  return db.exec(sql);
}

// Initialize tables
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      department TEXT,
      roll_number TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      total_marks REAL NOT NULL DEFAULT 100,
      passing_marks REAL NOT NULL DEFAULT 40,
      teacher_id INTEGER NOT NULL,
      teacher_name TEXT,
      status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'archived')),
      webcam_required INTEGER DEFAULT 1,
      snapshot_interval_seconds INTEGER DEFAULT 30,
      tab_switch_limit INTEGER DEFAULT 3,
      fullscreen_enforced INTEGER DEFAULT 1,
      show_result_immediately INTEGER DEFAULT 1,
      instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('mcq', 'written', 'true_false')),
      question_text TEXT NOT NULL,
      options_json TEXT, -- JSON array of strings for MCQ
      correct_answer TEXT, -- for MCQ and True/False auto-grading
      points REAL NOT NULL DEFAULT 5,
      explanation TEXT, -- rubric or explanation
      order_num INTEGER DEFAULT 1,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT,
      student_email TEXT,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'graded')),
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      submit_time DATETIME,
      total_score REAL DEFAULT 0,
      max_score REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      passed INTEGER DEFAULT 0,
      proctoring_status TEXT DEFAULT 'clean' CHECK(proctoring_status IN ('clean', 'suspicious', 'flagged', 'disqualified')),
      proctoring_notes TEXT,
      tab_switch_count INTEGER DEFAULT 0,
      consent_given INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      student_answer TEXT,
      is_correct INTEGER, -- 1 for correct, 0 for incorrect, NULL for pending written
      auto_graded INTEGER DEFAULT 0,
      manual_graded INTEGER DEFAULT 0,
      score REAL DEFAULT 0,
      max_score REAL DEFAULT 0,
      teacher_feedback TEXT,
      graded_by_user_id INTEGER,
      graded_by_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proctoring_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT,
      snapshot_path TEXT,
      severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'violation')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS grade_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT,
      assessment_id INTEGER NOT NULL,
      assessment_title TEXT,
      question_id INTEGER, -- NULL for total score change, or specific question id
      question_text TEXT,
      old_score REAL NOT NULL,
      new_score REAL NOT NULL,
      score_difference REAL NOT NULL,
      changed_by_user_id INTEGER NOT NULL,
      changed_by_name TEXT NOT NULL,
      changed_by_role TEXT NOT NULL,
      change_type TEXT NOT NULL DEFAULT 'admin_override',
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

// Seed initial realistic data
function seedInitialData() {
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial AssessPro database data...');

  const adminPass = bcrypt.hashSync('Admin@123', 10);
  const teacherPass = bcrypt.hashSync('Teacher@123', 10);
  const studentPass = bcrypt.hashSync('Student@123', 10);

  // 1. Insert Users
  execute(`
    INSERT INTO users (name, email, password, role, department, roll_number)
    VALUES 
    (?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?)
  `, [
    'Dr. Eleanor Vance (Dean)', 'admin@assesspro.edu', adminPass, 'admin', 'Academic Administration', 'ADM-001',
    'Prof. Robert Smith', 'teacher.smith@assesspro.edu', teacherPass, 'teacher', 'Computer Science & Engineering', 'FAC-102',
    'Dr. Maria Garcia', 'teacher.garcia@assesspro.edu', teacherPass, 'teacher', 'Artificial Intelligence & Data', 'FAC-205',
    'Alex Johnson', 'student.alex@assesspro.edu', studentPass, 'student', 'Computer Science', 'CS-2026-041',
    'Emma Watson', 'student.emma@assesspro.edu', studentPass, 'student', 'Computer Science', 'CS-2026-088',
    'John Doe', 'student.john@assesspro.edu', studentPass, 'student', 'Information Technology', 'IT-2026-105'
  ]);

  const teacher1 = queryOne("SELECT id FROM users WHERE email = 'teacher.smith@assesspro.edu'");
  const teacher2 = queryOne("SELECT id FROM users WHERE email = 'teacher.garcia@assesspro.edu'");
  const studentAlex = queryOne("SELECT id, name, email FROM users WHERE email = 'student.alex@assesspro.edu'");
  const studentEmma = queryOne("SELECT id, name, email FROM users WHERE email = 'student.emma@assesspro.edu'");

  // 2. Insert Assessments
  const exam1 = execute(`
    INSERT INTO assessments (
      title, description, subject, duration_minutes, total_marks, passing_marks, 
      teacher_id, teacher_name, status, webcam_required, snapshot_interval_seconds, 
      tab_switch_limit, fullscreen_enforced, show_result_immediately, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'Advanced Web Architectures & Cloud Systems (Midterm)',
    'Comprehensive assessment testing REST APIs, React lifecycle, database indexing, and cloud scaling strategies. Proctoring enabled with webcam continuous monitoring.',
    'Cloud & Web Technologies',
    45, 50, 20,
    teacher1.id, 'Prof. Robert Smith', 'published', 1, 30, 3, 1, 1,
    'Ensure webcam is turned on and clear face visibility is maintained. Do not switch tabs or exit fullscreen mode. MCQ answers will be instantly auto-graded upon submission; written answers will be graded by the professor.'
  ]);

  const exam1Id = exam1.lastInsertRowid;

  const exam2 = execute(`
    INSERT INTO assessments (
      title, description, subject, duration_minutes, total_marks, passing_marks, 
      teacher_id, teacher_name, status, webcam_required, snapshot_interval_seconds, 
      tab_switch_limit, fullscreen_enforced, show_result_immediately, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'Artificial Intelligence & Machine Learning Fundamentals',
    'Foundations of Neural Networks, Supervised Learning, Model Evaluation Metrics, and Ethical AI considerations.',
    'Artificial Intelligence',
    30, 40, 16,
    teacher2.id, 'Dr. Maria Garcia', 'published', 1, 30, 2, 1, 1,
    'Strict proctoring enforced. Webcam feed must remain active during the entire test duration. Multiple tab switching will automatically flag your session for review.'
  ]);

  const exam2Id = exam2.lastInsertRowid;

  // 3. Insert Questions for Exam 1 (Web Architectures)
  // Q1: MCQ (5 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'mcq',
    'Which HTTP status code is most appropriate when a requested resource has been successfully created on the server?',
    JSON.stringify(['200 OK', '201 Created', '204 No Content', '302 Found']),
    '201 Created',
    5,
    '201 Created indicates that the request has succeeded and led to the creation of a resource.',
    1
  ]);

  // Q2: MCQ (5 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'mcq',
    'In React 18, what is the primary benefit of the concurrent rendering feature?',
    JSON.stringify([
      'Enables multi-threading on the client CPU',
      'Allows React to interrupt and prioritize background rendering without freezing the user interface',
      'Replaces the Virtual DOM with direct web workers',
      'Eliminates the requirement for state management libraries'
    ]),
    'Allows React to interrupt and prioritize background rendering without freezing the user interface',
    5,
    'Concurrent React allows rendering to be interruptible, improving perceived responsiveness during heavy UI updates.',
    2
  ]);

  // Q3: True/False (5 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'true_false',
    'In a relational database, adding an index to every single column in a high-write table significantly increases overall write performance.',
    JSON.stringify(['True', 'False']),
    'False',
    5,
    'False: Every index must be updated upon INSERT/UPDATE/DELETE operations, which actually degrades write throughput.',
    3
  ]);

  // Q4: MCQ (5 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'mcq',
    'Which of the following database architectural patterns provides the highest read scalability by replicating data across multiple read-only replica nodes?',
    JSON.stringify([
      'Single Master with Read Replicas (Primary-Replica)',
      'Monolithic Single-Node Sharding',
      'Local Storage Caching Only',
      'Client-side IndexedDB Synchronization'
    ]),
    'Single Master with Read Replicas (Primary-Replica)',
    5,
    'Read replicas allow horizontal scaling for high-traffic read operations while directing writes to the primary node.',
    4
  ]);

  // Q5: Written / Descriptive (15 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'written',
    'Explain the concept of Database Normalization (up to 3NF). Provide an example illustrating how eliminating data redundancy prevents insertion, update, and deletion anomalies.',
    null,
    null,
    15,
    'Grading Rubric: 1NF atomic values (3 marks), 2NF eliminating partial dependency (4 marks), 3NF eliminating transitive dependency (4 marks), Clear example demonstrating anomaly prevention (4 marks).',
    5
  ]);

  // Q6: Written / Descriptive (15 marks)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, 'written',
    'Describe the architecture of a Token-Based Authentication system using JSON Web Tokens (JWT). Discuss security best practices regarding secret key rotation, token expiration, and secure storage (HTTP-only cookies vs LocalStorage).',
    null,
    null,
    15,
    'Grading Rubric: JWT Structure & Workflow (5 marks), Expiration & Refresh tokens (4 marks), Secure Storage & XSS/CSRF mitigations (6 marks).',
    6
  ]);

  // Questions for Exam 2 (AI Fundamentals)
  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam2Id, 'mcq',
    'Which activation function is widely used in hidden layers of deep neural networks to mitigate the vanishing gradient problem?',
    JSON.stringify(['Sigmoid', 'ReLU (Rectified Linear Unit)', 'Softmax', 'Step Function']),
    'ReLU (Rectified Linear Unit)',
    10,
    'ReLU outputs zero for negative inputs and maintains a gradient of 1 for positive inputs, avoiding gradient saturation.',
    1
  ]);

  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam2Id, 'mcq',
    'What metric is most appropriate for evaluating a machine learning classifier on a highly imbalanced dataset (e.g. fraud detection)?',
    JSON.stringify(['Accuracy', 'F1-Score / PR-AUC', 'Mean Squared Error', 'Adjusted R-Squared']),
    'F1-Score / PR-AUC',
    10,
    'In severe class imbalance, accuracy is misleading. Precision-Recall AUC or F1-Score balances false positives and false negatives.',
    2
  ]);

  execute(`
    INSERT INTO questions (assessment_id, type, question_text, options_json, correct_answer, points, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam2Id, 'written',
    'Compare and contrast Overfitting versus Underfitting in Supervised Machine Learning models. Detail at least three practical techniques used to prevent overfitting in complex neural networks.',
    null,
    null,
    20,
    'Rubric: Definitions & Bias-Variance tradeoff (8 marks), 3 techniques such as Dropout, L1/L2 Regularization, Early Stopping, or Data Augmentation (12 marks).',
    3
  ]);

  // 4. Create Pre-existing Completed Submissions with Grade Audits to demonstrate all requirements right away!
  // Submission 1: Student Alex took Exam 1
  const exam1Questions = queryAll('SELECT * FROM questions WHERE assessment_id = ? ORDER BY order_num ASC', [exam1Id]);

  const alexSub = execute(`
    INSERT INTO submissions (
      assessment_id, student_id, student_name, student_email,
      status, start_time, submit_time, total_score, max_score, percentage, passed,
      proctoring_status, proctoring_notes, tab_switch_count, consent_given
    ) VALUES (?, ?, ?, ?, ?, datetime('now', '-2 hours'), datetime('now', '-1 hours'), ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, studentAlex.id, studentAlex.name, studentAlex.email,
    'graded', 46, 50, 92, 1,
    'clean', 'Student completed session with full compliance. Continuous webcam feed verified.', 0, 1
  ]);

  const alexSubId = alexSub.lastInsertRowid;

  // Insert Alex's answers
  // Q1: Correct (5/5) - auto-graded
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score)
    VALUES (?, ?, ?, ?, 1, 0, 5, 5)
  `, [alexSubId, exam1Questions[0].id, '201 Created', 1]);

  // Q2: Correct (5/5) - auto-graded
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score)
    VALUES (?, ?, ?, ?, 1, 0, 5, 5)
  `, [alexSubId, exam1Questions[1].id, 'Allows React to interrupt and prioritize background rendering without freezing the user interface', 1]);

  // Q3: Correct (5/5) - auto-graded
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score)
    VALUES (?, ?, ?, ?, 1, 0, 5, 5)
  `, [alexSubId, exam1Questions[2].id, 'False', 1]);

  // Q4: Correct (5/5) - auto-graded
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score)
    VALUES (?, ?, ?, ?, 1, 0, 5, 5)
  `, [alexSubId, exam1Questions[3].id, 'Single Master with Read Replicas (Primary-Replica)', 1]);

  // Q5: Written - Graded by Teacher Robert Smith (13/15)
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score, teacher_feedback, graded_by_user_id, graded_by_name)
    VALUES (?, ?, ?, ?, 0, 1, 13, 15, ?, ?, ?)
  `, [
    alexSubId, exam1Questions[4].id,
    'Database normalization organizes table schema to minimize redundancy. 1NF guarantees atomic values in columns without repeating groups. 2NF removes partial functional dependencies on candidate keys. 3NF removes transitive dependencies. For example, storing Student and Department info in one table causes update anomalies if a department head changes; splitting into Students and Departments tables avoids this.',
    1,
    'Excellent explanation of normal forms and solid practical example. Lost 2 marks for omitting multi-attribute composite key details.',
    teacher1.id, 'Prof. Robert Smith'
  ]);

  // Q6: Written - Graded initially by Teacher Robert Smith (11/15), then Overridden by Admin Dr. Eleanor Vance to (13/15)!
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score, teacher_feedback, graded_by_user_id, graded_by_name)
    VALUES (?, ?, ?, ?, 0, 1, 13, 15, ?, ?, ?)
  `, [
    alexSubId, exam1Questions[5].id,
    'JWT authentication involves client logging in, server signing a payload with HMAC/RSA, and returning an encoded token. The client attaches it as a Bearer token in the Authorization header. Best practices include storing tokens in HTTP-only, SameSite Secure cookies to protect against XSS stealing tokens, setting short expiry times (e.g. 15 mins), and utilizing refresh token rotation stored in a revocable Redis whitelist.',
    1,
    'Thorough analysis covering HTTP-only cookies and refresh token rotation mechanics.',
    1, 'Dr. Eleanor Vance (Dean)'
  ]);

  // Insert Grade Audit Log proving Admin Override requirement
  execute(`
    INSERT INTO grade_audit_logs (
      submission_id, student_id, student_name, assessment_id, assessment_title,
      question_id, question_text, old_score, new_score, score_difference,
      changed_by_user_id, changed_by_name, changed_by_role, change_type, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    alexSubId, studentAlex.id, studentAlex.name, exam1Id, 'Advanced Web Architectures & Cloud Systems (Midterm)',
    exam1Questions[5].id, exam1Questions[5].question_text, 11, 13, 2,
    1, 'Dr. Eleanor Vance (Dean)', 'admin', 'admin_override',
    'Admin re-evaluation after student grade appeal: Student adequately explained Redis-backed token rotation which fulfilled advanced criteria.'
  ]);

  // Add proctoring logs for Alex
  execute(`
    INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, severity, created_at)
    VALUES 
    (?, ?, 'consent_granted', 'Student consented to webcam proctoring and microphone monitoring.', 'info', datetime('now', '-2 hours')),
    (?, ?, 'fullscreen_enter', 'Student entered fullscreen lockdown mode.', 'info', datetime('now', '-119 minutes')),
    (?, ?, 'webcam_snapshot', 'Periodic monitoring checkpoint verified. Student face positioned clearly in frame.', 'info', datetime('now', '-100 minutes')),
    (?, ?, 'webcam_snapshot', 'Periodic monitoring checkpoint verified. Normal testing behavior.', 'info', datetime('now', '-75 minutes'))
  `, [
    alexSubId, studentAlex.id,
    alexSubId, studentAlex.id,
    alexSubId, studentAlex.id,
    alexSubId, studentAlex.id
  ]);

  // Submission 2: Student Emma took Exam 1 - Has Tab Switch Violations & Proctoring Flags
  const emmaSub = execute(`
    INSERT INTO submissions (
      assessment_id, student_id, student_name, student_email,
      status, start_time, submit_time, total_score, max_score, percentage, passed,
      proctoring_status, proctoring_notes, tab_switch_count, consent_given
    ) VALUES (?, ?, ?, ?, ?, datetime('now', '-5 hours'), datetime('now', '-4 hours'), ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    exam1Id, studentEmma.id, studentEmma.name, studentEmma.email,
    'graded', 34, 50, 68, 1,
    'flagged', 'Proctoring flagged: 2 tab switch events detected during written question section.', 2, 1
  ]);

  const emmaSubId = emmaSub.lastInsertRowid;

  // Answers for Emma
  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score)
    VALUES 
    (?, ?, '201 Created', 1, 1, 0, 5, 5),
    (?, ?, 'Enables multi-threading on the client CPU', 0, 1, 0, 0, 5),
    (?, ?, 'False', 1, 1, 0, 5, 5),
    (?, ?, 'Single Master with Read Replicas (Primary-Replica)', 1, 1, 0, 5, 5)
  `, [
    emmaSubId, exam1Questions[0].id,
    emmaSubId, exam1Questions[1].id,
    emmaSubId, exam1Questions[2].id,
    emmaSubId, exam1Questions[3].id
  ]);

  execute(`
    INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, auto_graded, manual_graded, score, max_score, teacher_feedback, graded_by_user_id, graded_by_name)
    VALUES 
    (?, ?, 'Normalization removes repeating columns. 1NF, 2NF, 3NF each remove different kinds of dependencies.', 1, 0, 1, 9, 15, 'Brief explanation, missed specific anomaly examples.', ?, ?),
    (?, ?, 'JWT contains header, payload, signature. Encoded with base64 and signed by secret key on backend.', 1, 0, 1, 10, 15, 'Satisfactory overview, lacks in-depth discussion of XSS vs CSRF.', ?, ?)
  `, [
    emmaSubId, exam1Questions[4].id, teacher1.id, 'Prof. Robert Smith',
    emmaSubId, exam1Questions[5].id, teacher1.id, 'Prof. Robert Smith'
  ]);

  // Proctoring logs for Emma with tab switches
  execute(`
    INSERT INTO proctoring_logs (submission_id, student_id, event_type, message, severity, created_at)
    VALUES 
    (?, ?, 'consent_granted', 'Student consented to camera proctoring.', 'info', datetime('now', '-5 hours')),
    (?, ?, 'fullscreen_enter', 'Student entered fullscreen lockdown mode.', 'info', datetime('now', '-295 minutes')),
    (?, ?, 'tab_switch', 'WARNING: Browser tab switch / window blur detected! Student navigated away from assessment window.', 'violation', datetime('now', '-270 minutes')),
    (?, ?, 'tab_switch', 'WARNING: Second tab switch detected. Session marked for proctor inspection.', 'violation', datetime('now', '-255 minutes'))
  `, [
    emmaSubId, studentEmma.id,
    emmaSubId, studentEmma.id,
    emmaSubId, studentEmma.id,
    emmaSubId, studentEmma.id
  ]);

  console.log('AssessPro database successfully initialized with demo users, assessments, questions, submissions, and audit trail!');
}

// Auto-grade submission answers
function gradeMCQAnswers(submissionId) {
  const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId]);
  if (!submission) return;

  const answers = queryAll(`
    SELECT sa.*, q.type, q.correct_answer, q.points as question_points
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.id
    WHERE sa.submission_id = ?
  `, [submissionId]);

  let totalScore = 0;
  let maxScore = 0;
  let hasPendingWritten = false;

  for (const ans of answers) {
    maxScore += ans.question_points;

    if (ans.type === 'mcq' || ans.type === 'true_false') {
      const isCorrect = (ans.student_answer || '').trim().toLowerCase() === (ans.correct_answer || '').trim().toLowerCase();
      const score = isCorrect ? ans.question_points : 0;
      
      execute(`
        UPDATE student_answers 
        SET is_correct = ?, auto_graded = 1, score = ?, max_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [isCorrect ? 1 : 0, score, ans.question_points, ans.id]);

      totalScore += score;
    } else if (ans.type === 'written') {
      if (ans.manual_graded === 1) {
        totalScore += (ans.score || 0);
      } else {
        hasPendingWritten = true;
      }
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100 * 10) / 10 : 0;
  const assessment = queryOne('SELECT passing_marks FROM assessments WHERE id = ?', [submission.assessment_id]);
  const passed = totalScore >= (assessment ? assessment.passing_marks : 40) ? 1 : 0;

  const newStatus = hasPendingWritten ? 'submitted' : 'graded';

  execute(`
    UPDATE submissions 
    SET total_score = ?, max_score = ?, percentage = ?, passed = ?, status = ?, submit_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [totalScore, maxScore, percentage, passed, newStatus, submissionId]);

  return { totalScore, maxScore, percentage, passed, status: newStatus };
}

// Recalculate submission total after teacher/admin mark update
function recalculateSubmissionTotal(submissionId) {
  const submission = queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId]);
  if (!submission) return;

  const stats = queryOne(`
    SELECT 
      SUM(score) as total_score, 
      SUM(max_score) as max_score,
      COUNT(CASE WHEN (type = 'written' AND manual_graded = 0) THEN 1 END) as pending_written
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.id
    WHERE sa.submission_id = ?
  `, [submissionId]);

  const totalScore = stats.total_score || 0;
  const maxScore = stats.max_score || 0;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100 * 10) / 10 : 0;
  
  const assessment = queryOne('SELECT passing_marks FROM assessments WHERE id = ?', [submission.assessment_id]);
  const passed = totalScore >= (assessment ? assessment.passing_marks : 40) ? 1 : 0;
  const status = stats.pending_written > 0 ? 'submitted' : 'graded';

  execute(`
    UPDATE submissions 
    SET total_score = ?, max_score = ?, percentage = ?, passed = ?, status = ?
    WHERE id = ?
  `, [totalScore, maxScore, percentage, passed, status, submissionId]);

  return { totalScore, maxScore, percentage, passed, status };
}

module.exports = {
  db,
  queryAll,
  queryOne,
  execute,
  exec,
  initializeDatabase,
  gradeMCQAnswers,
  recalculateSubmissionTotal
};
