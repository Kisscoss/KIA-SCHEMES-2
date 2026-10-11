import { config } from "./config.js";

// Max time to wait for a single AI response (headers + body). Free-tier models
// can stall on the body stream, so we fail fast rather than hanging the request.
const AI_TIMEOUT_MS = 45_000;

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

For each row, provide the fields below. Write every field FRESH for each period — never reuse the same wording from one row to the next. The output must read as if an experienced teacher hand-wrote a unique lesson plan for every period.

- week (number)
- period (string: lesson length ONLY — "1" for a single-period lesson, "2" for a double-period lesson. Never use sequential numbers like "1", "2", "3" or ranges like "2-3". Example with 2 singles + 1 double per week: periods are "1", "1", "2")
- topic (from the provided topics)
- competency (from the provided competencies for that topic)
- learningOutcomes (2-3 specific, measurable outcomes in natural teaching language. Begin with "By the end of the lesson, learners should be able to ..." and use a DIFFERENT action verb each period — e.g. define, describe, explain, apply, calculate, classify, analyse, demonstrate, evaluate, construct. Tie each outcome to THAT period's competency and topic, not a generic sentence. Outcomes should progress naturally across the topic.)
- resources (the specific teaching and learning resources a teacher would actually use for THAT lesson — e.g. textbooks, charts, models, calculators, rulers, manipulatives, ICT/projector, past papers. Choose resources that fit the period's activity and VARY them across periods.)
- methodology (2-3 learner-centred methods chosen to fit that period, drawn ONLY from: DRLA, Target Questioning, Group Discussions, Think-Pair-Share, Modeling, Demonstration, Problem Solving, Practical Work. Vary the combination across periods so no two consecutive lessons use an identical set.)
- references (2-3 relevant ${subject} references for that period, e.g. NCDC Books, SMS Series, Vision books, Teacher's Guides, Active series, MK series, Longman, Oxford. Match the reference to the period's content.)
- remarks (leave empty string)

Tone example for learningOutcomes (match this human, specific style):
"By the end of the lesson, learners should be able to: define the key terms; classify given examples into the correct categories; and solve two practice items correctly."

Quality bar — follow strictly:
- Every row must be unique and human-like. No templated, repeated, or copy-pasted sentences.
- learningOutcomes, resources, methodology and references must all be generated and tailored to each individual period — not repeated.
- Make learning outcomes specific and measurable, progressing across the topic.
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

async function callOpenRouter(
  messages: Array<{ role: "system" | "user"; content: string }>
): Promise<string> {
  // Guard against a stalled response (some free models hang on the body).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
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

export async function generateRows(formData: SchemeFormInput): Promise<GeneratedRow[]> {
  if (!config.openrouterApiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content:
        "You are a curriculum planning expert. Always respond with a single valid JSON array only. No markdown, no prose, no commentary.",
    },
    { role: "user", content: buildPrompt(formData) },
  ];

  // Free-tier models occasionally return prose/moderation instead of JSON, so
  // retry once with a stricter reminder before giving up.
  let content = await callOpenRouter(messages);
  let parsed = extractJsonArray(content);

  if (!Array.isArray(parsed)) {
    content = await callOpenRouter([
      ...messages,
      {
        role: "user",
        content:
          "Your previous reply was not a valid JSON array. Respond now with ONLY the JSON array of scheme rows — no text before or after.",
      },
    ]);
    parsed = extractJsonArray(content);
  }

  if (!Array.isArray(parsed)) {
    console.error("Failed to parse AI response:", content);
    throw new Error("AI returned invalid data. Please try again.");
  }

  return (parsed as GeneratedRow[]).map((r) => ({ ...r, period: normalizePeriod(r.period) }));
}
