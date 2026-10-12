import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { config } from "./config.js";

// Load server/.env for local dev / self-hosting. No-op if the file is absent
// (e.g. on a platform that injects env vars directly).
dotenv.config();

const app = createApp();

// Serve the built frontend (dist/) with a SPA fallback so this single process
// can host both the API and the app — used by local `npm run preview`-style
// runs and self-hosting on Render/Railway. On Vercel the platform serves the
// static build instead, so this block is simply unused there.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(dirname, "../../dist");
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(config.port, () => {
  console.log(`KIA Schemes API listening on :${config.port}`);
});

