import { type GeneratedScheme, type SchemeFormData, type SchemeRow } from "@/types/scheme";

const METHODOLOGIES = [
  "DRLA, Group Discussions",
  "Target Questioning, Think-Pair-Share",
  "Modeling, Problem Solving",
  "Demonstration, Practical Work",
  "Group Discussions, Problem Solving",
];

const RESOURCE_SETS = [
  "Chalkboard, charts, textbooks",
  "Models, charts, work cards",
  "Calculators, rulers, graph books",
  "Textbooks, wall charts, past papers",
];

const REFERENCE_SETS = [
  "NCDC Book, Teacher's Guide",
  "SMS Series, MK Series",
  "Vision Series, Active Series",
  "Longman, Oxford",
];

export function isValidScheme(value: unknown): value is GeneratedScheme {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GeneratedScheme>;
  return (
    typeof v.formData === "object" &&
    v.formData !== null &&
    Array.isArray(v.rows) &&
    v.rows.every(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof (r as SchemeRow).week === "number" &&
        typeof (r as SchemeRow).topic === "string"
    )
  );
}

export function normalizePeriodValue(raw: unknown): "1" | "2" {
  if (raw === 2 || raw === "2" || raw === "2.0") return "2";
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "2" || v === "double" || v.includes("-") || v.includes("double")) return "2";
  }
  if (typeof raw === "number" && raw >= 2) return "2";
  return "1";
}

export function normalizeScheme<T extends { rows?: Array<{ period?: unknown }> }>(scheme: T): T {
  if (!scheme || !Array.isArray(scheme.rows)) return scheme;
  return {
    ...scheme,
    rows: scheme.rows.map((r) => ({ ...r, period: normalizePeriodValue(r.period) })),
  };
}

export function buildLocalScheme(formData: SchemeFormData): GeneratedScheme {
  const singlesPerWeek = Math.max(0, Math.floor(formData.singlePeriodsPerWeek || 0));
  const doublesPerWeek = Math.max(0, Math.floor(formData.doublePeriodsPerWeek || 0));
  // Weekly slot pattern: "1" = single-period lesson, "2" = double-period lesson.
  const weeklySlots: Array<"1" | "2"> = [
    ...Array<string>(singlesPerWeek).fill("1"),
    ...Array<string>(doublesPerWeek).fill("2"),
  ] as Array<"1" | "2">;
  const slots = weeklySlots.length > 0 ? weeklySlots : (["1"] as Array<"1" | "2">);
  const totalWeeks = Math.max(1, Math.floor(formData.numberOfWeeks || 1));

  const topics = formData.topics.filter((t) => t.name.trim());
  const usableTopics =
    topics.length > 0
      ? topics
      : [{ name: "General", numberOfPeriods: slots.length, competencies: ["General competency"] }];

  const rows: SchemeRow[] = [];
  let week = 1;
  let slotIdx = 0;

  const nextSlot = (remainingForTopic: number): "1" | "2" => {
    const slot = slots[slotIdx % slots.length];
    // A double slot counts as 2 periods, but if only 1 period remains for the
    // topic, use a single so the topic total stays exact.
    if (slot === "2" && remainingForTopic < 2) return "1";
    return slot;
  };

  const advance = () => {
    slotIdx += 1;
    // New week once a full weekly pattern has been consumed.
    if (slotIdx % slots.length === 0) {
      week += 1;
    }
  };

  usableTopics.forEach((topic, topicIdx) => {
    let remaining = Math.max(1, Math.floor(topic.numberOfPeriods || 1));
    const competencies = topic.competencies.filter((c) => c.trim());
    const list = competencies.length > 0 ? competencies : ["General competency"];
    let lessonInTopic = 0;
    while (remaining > 0) {
      const period = nextSlot(remaining);
      const cost = period === "2" ? 2 : 1;
      const isLast = remaining - cost <= 0;
      const competency = list[lessonInTopic % list.length];
      const topicLabel = isLast ? `${topic.name} - Activity of Integration (AoI)` : topic.name;
      const outcomes = isLast
        ? `Learners integrate ${competency} through guided assessment tasks`
        : `By the end of the lesson, learners should be able to: demonstrate ${competency}`;
      rows.push({
        week: Math.min(week, totalWeeks),
        period,
        topic: topicLabel,
        competency,
        learningOutcomes: outcomes,
        resources: RESOURCE_SETS[(topicIdx + lessonInTopic) % RESOURCE_SETS.length],
        methodology: METHODOLOGIES[(topicIdx + lessonInTopic) % METHODOLOGIES.length],
        references: REFERENCE_SETS[(topicIdx + lessonInTopic) % REFERENCE_SETS.length],
        remarks: "",
      });
      remaining -= cost;
      lessonInTopic += 1;
      advance();
      // Guard: if the timetable overflows the term, keep stacking on the last week.
      if (week > totalWeeks) week = totalWeeks;
    }
  });

  return { formData, rows };
}
