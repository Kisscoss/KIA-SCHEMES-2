import { config } from "./config.js";

// Per-attempt timeout and attempt count come from config so the whole generate
// request stays inside AI_TOTAL_BUDGET_MS (and thus the 60s serverless cap).

export interface TopicInput {
  name?: string;
  numberOfPeriods?: number;
  competencies?: string[];
}

export interface SchemeFormInput {
  school?: string;
  subject?: string;
  term?: string;
  class?: string;
  year?: string;
  numberOfWeeks?: number;
  singlePeriodsPerWeek?: number;
  doublePeriodsPerWeek?: number;
  topics?: TopicInput[];
}

export interface GeneratedRow {
  week: number;
  period: string;
  topic: string;
  competency: string;
  learningOutcomes: string;
  resources: string;
  methodology: string;
  references: string;
  remarks: string;
}

// Subjects where numeric calculation / problem-solving is a natural part of
// lessons. Everything else (humanities, languages, arts, descriptive sciences)
// is treated as descriptive — calculation verbs would be inappropriate there.
const QUANTITATIVE_KEYWORDS = [
  "mathemat",
  "physic",
  "chemic",
  "econom",
  "comput",
  "account",
  "agricultur",
  "entrepren",
];

function isQuantitativeSubject(subject: string | undefined): boolean {
  const s = (subject ?? "").toLowerCase();
  return QUANTITATIVE_KEYWORDS.some((k) => s.includes(k));
}

function buildPrompt(formData: SchemeFormInput): string {
  const {
    subject,
    term,
    class: studentClass,
    numberOfWeeks,
    singlePeriodsPerWeek,
    doublePeriodsPerWeek,
    topics,
  } = formData;
  const quantitative = isQuantitativeSubject(subject);
  // Subject-sensitive guidance: for descriptive subjects we must forbid the AI
  // from demanding calculations/solving/formulas that don't belong there.
  const outcomeGuidance = quantitative
    ? `Use a DIFFERENT action verb each period — e.g. define, describe, explain, apply, calculate, solve, derive, plot, classify, analyse, demonstrate, evaluate, construct. Because this is a quantitative subject (${subject}), it is appropriate to ask learners to calculate, solve problems, use formulas, plot graphs, and work with numbers — but still tie every outcome to THAT period's competency and topic, and let outcomes progress across the topic.`
    : `Use a DIFFERENT action verb each period — e.g. define, describe, explain, interpret, narrate, discuss, compare, classify, analyse, demonstrate, evaluate, debate. IMPORTANT: ${subject} is a DESCRIPTIVE subject with no calculations — so you must NOT use verbs like calculate, solve, derive, plot, compute, measure numerically, or invent formulas/numbers that do not exist in this subject. Outcomes must be about understanding, expression, interpretation and discussion, grounded in ${subject} vocabulary, and tied to THAT period's competency and topic so they progress naturally.`;
  const toneExample = quantitative
    ? `"Calculate the area of the given figure using the correct formula; check each step with a partner; and record the answer with the right units."`
    : `"Interpret the poem's imagery; explain how each line reflects the speaker's feelings; and support the view with a chosen quotation."`;
  const methodList = quantitative
    ? "DRLA, Target Questioning, Group Discussions, Think-Pair-Share, Modeling, Demonstration, Problem Solving, Practical Work"
    : "DRLA, Target Questioning, Group Discussions, Think-Pair-Share, Modeling, Demonstration, Discussion, Debate, Role Play, Guided Reading, Practical Work";
  const resourceExamples = quantitative
    ? "textbooks, charts, models, calculators, rulers, graph papers, manipulatives, ICT/projector, past papers"
    : "textbooks, story books, wall charts, maps, atlases, photographs, timelines, newspapers, primary sources, ICT/projector, discussion cards";
  const totalPeriodsPerWeek =
    (singlePeriodsPerWeek ?? 0) + (doublePeriodsPerWeek ?? 0) * 2;
  const topicsList = (topics ?? [])
    .map(
      (t, i) =>
        `Topic ${i + 1}: "${t.name ?? "Untitled"}" (${t.numberOfPeriods ?? 1} periods) with competencies: ${(t.competencies ?? []).filter((c: string) => c.trim()).join("; ") || "general competency"}`
    )
    .join("\n");

  return `You are an expert curriculum planner for Uganda's secondary school system. Generate a complete Scheme of Work.

Subject: ${subject}
Class: ${studentClass}
Term: ${term}
Number of weeks: ${numberOfWeeks}
Periods per week: ${totalPeriodsPerWeek} (${singlePeriodsPerWeek} single + ${doublePeriodsPerWeek} double, where each double = 2 single periods)

Topics and competencies provided by the teacher:
${topicsList}

Generate a JSON array of rows for the scheme of work. Each row represents one period in a week. Distribute the topics across the ${numberOfWeeks} weeks with ${totalPeriodsPerWeek} periods per week. IMPORTANT: Each topic specifies how many periods it should cover — allocate exactly that many periods to each topic.

For each row, provide the fields below. Write every field FRESH for each period — never reuse the same wording from one row to the next. The output must read as if an experienced teacher hand-wrote a unique lesson plan for every period, deeply connected to ${subject} and the specific competency and topic of that period.

- week (number)
- period (string: lesson length ONLY — "1" for a single-period lesson, "2" for a double-period lesson. Never use sequential numbers like "1", "2", "3" or ranges like "2-3". Example with 2 singles + 1 double per week: periods are "1", "1", "2")
- topic (from the provided topics)
- competency (from the provided competencies for that topic)
- learningOutcomes (2-3 specific, measurable outcomes in natural teaching language. Do NOT begin with any lead-in phrase like "By the end of the lesson, learners should be able to" — start directly with the action verb. ${outcomeGuidance})
- resources (the specific teaching and learning resources a teacher would actually use for THAT lesson — e.g. ${resourceExamples}. Choose resources that fit the period's activity and VARY them across periods.)
- methodology (2-3 learner-centred methods chosen to fit that period, drawn ONLY from: ${methodList}. Vary the combination across periods so no two consecutive lessons use an identical set.)
- references (2-3 relevant ${subject} references for that period, e.g. NCDC Books, SMS Series, Vision books, Teacher's Guides, Active series, MK series, Longman, Oxford. Match the reference to the period's content.)
- remarks (leave empty string)

Tone example for learningOutcomes (match this human, specific style — no lead-in phrase):
${toneExample}

Quality bar — follow strictly:
- Every row must be unique and human-like. No templated, repeated, or copy-pasted sentences.
- learningOutcomes, resources, methodology and references must all be generated and tailored to each individual period — not repeated.
- Make learning outcomes specific and measurable, progressing across the topic, and always connected to ${subject}, its competency and its topic.
- Vary methodologies across periods.
- For EACH topic, the LAST period allocated to that topic (whether single or double) MUST be an "Activity of Integration (AoI)". For that row: set the "topic" field to "<Topic Name> - Activity of Integration (AoI)", set "learningOutcomes" to describe how learners will be assessed on the competencies covered throughout the topic, and use assessment-oriented methodologies (e.g., Problem Solving, Practical Work, Group Discussions, Project Work). This AoI period still counts toward the topic's allocated periods.
- Return ONLY a valid JSON array, no markdown, no explanation.`;
}

export function normalizePeriod(raw: unknown): "1" | "2" {
  if (raw === 2 || raw === "2" || raw === "2.0") return "2";
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "2" || v === "double" || v.includes("-") || v.includes("double")) return "2";
  }
  if (typeof raw === "number" && raw >= 2) return "2";
  return "1";
}

/** Remove any leading "By the end of the lesson, learners should be able to"
 *  phrasing from a learning-outcome string and capitalise the first action
 *  verb, so outcomes start directly (e.g. "Define ...", "Calculate ..."). */
export function stripOutcomeLeadIn(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text.trim();
  // Strip common lead-in prefixes (case-insensitive, tolerant of punctuation).
  out = out.replace(
    /^\s*(by the end of (the )?(lesson|period|topic)[,:]?\s*)?(learners?\s+(will\s+)?(be able to|should be able to)\s*:?\s*)?/i,
    ""
  );
  // Capitalise the first letter so the outcome reads as a clean sentence.
  if (out.length > 0) out = out[0].toUpperCase() + out.slice(1);
  return out.trim();
}

/** Pull the first JSON array out of an AI response that may be wrapped in
 *  prose, markdown fences, or moderation text. Returns null if none found. */
function extractJsonArray(content: string): unknown {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  // Fast path: the whole thing is valid JSON already.
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through to extraction */
  }
  // Find the outermost [...] block (arrays don't nest as objects here).
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

async function callOpenRouterOnce(
  messages: Array<{ role: "system" | "user"; content: string }>,
  timeoutMs: number
): Promise<string> {
  // Guard against a stalled response (some free models hang on the body).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.openrouterModel,
        temperature: 0.7,
        messages,
      }),
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("AI is taking too long. Please try again.");
    }
    throw e;
  }

  if (!response.ok) {
    clearTimeout(timeout);
    if (response.status === 429) {
      const err = new Error("Rate limited. Please try again shortly.") as Error & { status?: number };
      err.status = 429;
      throw err;
    }
    if (response.status === 402) {
      const err = new Error("AI credits exhausted. Please add credits.") as Error & { status?: number };
      err.status = 402;
      throw err;
    }
    const text = await response.text();
    console.error("AI error:", response.status, text);
    throw new Error("AI gateway error");
  }

  try {
    const aiData = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return aiData.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("AI is taking too long. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/** Whether an error is a transient stall/connection failure worth retrying. */
function isRetryableAiError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "AbortError") return true;
  const msg = e.message.toLowerCase();
  if (msg.includes("taking too long")) return true;
  // Network-level failures (DNS, socket reset, fetch failed) are transient.
  if (msg.includes("fetch failed") || msg.includes("network")) return true;
  return false;
}

/** Call OpenRouter, retrying transient stalls/timeouts. Retries stop as soon as
 *  the shared `deadline` is reached so the whole request cannot exceed the
 *  overall budget. Non-retryable errors (rate limit, credits, gateway) throw
 *  immediately. */
async function callOpenRouter(
  messages: Array<{ role: "system" | "user"; content: string }>,
  deadline: number
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= config.aiMaxAttempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) {
      // Out of time: don't start another attempt we cannot finish.
      throw lastError ?? new Error("AI is taking too long. Please try again.");
    }
    const timeoutMs = Math.min(config.aiTimeoutMs, remaining);
    try {
      return await callOpenRouterOnce(messages, timeoutMs);
    } catch (e) {
      lastError = e;
      const status = (e as { status?: number }).status;
      // Don't retry deterministic failures (401/402/429/4xx) — retrying won't help.
      if (typeof status === "number" && status >= 400 && status < 500) throw e;
      if (!isRetryableAiError(e)) throw e;
      if (attempt < config.aiMaxAttempts && deadline - Date.now() > 1000) {
        // Small backoff before the next attempt.
        await new Promise((r) => setTimeout(r, attempt * 1000));
        console.warn(
          `AI attempt ${attempt} stalled (${(e as Error).message}); retrying...`
        );
      }
    }
  }
  throw lastError ?? new Error("AI is taking too long. Please try again.");
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Validate & normalise the AI's parsed output into safe rows. Returns null when
 *  the payload is unusable (not an array, or a row is missing its topic /
 *  learning outcome) so the caller can retry with a stricter prompt instead of
 *  rendering blank cells. */
export function sanitizeRows(parsed: unknown): GeneratedRow[] | null {
  if (!Array.isArray(parsed)) return null;
  const rows: GeneratedRow[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const topic = asString(r.topic).trim();
    const learningOutcomes = stripOutcomeLeadIn(r.learningOutcomes);
    // A row without a topic or learning outcome is unusable — reject the whole
    // response so we can retry rather than render blank cells.
    if (!topic || !learningOutcomes) return null;
    const weekNum = Number(r.week);
    rows.push({
      week: Number.isFinite(weekNum) && weekNum >= 1 ? Math.floor(weekNum) : 1,
      period: normalizePeriod(r.period),
      topic,
      competency: asString(r.competency).trim(),
      learningOutcomes,
      resources: asString(r.resources).trim(),
      methodology: asString(r.methodology).trim(),
      references: asString(r.references).trim(),
      remarks: asString(r.remarks),
    });
  }
  return rows.length > 0 ? rows : null;
}

/** How many lesson rows a correct scheme should contain for this request. */
function expectedLessonCount(formData: SchemeFormInput): number {
  const weeks = Math.max(0, Math.floor(formData.numberOfWeeks ?? 0));
  const lessonsPerWeek = Math.max(
    0,
    Math.floor(formData.singlePeriodsPerWeek ?? 0) +
      Math.floor(formData.doublePeriodsPerWeek ?? 0)
  );
  return weeks * lessonsPerWeek;
}

export async function generateRows(formData: SchemeFormInput): Promise<GeneratedRow[]> {
  if (!config.openrouterApiKey) throw new Error("OPENROUTER_API_KEY not configured");

  // Single wall-clock budget shared by every attempt below, so the request
  // cannot exceed AI_TOTAL_BUDGET_MS (and the 60s serverless cap).
  const deadline = Date.now() + config.aiTotalBudgetMs;

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content:
        "You are a curriculum planning expert. Always respond with a single valid JSON array only. No markdown, no prose, no commentary.",
    },
    { role: "user", content: buildPrompt(formData) },
  ];

  let content = await callOpenRouter(messages, deadline);
  let rows = sanitizeRows(extractJsonArray(content));

  // Free-tier models occasionally return prose/moderation/incomplete JSON, so
  // retry once with a stricter reminder — but only if budget remains.
  if (!rows && deadline - Date.now() > 1000) {
    content = await callOpenRouter(
      [
        ...messages,
        {
          role: "user",
          content:
            "Your previous reply was not a valid JSON array of scheme rows, or rows were missing required fields. Respond now with ONLY the JSON array — no text before or after — and include topic and learningOutcomes for every row.",
        },
      ],
      deadline
    );
    rows = sanitizeRows(extractJsonArray(content));
  }

  if (!rows) {
    console.error("Failed to parse AI response:", content);
    throw new Error("AI returned invalid data. Please try again.");
  }

  const expected = expectedLessonCount(formData);
  if (expected > 0 && rows.length !== expected) {
    // Non-fatal: the model's distribution may legitimately differ. Log so the
    // mismatch is visible without failing the request.
    console.warn(
      `AI returned ${rows.length} rows but ${expected} lessons were expected ` +
        `(${formData.numberOfWeeks} weeks × ${formData.singlePeriodsPerWeek} single + ${formData.doublePeriodsPerWeek} double).`
    );
  }

  return rows;
}
