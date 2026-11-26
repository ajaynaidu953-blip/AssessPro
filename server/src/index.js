const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./db');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessments');
const submissionRoutes = require('./routes/submissions');
const gradeRoutes = require('./routes/grades');
const proctoringRoutes = require('./routes/proctoring');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize SQLite database & seed data
initializeDatabase();

// Middleware
app.use(cors());
// Increased body limit to 25MB for webcam snapshots (base64 image strings)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve uploaded proctoring snapshots statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'AssessPro – Online Assessment & Webcam Monitoring System',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static assets from client/dist if available
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` AssessPro Backend Server running on http://localhost:${PORT}`);
  console.log(` Ready for Assessments, Auto-Grading & Webcam Proctoring`);
  console.log(`=======================================================`);
});

module.exports = app;
