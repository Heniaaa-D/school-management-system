const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Admin and teachers can view the teacher directory (e.g. to pick a teacher for a course).
// Students do not have access to this module.
router.get("/", requireRole("admin", "teacher"), (req, res) => {
  res.json(db.prepare("SELECT * FROM teachers ORDER BY id DESC").all());
});

router.get("/:id", requireRole("admin", "teacher"), (req, res) => {
  const row = db
    .prepare("SELECT * FROM teachers WHERE id = ?")
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Teacher not found." });
  res.json(row);
});

router.post("/", requireRole("admin"), (req, res) => {
  const { teacher_code, first_name, last_name, email, phone, subject, status } =
    req.body;
  if (!teacher_code || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: "Teacher code, first name, and last name are required." });
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO teachers
      (teacher_code, first_name, last_name, email, phone, subject, status)
      VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        teacher_code,
        first_name,
        last_name,
        email || null,
        phone || null,
        subject || null,
        status || "active",
      );
    res
      .status(201)
      .json(
        db
          .prepare("SELECT * FROM teachers WHERE id = ?")
          .get(info.lastInsertRowid),
      );
  } catch (err) {
    res.status(400).json({
      error:
        "A teacher with that code already exists, or the data was invalid.",
    });
  }
});

router.put("/:id", requireRole("admin"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM teachers WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Teacher not found." });
  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE teachers SET teacher_code=?, first_name=?, last_name=?, email=?, phone=?, subject=?, status=? WHERE id=?`,
  ).run(
    merged.teacher_code,
    merged.first_name,
    merged.last_name,
    merged.email,
    merged.phone,
    merged.subject,
    merged.status,
    req.params.id,
  );
  res.json(
    db.prepare("SELECT * FROM teachers WHERE id = ?").get(req.params.id),
  );
});

router.delete("/:id", requireRole("admin"), (req, res) => {
  const info = db
    .prepare("DELETE FROM teachers WHERE id = ?")
    .run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: "Teacher not found." });
  res.json({ deleted: true });
});

module.exports = router;
