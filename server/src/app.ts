import express, { type Express } from "express";
import cors from "cors";
import schemesRouter from "./routes/schemes.js";
import { rateLimit } from "./rateLimit.js";

/**
 * Builds the KIA Schemes API as an Express app WITHOUT starting a listener or
 * serving static files. Shared by:
 *  - server/src/index.ts  → local dev / self-hosting (adds static + listen)
 *  - api/index.ts         → Vercel serverless function (Vercel serves the
 *                           static build and routes /api/* here)
 *
 * Note: no dotenv here. Env is loaded by the entry point (dotenv.config() in
 * index.ts locally; injected by the platform on Vercel). All config reads are
 * lazy, so this is safe.
 */
export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Render/Railway/Vercel), set TRUST_PROXY=1 so rate
  // limiting sees the real client IP instead of the proxy's.
  if (process.env.TRUST_PROXY === "1") {
    app.set("trust proxy", 1);
  }

  // Restrict CORS to an explicit allowlist (comma-separated in CORS_ORIGIN).
  // Browsers only; non-browser clients ignore CORS, so API auth still matters.
  // On Vercel the frontend and API are same-origin, so this stays empty.
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

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "kia-schemes-api" });
  });

  // Global limiter: 120 requests/min per client IP across all API routes.
  // Applied under /api so static asset requests are not counted. See
  // rateLimit.ts for the serverless best-effort caveat.
  app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));

  app.use("/api/schemes", schemesRouter);

  // 404 for unknown API routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
