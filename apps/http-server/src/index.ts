import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { folderRouter } from "./routes/folders.js";
import { fileRouter } from "./routes/files.js";

dotenv.config();
dotenv.config({ path: "../../.env" });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.set("trust proxy", 1);

// Strict CORS allowing credentialed requests from web client
app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Rate Limiter - Excludes localhost dev or provides generous threshold to prevent false positives
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 1000 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development or for localhost loopback IPs
    if (process.env.NODE_ENV !== "production") return true;
    const ip = req.ip || "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  },
  message: { error: "Too many requests from this IP, please try again later." },
});

app.use("/api/", apiLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "http-server" });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/folders", folderRouter);
app.use("/api/files", fileRouter);

app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});
