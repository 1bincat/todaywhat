import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import tasteRouter from "./routes/taste.js";
import stopoversRouter from "./routes/stopovers.js";
import recommendRouter from "./routes/recommend.js";
import aroundRouter from "./routes/around.js";
import ticketsRouter from "./routes/tickets.js";

const app = express();

// 웹(5173)과 앱(Capacitor) 접속을 허용해요. 추가 주소는 .env의 CORS_ORIGINS(쉼표로 구분)에 넣어요.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()) : []),
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// 업로드한 사진 제공
app.use(
  "/uploads",
  express.static(process.env.UPLOAD_ROOT || fileURLToPath(new URL("./uploads", import.meta.url)))
);

app.use("/api/auth", authRouter);
app.use("/api/taste", tasteRouter);
app.use("/api/stopovers", stopoversRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api/around", aroundRouter);
app.use("/api/tickets", ticketsRouter);

// 웹 화면(npm run build로 만든 dist)도 이 서버에서 같이 보여줘요.
// 그래서 서버 주소로 들어가면 Cannot GET / 대신 앱 화면이 열려요.
const distDir = fileURLToPath(new URL("./dist", import.meta.url));
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // 새로고침해도 화면이 열리도록, API/사진 주소가 아닌 모든 주소는 index.html로 보내요.
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(process.env.PORT, () => {
  console.log(`server on http://localhost:${process.env.PORT}`);
});