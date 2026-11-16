const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const SELECT_ALL = `
  SELECT c.*, (t.first_name || ' ' || t.last_name) AS teacher_name
  FROM courses c
  LEFT JOIN teachers t ON t.id = c.teacher_id
`;

router.get("/", requireRole("admin", "teacher", "student"), (req, res) => {
  res.json(db.prepare(SELECT_ALL + " ORDER BY c.id DESC").all());
});

router.get("/:id", requireRole("admin", "teacher", "student"), (req, res) => {
  const row = db.prepare(SELECT_ALL + " WHERE c.id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Course not found." });
  res.json(row);
});

router.post("/", requireRole("admin", "teacher"), (req, res) => {
  const {
    course_code,
    course_name,
    teacher_id,
    grade_level,
    credits,
    description,
    status,
  } = req.body;
  if (!course_code || !course_name) {
    return res
      .status(400)
      .json({ error: "Course code and name are required." });
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO courses
      (course_code, course_name, teacher_id, grade_level, credits, description, status)
      VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        course_code,
        course_name,
        teacher_id || null,
        grade_level || null,
        credits || 3,
        description || null,
        status || "active",
      );
    res
      .status(201)
      .json(
        db
          .prepare(SELECT_ALL + " WHERE c.id = ?")
          .get(info.lastInsertRowid),
      );
  } catch (err) {
    res.status(400).json({
      error:
        "A course with that code already exists, or the data was invalid.",
    });
  }
});

router.put("/:id", requireRole("admin", "teacher"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM courses WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Course not found." });
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE courses SET course_code=?, course_name=?, teacher_id=?, grade_level=?, credits=?, description=?, status=? WHERE id=?`,
  ).run(
    merged.course_code,
    merged.course_name,
    merged.teacher_id || null,
    merged.grade_level,
    merged.credits,
    merged.description,
    merged.status,
    req.params.id,
  );
  res.json(db.prepare(SELECT_ALL + " WHERE c.id = ?").get(req.params.id));
});

router.delete("/:id", requireRole("admin"), (req, res) => {
  const info = db
    .prepare("DELETE FROM courses WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Course not found." });
  res.json({ deleted: true });
});

module.exports = router;
