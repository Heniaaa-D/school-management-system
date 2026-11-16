const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'school.db');
require('fs').mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema (mirrors the MySQL schema in the thesis, adapted for SQLite)
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_code TEXT NOT NULL UNIQUE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT,
  date_of_birth TEXT,
  grade_level  TEXT,
  section      TEXT,
  parent_name  TEXT,
  parent_phone TEXT,
  address      TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','graduated')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_code TEXT NOT NULL UNIQUE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  subject      TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_code  TEXT NOT NULL UNIQUE,
  course_name  TEXT NOT NULL,
  teacher_id   INTEGER,
  grade_level  TEXT,
  credits      INTEGER DEFAULT 3,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL,
  course_id    INTEGER NOT NULL,
  semester     TEXT NOT NULL,
  score        REAL NOT NULL,
  letter_grade TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id   INTEGER NOT NULL,
  course_id    INTEGER,
  date         TEXT NOT NULL,
  status       TEXT NOT NULL CHECK(status IN ('Present','Absent','Late','Excused')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id    INTEGER NOT NULL,
  day_of_week  TEXT NOT NULL CHECK(day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  room         TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
  full_name     TEXT NOT NULL,
  teacher_id    INTEGER,
  student_id    INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);
`);

// ---------------------------------------------------------------------------
// Seed data (only runs once, on an empty database)
// ---------------------------------------------------------------------------
const studentCount = db.prepare('SELECT COUNT(*) AS c FROM students').get().c;

if (studentCount === 0) {
  const insertTeacher = db.prepare(`INSERT INTO teachers
    (teacher_code, first_name, last_name, email, phone, subject, status)
    VALUES (?,?,?,?,?,?,'active')`);

  const teacherIds = [
    insertTeacher.run('TCH001', 'Maria', 'Johnson', 'maria@school.edu', '+355 69 123 4567', 'Mathematics').lastInsertRowid,
    insertTeacher.run('TCH002', 'Robert', 'Smith', 'robert@school.edu', '+355 69 234 5678', 'Science').lastInsertRowid,
    insertTeacher.run('TCH003', 'Emily', 'Davis', 'emily@school.edu', '+355 69 345 6789', 'English').lastInsertRowid,
    insertTeacher.run('TCH004', 'Michael', 'Brown', 'michael@school.edu', '+355 69 456 7890', 'History').lastInsertRowid,
    insertTeacher.run('TCH005', 'Sarah', 'Wilson', 'sarah@school.edu', '+355 69 567 8901', 'Physical Education').lastInsertRowid,
  ];

  const insertCourse = db.prepare(`INSERT INTO courses
    (course_code, course_name, teacher_id, grade_level, credits, description, status)
    VALUES (?,?,?,?,?,?,'active')`);

  const courseIds = {
    MATH101: insertCourse.run('MATH101', 'Algebra I', teacherIds[0], 'Grade 9', 4, 'Introductory algebra').lastInsertRowid,
    SCI101: insertCourse.run('SCI101', 'Biology Basics', teacherIds[1], 'Grade 9', 3, 'Foundations of biology').lastInsertRowid,
    ENG101: insertCourse.run('ENG101', 'English Literature', teacherIds[2], 'Grade 10', 3, 'Classic and modern literature').lastInsertRowid,
    HIST101: insertCourse.run('HIST101', 'World History', teacherIds[3], 'Grade 10', 3, 'Global historical events').lastInsertRowid,
    PE101: insertCourse.run('PE101', 'Physical Education', teacherIds[4], 'Grade 9', 2, 'Fitness and sport').lastInsertRowid,
    MATH201: insertCourse.run('MATH201', 'Geometry', teacherIds[0], 'Grade 10', 4, 'Plane and solid geometry').lastInsertRowid,
  };

  const insertStudent = db.prepare(`INSERT INTO students
    (student_code, first_name, last_name, email, grade_level, section, parent_name, parent_phone, status)
    VALUES (?,?,?,?,?,?,?,?,'active')`);

  const studentIds = [
    insertStudent.run('STU001', 'Alice', 'Anderson', 'alice@school.edu', 'Grade 9', 'A', 'John Anderson', '+355 69 111 1111').lastInsertRowid,
    insertStudent.run('STU002', 'Bob', 'Martinez', 'bob@school.edu', 'Grade 9', 'A', 'Carlos Martinez', '+355 69 222 2222').lastInsertRowid,
    insertStudent.run('STU003', 'Carol', 'Thompson', 'carol@school.edu', 'Grade 10', 'B', 'Jane Thompson', '+355 69 333 3333').lastInsertRowid,
    insertStudent.run('STU004', 'David', 'Garcia', 'david@school.edu', 'Grade 10', 'A', 'Miguel Garcia', '+355 69 444 4444').lastInsertRowid,
    insertStudent.run('STU005', 'Eva', 'Robinson', 'eva@school.edu', 'Grade 9', 'B', 'Lisa Robinson', '+355 69 555 5555').lastInsertRowid,
  ];

  const insertGrade = db.prepare(`INSERT INTO grades (student_id, course_id, semester, score, letter_grade) VALUES (?,?,?,?,?)`);
  const toLetter = (s) => (s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F');
  const sampleGrades = [
    [studentIds[0], courseIds.MATH101, 88.5], [studentIds[0], courseIds.SCI101, 92],
    [studentIds[1], courseIds.MATH101, 75], [studentIds[2], courseIds.ENG101, 95.5],
    [studentIds[2], courseIds.HIST101, 80], [studentIds[3], courseIds.ENG101, 70],
    [studentIds[4], courseIds.MATH101, 85],
  ];
  sampleGrades.forEach(([sid, cid, score]) =>
    insertGrade.run(sid, cid, '2025-S2', score, toLetter(score)));

  const insertAttendance = db.prepare(`INSERT INTO attendance (student_id, course_id, date, status) VALUES (?,?,?,?)`);
  insertAttendance.run(studentIds[0], courseIds.MATH101, '2026-07-10', 'Present');
  insertAttendance.run(studentIds[1], courseIds.MATH101, '2026-07-10', 'Absent');
  insertAttendance.run(studentIds[2], courseIds.ENG101, '2026-07-10', 'Late');

  const insertSchedule = db.prepare(`INSERT INTO schedules (course_id, day_of_week, start_time, end_time, room) VALUES (?,?,?,?,?)`);
  insertSchedule.run(courseIds.MATH101, 'Monday', '08:00', '09:30', 'Room 101');
  insertSchedule.run(courseIds.SCI101, 'Monday', '10:00', '11:30', 'Room 102');
  insertSchedule.run(courseIds.ENG101, 'Wednesday', '10:00', '11:30', 'Room 103');

  const insertUser = db.prepare(`INSERT INTO users
    (username, password_hash, role, full_name, teacher_id, student_id) VALUES (?,?,?,?,?,?)`);
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  insertUser.run('admin', hash('admin123'), 'admin', 'System Administrator', null, null);
  insertUser.run('mjohnson', hash('teacher123'), 'teacher', 'Maria Johnson', teacherIds[0], null);
  insertUser.run('alice', hash('student123'), 'student', 'Alice Anderson', null, studentIds[0]);

  console.log('Database seeded with sample data.');
}

module.exports = db;
