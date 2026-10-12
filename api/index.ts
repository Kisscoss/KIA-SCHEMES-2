// Vercel serverless entry point for the API.
//
// vercel.json rewrites every /api/* request to this function and Vercel
// preserves the full original request URL (req.url), so the Express routes in
// server/src/app.ts — which are declared with the /api prefix — match directly.
// Vercel serves the static frontend (dist/) itself, so we only handle the API.
//
// We build the Express app once at module scope so its setup (DB pool, JWKS
// cache) is reused across warm invocations (best-effort on serverless).
import { createApp } from "../server/dist/app.js";

const app = createApp();

// Cap the function's wall-clock so it fails fast with our own 500 handler rather
// than being hard-killed by the platform. Vercel Hobby/Pro allow up to 60s here;
// individual AI calls are additionally bounded by AI_TIMEOUT_MS.
export const config = { maxDuration: 60 };

export default app;
