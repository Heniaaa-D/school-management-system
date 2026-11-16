const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    teacher_id: user.teacher_id,
    student_id: user.student_id,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: payload });
});

module.exports = router;
