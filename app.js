import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import tasteRouter from "./routes/taste.js";
import stopoversRouter from "./routes/stopovers.js";
import recommendRouter from "./routes/recommend.js";
import aroundRouter from "./routes/around.js";
import ticketsRouter from "./routes/tickets.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// 업로드한 사진 제공
app.use("/uploads", express.static(fileURLToPath(new URL("./uploads", import.meta.url))));

app.use("/api/auth", authRouter);
app.use("/api/taste", tasteRouter);
app.use("/api/stopovers", stopoversRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api/around", aroundRouter);
app.use("/api/tickets", ticketsRouter);

app.listen(process.env.PORT, () => {
  console.log(`server on http://localhost:${process.env.PORT}`);
});