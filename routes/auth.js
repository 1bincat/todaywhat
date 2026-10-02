import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sign = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// 회원가입
router.post("/signup", async (req, res) => {
  const { password, nickname } = req.body;
  const email = req.body.email?.trim();

  if (!email || !password || !nickname) {
    return res.status(400).json({ message: "모든 항목을 입력해주세요." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "올바른 이메일 형식으로 입력해주세요." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "비밀번호는 8자 이상이어야 해요." });
  }

  try {
    const [exists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) {
      return res.status(409).json({ message: "이미 가입된 이메일이에요." });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)",
      [email, hash, nickname]
    );

    const user = { id: result.insertId, email, nickname };
    res.status(201).json({ token: sign(user), user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 로그인
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    const u = rows[0];

    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 틀렸어요." });
    }

    const user = { id: u.id, email: u.email, nickname: u.nickname };
    res.json({ token: sign(user), user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 닉네임 변경
router.patch("/nickname", auth, async (req, res) => {
  const nickname = req.body.nickname?.trim();
  if (!nickname || nickname.length > 30) {
    return res.status(400).json({ message: "닉네임은 1~30자로 입력해주세요." });
  }

  try {
    await db.query("UPDATE users SET nickname = ? WHERE id = ?", [nickname, req.userId]);
    res.json({ nickname });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 비밀번호 변경
router.patch("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "새 비밀번호는 8자 이상이어야 해요." });
  }

  try {
    const [rows] = await db.query("SELECT password_hash FROM users WHERE id = ?", [req.userId]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ message: "현재 비밀번호가 틀렸어요." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.userId]);
    res.json({ message: "비밀번호가 변경되었어요." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 회원 탈퇴 (티켓·후기도 함께 삭제됨)
router.delete("/account", auth, async (req, res) => {
  const { password } = req.body;

  try {
    const [rows] = await db.query("SELECT password_hash FROM users WHERE id = ?", [req.userId]);
    if (!rows[0] || !(await bcrypt.compare(password || "", rows[0].password_hash))) {
      return res.status(400).json({ message: "비밀번호가 틀렸어요." });
    }

    await db.query("DELETE FROM users WHERE id = ?", [req.userId]);
    res.json({ message: "탈퇴가 완료되었어요." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;