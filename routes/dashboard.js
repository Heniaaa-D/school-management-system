const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/stats", (req, res) => {
  if (req.user.role === "student") {
    const studentId = req.user.student_id;
    const grades_count = db
      .prepare("SELECT COUNT(*) AS c FROM grades WHERE student_id = ?")
      .get(studentId).c;
    const present_days = db
      .prepare(
        `SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND status = 'Present'`,
      )
      .get(studentId).c;
    const absent_days = db
      .prepare(
        `SELECT COUNT(*) AS c FROM attendance WHERE student_id = ? AND status = 'Absent'`,
      )
      .get(studentId).c;
    const recent_grades = db
      .prepare(
        `SELECT g.score, g.letter_grade, c.course_name
         FROM grades g JOIN courses c ON c.id = g.course_id
         WHERE g.student_id = ? ORDER BY g.id DESC LIMIT 5`,
      )
      .all(studentId);
    return res.json({
      role: "student",
      grades_count,
      present_days,
      absent_days,
      recent_grades,
    });
  }

  const total_students = db.prepare("SELECT COUNT(*) AS c FROM students").get().c;
  const total_teachers = db.prepare("SELECT COUNT(*) AS c FROM teachers").get().c;
  const total_courses = db.prepare("SELECT COUNT(*) AS c FROM courses").get().c;
  const total_grades = db.prepare("SELECT COUNT(*) AS c FROM grades").get().c;
  const recent_students = db
    .prepare(
      "SELECT first_name, last_name, grade_level FROM students ORDER BY id DESC LIMIT 5",
    )
    .all();
  const recent_grades = db
    .prepare(
      `SELECT g.letter_grade, c.course_name, (s.first_name || ' ' || s.last_name) AS student_name
       FROM grades g
       JOIN students s ON s.id = g.student_id
       JOIN courses c ON c.id = g.course_id
       ORDER BY g.id DESC LIMIT 5`,
    )
    .all();

  res.json({
    role: req.user.role,
    total_students,
    total_teachers,
    total_courses,
    total_grades,
    recent_students,
    recent_grades,
  });
});

module.exports = router;
