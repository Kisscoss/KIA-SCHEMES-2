import { Router } from "express";
import { getSql } from "../db.js";
import { generateRows, type SchemeFormInput } from "../ai.js";
import { requireAuth, type AuthedRequest } from "../authMiddleware.js";
import { rateLimit } from "../rateLimit.js";

const router = Router();
router.use(requireAuth);

// Protect the OpenRouter quota: at most 10 AI generations per hour per user.
// Runs after requireAuth so req.auth.userId is available; falls back to IP.
const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    (req as AuthedRequest).auth?.userId || req.ip || "anonymous",
  message:
    "Rate limited. AI generation quota reached — please try again later.",
});

function isValidFormData(fd: unknown): fd is SchemeFormInput {
  if (!fd || typeof fd !== "object") return false;
  const f = fd as SchemeFormInput;
  return Boolean(f.subject && f.term && f.class) && Array.isArray(f.topics);
}

/** POST /api/schemes/generate — AI-generate rows (not yet saved). */
router.post("/generate", aiGenerateLimiter, async (req, res) => {
  try {
    const { formData } = req.body as { formData: SchemeFormInput };
    if (!isValidFormData(formData)) {
      return res.status(400).json({ error: "Invalid form data" });
    }
    const rows = await generateRows(formData);
    return res.json({ formData, rows });
  } catch (e) {
    console.error("generate error:", e);
    const status = (e as { status?: number }).status ?? 500;
    return res.status(status).json({
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
});

/** POST /api/schemes — save a generated scheme to Neon. */
router.post("/", async (req, res) => {
  try {
    const { formData, rows } = req.body as {
      formData: SchemeFormInput;
      rows: unknown[];
    };
    if (!isValidFormData(formData) || !Array.isArray(rows)) {
      return res.status(400).json({ error: "Invalid scheme payload" });
    }
    const sql = getSql();
    const auth = (req as AuthedRequest).auth;
    const result = await sql`
      INSERT INTO public.schemes
        (school, subject, term, class, year, number_of_weeks,
         single_periods_per_week, double_periods_per_week, form_data, rows,
         user_id, user_email)
      VALUES
        (${formData.school ?? ""}, ${formData.subject ?? ""}, ${formData.term ?? ""},
         ${formData.class ?? ""}, ${formData.year ?? ""},
         ${formData.numberOfWeeks ?? 12},
         ${formData.singlePeriodsPerWeek ?? 0},
         ${formData.doublePeriodsPerWeek ?? 0},
         ${JSON.stringify(formData)}, ${JSON.stringify(rows)},
         ${auth?.userId ?? null}, ${auth?.email ?? null})
      RETURNING id, created_at
    `;
    return res.status(201).json({
      id: (result as Array<{ id: string; created_at: string }>)[0]?.id,
      formData,
      rows,
    });
  } catch (e) {
    console.error("save scheme error:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to save scheme",
    });
  }
});

/** GET /api/schemes — list recent schemes. */
router.get("/", async (_req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, school, subject, term, class, year, number_of_weeks,
             single_periods_per_week, double_periods_per_week,
             form_data, rows, created_at, updated_at
      FROM public.schemes
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return res.json({ schemes: rows });
  } catch (e) {
    console.error("list schemes error:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to list schemes",
    });
  }
});

/** GET /api/schemes/:id — fetch one scheme. */
router.get("/:id", async (req, res) => {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, school, subject, term, class, year, number_of_weeks,
             single_periods_per_week, double_periods_per_week,
             form_data, rows, created_at, updated_at
      FROM public.schemes
      WHERE id = ${req.params.id}
      LIMIT 1
    `;
    const list = rows as Array<Record<string, unknown>>;
    if (list.length === 0) return res.status(404).json({ error: "Not found" });
    const s = list[0];
    return res.json({
      id: s.id,
      formData: s.form_data,
      rows: s.rows,
      meta: s,
    });
  } catch (e) {
    console.error("get scheme error:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to fetch scheme",
    });
  }
});

export default router;
