import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import tasteRouter from "./routes/taste.js";
import stopoversRouter from "./routes/stopovers.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/taste", tasteRouter);
app.use("/api/stopovers", stopoversRouter);

app.listen(process.env.PORT, () => {
  console.log(`server on http://localhost:${process.env.PORT}`);
});