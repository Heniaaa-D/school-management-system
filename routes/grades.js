const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const toLetter = (s) => (s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F");

const SELECT_ALL = `
  SELECT g.*, (s.first_name || ' ' || s.last_name) AS student_name, c.course_name
  FROM grades g
  JOIN students s ON s.id = g.student_id
  JOIN courses c ON c.id = g.course_id
`;

router.get("/", (req, res) => {
  if (req.user.role === "student") {
    return res.json(
      db
        .prepare(SELECT_ALL + " WHERE g.student_id = ? ORDER BY g.id DESC")
        .all(req.user.student_id),
    );
  }
  res.json(db.prepare(SELECT_ALL + " ORDER BY g.id DESC").all());
});

router.get("/:id", (req, res) => {
  const row = db.prepare(SELECT_ALL + " WHERE g.id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Grade not found." });
  if (req.user.role === "student" && row.student_id !== req.user.student_id) {
    return res
      .status(403)
      .json({ error: "You do not have permission to do that." });
  }
  res.json(row);
});

router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const { student_id, course_id, semester, score } = req.body;
  if (!student_id || !course_id || !semester || score === undefined || score === "") {
    return res
      .status(400)
      .json({ error: "Student, course, semester, and score are all required." });
  }
  const numericScore = Number(score);
  const info = db
    .prepare(
      `INSERT INTO grades (student_id, course_id, semester, score, letter_grade) VALUES (?,?,?,?,?)`,
    )
    .run(student_id, course_id, semester, numericScore, toLetter(numericScore));
  res
    .status(201)
    .json(db.prepare(SELECT_ALL + " WHERE g.id = ?").get(info.lastInsertRowid));
});

router.put("/:id", requireRole("admin", "teacher"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM grades WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Grade not found." });
  const merged = { ...existing, ...req.body };
  const numericScore = Number(merged.score);
  db.prepare(
    `UPDATE grades SET student_id=?, course_id=?, semester=?, score=?, letter_grade=? WHERE id=?`,
  ).run(
    merged.student_id,
    merged.course_id,
    merged.semester,
    numericScore,
    toLetter(numericScore),
    req.params.id,
  );
  res.json(db.prepare(SELECT_ALL + " WHERE g.id = ?").get(req.params.id));
});

router.delete("/:id", requireRole("admin", "teacher"), (req, res) => {
  const info = db.prepare("DELETE FROM grades WHERE id = ?").run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Grade not found." });
  res.json({ deleted: true });
});

module.exports = router;
