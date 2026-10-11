import { config } from "./config.js";

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

For each row, provide:
- week (number)
- period (string: lesson length ONLY — "1" for a single-period lesson, "2" for a double-period lesson. Never use sequential numbers like "1", "2", "3" or ranges like "2-3". Example with 2 singles + 1 double per week: periods are "1", "1", "2")
- topic (from the provided topics)
- competency (from the provided competencies for that topic)
- learningOutcomes (2-3 specific, measurable outcomes)
- resources (teaching and learning resources, e.g., textbooks, charts, models, calculators, rulers)
- methodology (from: DRLA, Target Questioning, Group Discussions, Think-Pair-Share, Modeling, Demonstration, Problem Solving, Practical Work — pick 2-3 appropriate ones)
- references (from relevant textbooks for ${subject}: NCDC Books, SMS Series, Vision books, Teacher's Guides, Active series, MK series, Longman, Oxford — pick 2-3)
- remarks (leave empty string)

Important:
- Distribute topics evenly across weeks
- Make learning outcomes specific and measurable
- Vary methodologies across periods
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

export async function generateRows(formData: SchemeFormInput): Promise<GeneratedRow[]> {
  if (!config.openrouterApiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.openrouterModel,
      messages: [
        {
          role: "system",
          content:
            "You are a curriculum planning expert. Always respond with valid JSON arrays only. No markdown formatting.",
        },
        { role: "user", content: buildPrompt(formData) },
      ],
    }),
  });

  if (!response.ok) {
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

  const aiData = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let rows: GeneratedRow[];
  try {
    rows = JSON.parse(content) as GeneratedRow[];
  } catch {
    console.error("Failed to parse AI response:", content);
    throw new Error("AI returned invalid data. Please try again.");
  }

  if (!Array.isArray(rows)) throw new Error("AI returned invalid data. Please try again.");
  return rows.map((r) => ({ ...r, period: normalizePeriod(r.period) }));
}
