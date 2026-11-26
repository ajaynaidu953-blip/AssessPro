# AssessPro – Online Assessment & Webcam Monitoring System

AssessPro is a professional, responsive full-stack web application designed for universities, colleges, schools, and corporate certification bodies to conduct secure online assessments, monitor candidates in real-time through webcams, automatically evaluate objective questions (MCQs & True/False), support manual grading of descriptive written answers by teachers, and provide administrators with comprehensive mark override authority backed by an immutable database audit trail.

---

## 🌟 Key Features & Requirements Matrix

| Requirement | Implementation Details |
| :--- | :--- |
| **Three Distinct Roles** | **Admin**, **Teacher**, and **Student** with dedicated role-based portals, permissions, and 1-click test role switcher. |
| **Assessment Management** | Teachers can create and manage assessments with custom time limits, passing marks, and mixed question types. |
| **Student Examination Portal** | Interactive test runner with countdown timer, question navigator palette, answer status indicators, and fullscreen enforcement. |
| **Webcam Proctoring** | Continuous live camera feed with face guide overlay, picture-in-picture widget, periodic integrity snapshot uploads, and student consent modal. |
| **Anti-Cheating Detection** | Automatic tab-switch and window-blur tracking with real-time modal warnings and strike limit enforcement. |
| **MCQ Auto-Grading** | Instant automatic evaluation of Multiple Choice & True/False questions upon exam submission. |
| **Written Question Grading** | Dedicated teacher evaluation interface for scoring descriptive answers with customizable marks and qualitative feedback. |
| **Admin Mark Overrides** | Administrators have full authority to override **ANY** student's marks (including auto-graded MCQs) with mandatory justification reason. |
| **Database Audit Trail** | Every mark change is recorded in SQLite with full forensic history (`old_score`, `new_score`, `difference`, `changed_by`, `role`, `reason`, `timestamp`). |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ or v24+ recommended)
- **npm** (v9+)

### 2. Running the Full-Stack Application
AssessPro is pre-built and configured. The Express server serves both the REST API and the responsive React frontend on a single port:

```bash
# Navigate to the AssessPro project directory
cd c:\Users\ajayn\Downloads\AssessPro

# Start the full-stack server
cd server
npm start
```

Now open your browser and navigate to:
👉 **`http://localhost:5000`**

*(Optional Vite Dev Mode with Hot Reloading)*:
```bash
# In another terminal:
cd c:\Users\ajayn\Downloads\AssessPro\client
npm run dev
# Opens at http://localhost:5173 (proxied to backend on 5000)
```

---

## 👥 Demo User Credentials (1-Click Switcher Available in UI)

The application comes pre-seeded with realistic courses, assessments, questions, submissions, and audit logs. You can log in using these credentials, or click the **"Switch Role"** button in the navigation bar:

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dr. Eleanor Vance (Dean) | `admin@assesspro.edu` | `Admin@123` | Institutional dashboard, override any question or total mark, review audit history, manage user accounts. |
| **Teacher** | Prof. Robert Smith | `teacher.smith@assesspro.edu` | `Teacher@123` | Create assessments, view submissions, manually grade written essays, review webcam snapshots. |
| **Teacher** | Dr. Maria Garcia | `teacher.garcia@assesspro.edu` | `Teacher@123` | AI & Machine Learning Faculty. |
| **Student** | Alex Johnson | `student.alex@assesspro.edu` | `Student@123` | Has existing graded assessment (92%) with webcam snapshots and an admin grade override to explore. |
| **Student** | Emma Watson | `student.emma@assesspro.edu` | `Student@123` | Has sample submission with tab-switch proctoring violations recorded. |
| **Student** | John Doe | `student.john@assesspro.edu` | `Student@123` | Fresh candidate ready to take any published exam live! |

---

## 🧪 Testing Guide: Verification Walkthrough

### 1. Student Exam & Webcam Consent Experience
1. Log in as **John Doe** (`student.john@assesspro.edu` / `Student@123`).
2. On the student dashboard, locate **"Artificial Intelligence & Machine Learning Fundamentals"** and click **Start Exam**.
3. The **Webcam Proctoring Consent & Hardware Check** modal will open:
   - Check camera preview with face guideline.
   - Read examination rules.
   - Check the **"I Grant Webcam Consent & Agree to Examination Terms"** checkbox.
   - Click **Agree & Start Assessment**.
4. In the Exam Runner:
   - Notice the live countdown timer at the top.
   - See the floating draggable/minimizable **AI Webcam Proctor** widget in the bottom-right corner capturing periodic snapshots.
   - **Test Tab Switch Detection**: Switch to another browser tab or minimize window. An alert modal immediately appears with violation count and captures an incident snapshot!
   - Answer the MCQs and type a written answer in the descriptive question.
   - Click **Review & Submit** to finalize the test.
5. Notice the **MCQ questions are automatically graded immediately**! The written answer remains marked as *Pending Manual Review*.

### 2. Teacher Manual Grading of Written Questions
1. Switch to **Prof. Robert Smith** (`teacher.smith@assesspro.edu` / `Teacher@123`) or **Dr. Maria Garcia**.
2. Go to **Dashboard & Exams** and click **Submissions** on the assessment.
3. Click **Grade Submission** on any student.
4. In the grading workspace:
   - View the auto-graded MCQs with correct keys.
   - Navigate to the written response: read the student's text and scoring rubric.
   - Input marks (e.g. `16 / 20`) and constructive feedback comments.
   - Click **Save Grade**.
   - Notice the total submission score, percentage, and pass/fail status recalculate automatically!
5. Switch to the **Webcam Proctoring Report** tab to inspect photos taken by the student's camera during the exam.

### 3. Administrator Mark Override & Audit Trail Verification
1. Switch to **Admin (Dr. Eleanor Vance)** (`admin@assesspro.edu` / `Admin@123`).
2. Click **Grade Overrides** in the top navigation.
3. Select any student submission and click **Inspect & Override Marks**.
4. Test Admin Superuser Capabilities:
   - Click **Override Mark** on an **auto-graded MCQ** that the student got wrong (or right).
   - Enter a new score and a mandatory **Audit Justification Reason** (e.g., *"Administrative grace marks granted after committee review of syllabus overlap"*).
   - Click **Apply Override & Save to Audit**.
   - You can also click **Override Overall Total Score** to adjust the total mark directly!
5. Navigate to **Audit Logs** in the top navigation:
   - Inspect the table: every single mark alteration is stored permanently with:
     - Exact Timestamp
     - Target Question or Total Score
     - Previous Score
     - New Score
     - Score Delta (+ / -)
     - Authorized By (Dr. Eleanor Vance)
     - Role (`admin`)
     - Mandatory Justification Reason

---

## 🛠️ Architecture & Technology Stack

- **Frontend**:
  - React 18 with modern React Hooks (`useState`, `useEffect`, `useContext`, `useRef`)
  - Pure responsive CSS3 with CSS custom properties, cards, tables, badges, modals, and flex/grid layouts
  - Lucide React icons
  - Canvas Confetti for exam completion celebration
  - Native HTML5 MediaDevices API (`getUserMedia`) and Canvas API for camera capture
- **Backend**:
  - Node.js & Express REST API
  - JWT (JSON Web Tokens) with 7-day expiration and role verification middleware
  - BCrypt password hashing
  - Built-in SQLite database engine (`node:sqlite` / SQLite3) with WAL mode and foreign key constraints
  - File upload engine storing periodic webcam JPEG snapshots in `/uploads/snapshots`
