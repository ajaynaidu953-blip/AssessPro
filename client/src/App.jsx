import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import ExamInterface from './pages/ExamInterface';
import ExamResult from './pages/ExamResult';

// Teacher Pages
import TeacherDashboard from './pages/TeacherDashboard';
import CreateAssessment from './pages/CreateAssessment';
import TeacherSubmissionsList from './pages/TeacherSubmissionsList';
import TeacherGradeSubmission from './pages/TeacherGradeSubmission';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminSubmissionDetails from './pages/AdminSubmissionDetails';

function MainApp() {
  const { user } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [currentView, setCurrentView] = useState('student-dashboard');
  
  // Navigation State Parameters
  const [activeAssessmentId, setActiveAssessmentId] = useState(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);

  // Automatically adjust default view when user logs in or switches role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setCurrentView('admin-dashboard');
      } else if (user.role === 'teacher') {
        setCurrentView('teacher-dashboard');
      } else {
        setCurrentView('student-dashboard');
      }
    }
  }, [user?.role, user?.id]);

  // If not authenticated, show Login or Register
  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="app-container">
      {/* Hide navbar during active exam to minimize distractions and prevent accidental exits */}
      {currentView !== 'exam-interface' && (
        <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      )}

      <main className="main-content">
        {/* STUDENT FLOW */}
        {currentView === 'student-dashboard' && (
          <StudentDashboard
            onStartExam={(examId) => {
              setActiveAssessmentId(examId);
              setCurrentView('exam-interface');
            }}
            onViewResult={(subId) => {
              setActiveSubmissionId(subId);
              setCurrentView('exam-result');
            }}
          />
        )}

        {currentView === 'exam-interface' && (
          <ExamInterface
            assessmentId={activeAssessmentId}
            onExitToDashboard={() => setCurrentView('student-dashboard')}
            onExamCompleted={(subId) => {
              setActiveSubmissionId(subId);
              setCurrentView('exam-result');
            }}
          />
        )}

        {currentView === 'exam-result' && (
          <ExamResult
            submissionId={activeSubmissionId}
            onBackToDashboard={() => {
              if (user.role === 'admin') setCurrentView('admin-dashboard');
              else if (user.role === 'teacher') setCurrentView('teacher-dashboard');
              else setCurrentView('student-dashboard');
            }}
          />
        )}

        {/* TEACHER FLOW */}
        {currentView === 'teacher-dashboard' && (
          <TeacherDashboard
            onCreateAssessment={() => {
              setEditingAssessmentId(null);
              setCurrentView('create-assessment');
            }}
            onEditAssessment={(examId) => {
              setEditingAssessmentId(examId);
              setCurrentView('create-assessment');
            }}
            onViewSubmissions={(examId) => {
              setActiveAssessmentId(examId);
              setCurrentView('teacher-submissions');
            }}
          />
        )}

        {currentView === 'create-assessment' && (
          <CreateAssessment
            editId={editingAssessmentId}
            onCancel={() => setCurrentView('teacher-dashboard')}
            onSuccess={() => setCurrentView('teacher-dashboard')}
          />
        )}

        {currentView === 'teacher-submissions' && (
          <TeacherSubmissionsList
            assessmentId={activeAssessmentId}
            onBack={() => setCurrentView('teacher-dashboard')}
            onGradeSubmission={(subId) => {
              setActiveSubmissionId(subId);
              setCurrentView('teacher-grade');
            }}
          />
        )}

        {currentView === 'teacher-grade' && (
          <TeacherGradeSubmission
            submissionId={activeSubmissionId}
            onBack={() => setCurrentView('teacher-submissions')}
          />
        )}

        {/* ADMIN FLOW */}
        {(currentView === 'admin-dashboard' || currentView === 'admin-submissions' || currentView === 'admin-audit' || currentView === 'admin-users') && (
          <AdminDashboard
            onInspectSubmission={(subId) => {
              setActiveSubmissionId(subId);
              setCurrentView('admin-submission-details');
            }}
          />
        )}

        {currentView === 'admin-submission-details' && (
          <AdminSubmissionDetails
            submissionId={activeSubmissionId}
            onBack={() => setCurrentView('admin-dashboard')}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
