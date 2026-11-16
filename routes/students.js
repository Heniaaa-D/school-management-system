const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("admin", "teacher"), (req, res) => {
  res.json(db.prepare("SELECT * FROM students ORDER BY id DESC").all());
});

router.get("/:id", requireRole("admin", "teacher"), (req, res) => {
  const row = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Student not found." });
  res.json(row);
});

router.post("/", requireRole("admin"), (req, res) => {
  const {
    student_code,
    first_name,
    last_name,
    email,
    date_of_birth,
    grade_level,
    section,
    parent_name,
    parent_phone,
    address,
    status,
  } = req.body;
  if (!student_code || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: "Student code, first name, and last name are required." });
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO students
      (student_code, first_name, last_name, email, date_of_birth, grade_level, section, parent_name, parent_phone, address, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        student_code,
        first_name,
        last_name,
        email || null,
        date_of_birth || null,
        grade_level || null,
        section || null,
        parent_name || null,
        parent_phone || null,
        address || null,
        status || "active",
      );
    res
      .status(201)
      .json(
        db
          .prepare("SELECT * FROM students WHERE id = ?")
          .get(info.lastInsertRowid),
      );
  } catch (err) {
    res.status(400).json({
      error:
        "A student with that code already exists, or the data was invalid.",
    });
  }
});

router.put("/:id", requireRole("admin"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Student not found." });
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE students SET student_code=?, first_name=?, last_name=?, email=?, date_of_birth=?, grade_level=?, section=?, parent_name=?, parent_phone=?, address=?, status=? WHERE id=?`,
  ).run(
    merged.student_code,
    merged.first_name,
    merged.last_name,
    merged.email,
    merged.date_of_birth,
    merged.grade_level,
    merged.section,
    merged.parent_name,
    merged.parent_phone,
    merged.address,
    merged.status,
    req.params.id,
  );
  res.json(
    db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id),
  );
});

router.delete("/:id", requireRole("admin"), (req, res) => {
  const info = db
    .prepare("DELETE FROM students WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Student not found." });
  res.json({ deleted: true });
});

module.exports = router;
