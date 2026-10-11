import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TopicInput {
  name?: string;
  numberOfPeriods?: number;
  competencies?: string[];
}

interface SchemeFormInput {
  subject?: string;
  term?: string;
  class?: string;
  numberOfWeeks?: number;
  singlePeriodsPerWeek?: number;
  doublePeriodsPerWeek?: number;
  topics?: TopicInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { formData } = (await req.json()) as { formData: SchemeFormInput };
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const {
      subject,
      term,
      class: studentClass,
      numberOfWeeks,
      singlePeriodsPerWeek,
      doublePeriodsPerWeek,
      topics,
    } = formData;

    const totalPeriodsPerWeek = singlePeriodsPerWeek + doublePeriodsPerWeek * 2;
    const topicsList = (topics ?? [])
      .map(
        (t, i) =>
          `Topic ${i + 1}: "${t.name ?? "Untitled"}" (${t.numberOfPeriods ?? 1} periods) with competencies: ${(t.competencies ?? []).filter((c: string) => c.trim()).join("; ") || "general competency"}`
      )
      .join("\n");

    const prompt = `You are an expert curriculum planner for Uganda's secondary school system. Generate a complete Scheme of Work.

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

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a curriculum planning expert. Always respond with valid JSON arrays only. No markdown formatting.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown fences if any
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let rows;
    try {
      rows = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid data. Please try again.");
    }

    if (Array.isArray(rows)) {
      rows = rows.map((r: { period?: unknown }) => ({
        ...(r as Record<string, unknown>),
        period:
          r?.period === 2 || r?.period === "2" || r?.period === "double"
            ? "2"
            : "1",
      }));
    }

    return new Response(
      JSON.stringify({ formData, rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-scheme error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
