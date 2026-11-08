import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import db from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/* ---------------- 사진 업로드 ---------------- */

// 배포 시 UPLOAD_ROOT(영구 저장 볼륨 경로)를 지정하면 사진이 그 안에 저장돼요.
const UPLOAD_DIR = process.env.UPLOAD_ROOT
  ? path.join(process.env.UPLOAD_ROOT, "journeys")
  : fileURLToPath(new URL("../uploads/journeys/", import.meta.url));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) cb(null, true);
    else cb(new Error("jpg, png, webp, gif 이미지만 올릴 수 있어요."));
  },
});

const uploadPhoto = (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "사진은 5MB 이하만 올릴 수 있어요." : err.message;
    res.status(400).json({ message: message || "사진 업로드에 실패했어요." });
  });
};

const removePhoto = (photoUrl) => {
  if (!photoUrl) return;
  fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(photoUrl))).catch(() => {});
};

const dropUpload = (req) => {
  if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
};

/* ---------------- 공통 ---------------- */

const parse = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const SELECT = `
  SELECT t.id, t.title, t.category, t.place_name, t.description, t.conditions, t.ticket_data,
         t.latitude, t.longitude, t.created_at,
         j.id AS journey_id, j.review, j.rating, j.photo_url,
         DATE_FORMAT(j.visited_at, '%Y-%m-%d') AS visited_at
  FROM tickets t
  LEFT JOIN journeys j ON j.ticket_id = t.id`;

function format(r) {
  const data = parse(r.ticket_data) ?? {};
  return {
    id: r.id,
    ticket: {
      ...data,
      type: r.category ?? data.type,
      title: r.title,
      place: r.place_name,
      reason: r.description ?? data.reason,
      lat: r.latitude != null ? Number(r.latitude) : data.lat,
      lng: r.longitude != null ? Number(r.longitude) : data.lng,
    },
    conditions: parse(r.conditions),
    savedAt: r.created_at,
    journey: r.journey_id
      ? { review: r.review, rating: r.rating, visitedAt: r.visited_at, photoUrl: r.photo_url }
      : null,
  };
}

const toNumOrNull = (v) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : null);

/* ---------------- 티켓 ---------------- */

// 저장한 티켓 목록 (?limit= 으로 개수 제한)
router.get("/", auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 200);
  try {
    const [rows] = await db.query(
      `${SELECT} WHERE t.user_id = ? ORDER BY t.created_at DESC, t.id DESC LIMIT ?`,
      [req.userId, limit]
    );
    res.json(rows.map(format));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 티켓 한 장
router.get("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "잘못된 요청이에요." });

  try {
    const [rows] = await db.query(`${SELECT} WHERE t.id = ? AND t.user_id = ?`, [id, req.userId]);
    if (!rows[0]) return res.status(404).json({ message: "티켓을 찾을 수 없어요." });
    res.json(format(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

// 티켓 저장 (같은 날 같은 장소는 중복 저장하지 않음)
router.post("/", auth, async (req, res) => {
  const { ticket, conditions } = req.body;
  if (!ticket?.place || !ticket?.title) {
    return res.status(400).json({ message: "잘못된 요청이에요." });
  }

  try {
    const [dup] = await db.query(
      `SELECT id FROM tickets
       WHERE user_id = ? AND place_name = ? AND DATE(created_at) = CURDATE() LIMIT 1`,
      [req.userId, String(ticket.place).slice(0, 100)]
    );
    if (dup[0]) return res.json({ id: dup[0].id, duplicated: true });

    const [result] = await db.query(
      `INSERT INTO tickets
         (user_id, title, category, place_name, description, conditions, ticket_data, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        String(ticket.title).slice(0, 100),
        ticket.type ? String(ticket.type).slice(0, 30) : null,
        String(ticket.place).slice(0, 100),
        ticket.reason ?? null,
        JSON.stringify(conditions ?? null),
        JSON.stringify(ticket),
        toNumOrNull(ticket.lat),
        toNumOrNull(ticket.lng),
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "저장하지 못했어요." });
  }
});

// 티켓 삭제 (기록도 함께 삭제됨)
router.delete("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "잘못된 요청이에요." });

  try {
    const [rows] = await db.query(
      `SELECT j.photo_url FROM tickets t
       LEFT JOIN journeys j ON j.ticket_id = t.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ message: "티켓을 찾을 수 없어요." });

    await db.query("DELETE FROM tickets WHERE id = ? AND user_id = ?", [id, req.userId]);
    removePhoto(rows[0].photo_url);
    res.json({ message: "삭제되었어요." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* ---------------- 기록(별점/후기/방문일/사진) ---------------- */

router.put("/:id/journey", auth, uploadPhoto, async (req, res) => {
  const id = Number(req.params.id);
  const rating = req.body.rating ? Number(req.body.rating) : null;
  const review = req.body.review?.trim() ? req.body.review.trim().slice(0, 2000) : null;
  const visitedAt = /^\d{4}-\d{2}-\d{2}$/.test(req.body.visited_at ?? "") ? req.body.visited_at : null;

  if (!Number.isInteger(id) || (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5))) {
    dropUpload(req);
    return res.status(400).json({ message: "잘못된 요청이에요." });
  }

  try {
    const [t] = await db.query("SELECT id FROM tickets WHERE id = ? AND user_id = ?", [id, req.userId]);
    if (!t[0]) {
      dropUpload(req);
      return res.status(404).json({ message: "티켓을 찾을 수 없어요." });
    }

    const [old] = await db.query("SELECT photo_url FROM journeys WHERE ticket_id = ?", [id]);
    let photoUrl = old[0]?.photo_url ?? null;

    if (req.file) {
      removePhoto(photoUrl);
      photoUrl = `/uploads/journeys/${req.file.filename}`;
    } else if (req.body.removePhoto === "true") {
      removePhoto(photoUrl);
      photoUrl = null;
    }

    await db.query(
      `INSERT INTO journeys (ticket_id, user_id, review, rating, visited_at, photo_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         review = VALUES(review), rating = VALUES(rating),
         visited_at = VALUES(visited_at), photo_url = VALUES(photo_url)`,
      [id, req.userId, review, rating, visitedAt, photoUrl]
    );

    res.json({ review, rating, visitedAt, photoUrl });
  } catch (e) {
    dropUpload(req);
    console.error(e);
    res.status(500).json({ message: "기록을 저장하지 못했어요." });
  }
});

export default router;