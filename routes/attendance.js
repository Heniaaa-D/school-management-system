const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const SELECT_ALL = `
  SELECT a.*, (s.first_name || ' ' || s.last_name) AS student_name, c.course_name
  FROM attendance a
  JOIN students s ON s.id = a.student_id
  LEFT JOIN courses c ON c.id = a.course_id
`;

router.get("/", (req, res) => {
  if (req.user.role === "student") {
    return res.json(
      db
        .prepare(SELECT_ALL + " WHERE a.student_id = ? ORDER BY a.date DESC")
        .all(req.user.student_id),
    );
  }
  res.json(db.prepare(SELECT_ALL + " ORDER BY a.date DESC").all());
});

router.get("/:id", (req, res) => {
  const row = db.prepare(SELECT_ALL + " WHERE a.id = ?").get(req.params.id);
  if (!row)
    return res.status(404).json({ error: "Attendance record not found." });
  if (req.user.role === "student" && row.student_id !== req.user.student_id) {
    return res
      .status(403)
      .json({ error: "You do not have permission to do that." });
  }
  res.json(row);
});

router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const { student_id, course_id, date, status } = req.body;
  if (!student_id || !date || !status) {
    return res
      .status(400)
      .json({ error: "Student, date, and status are required." });
  }
  const info = db
    .prepare(
      `INSERT INTO attendance (student_id, course_id, date, status) VALUES (?,?,?,?)`,
    )
    .run(student_id, course_id || null, date, status);
  res
    .status(201)
    .json(db.prepare(SELECT_ALL + " WHERE a.id = ?").get(info.lastInsertRowid));
});

router.put("/:id", requireRole("admin", "teacher"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM attendance WHERE id = ?")
    .get(req.params.id);
  if (!existing)
    return res.status(404).json({ error: "Attendance record not found." });
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE attendance SET student_id=?, course_id=?, date=?, status=? WHERE id=?`,
  ).run(
    merged.student_id,
    merged.course_id || null,
    merged.date,
    merged.status,
    req.params.id,
  );
  res.json(db.prepare(SELECT_ALL + " WHERE a.id = ?").get(req.params.id));
});

router.delete("/:id", requireRole("admin", "teacher"), (req, res) => {
  const info = db
    .prepare("DELETE FROM attendance WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Attendance record not found." });
  res.json({ deleted: true });
});

module.exports = router;
