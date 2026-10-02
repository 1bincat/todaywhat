import express from "express";
import db from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// 내 취향 결과 불러오기
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT answers FROM taste_profiles WHERE user_id = ?",
      [req.userId]
    );
    let answers = rows[0] ? rows[0].answers : null;
    if (typeof answers === "string") answers = JSON.parse(answers);
    res.json({ answers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 저장 (다시 하면 덮어쓰기)
router.put("/", auth, async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "잘못된 요청이에요." });
  }

  try {
    await db.query(
      `INSERT INTO taste_profiles (user_id, answers) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE answers = VALUES(answers)`,
      [req.userId, JSON.stringify(answers)]
    );
    res.json({ message: "저장되었어요." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;