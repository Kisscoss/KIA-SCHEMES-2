import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import schemesRouter from "./routes/schemes.js";

dotenv.config();

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Behind a reverse proxy (Render/Railway/Nginx), set TRUST_PROXY=1 so rate
// limiting sees the real client IP instead of the proxy's.
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// Restrict CORS to an explicit allowlist (comma-separated in CORS_ORIGIN).
// Browsers only; non-browser clients ignore CORS, so API auth still matters.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  })
);
app.use(express.json({ limit: "1mb" }));

// Basic global rate limit: 120 requests / minute / IP (in-memory; fine for
// a single instance — swap for a shared store if you scale horizontally).
const hits = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const now = Date.now();
  const key = req.ip ?? "unknown";
  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > 120) {
    return res.status(429).json({ error: "Too many requests. Slow down." });
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "kia-schemes-api" });
});

app.use("/api/schemes", schemesRouter);

// 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the Vite build (dist/) when deployed together.
const distDir = path.resolve(dirname, "../../dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next();
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`KIA Schemes API listening on :${port}`);
});
