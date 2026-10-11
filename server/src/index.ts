import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import schemesRouter from "./routes/schemes.js";

dotenv.config();

const dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
