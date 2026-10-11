import { type GeneratedScheme, type SchemeFormData, type SchemeRow } from "@/types/scheme";

const METHODOLOGIES = [
  "DRLA, Group Discussions",
  "Target Questioning, Think-Pair-Share",
  "Modeling, Problem Solving",
  "Demonstration, Practical Work",
  "Group Discussions, Problem Solving",
  "Think-Pair-Share, Demonstration",
  "Problem Solving, Practical Work",
  "Modeling, Group Discussions",
  "DRLA, Practical Work",
  "Target Questioning, Problem Solving",
];

const RESOURCE_SETS = [
  "Chalkboard, charts, textbooks",
  "Models, charts, work cards",
  "Calculators, rulers, graph books",
  "Textbooks, wall charts, past papers",
  "ICT projector, laptops, textbooks",
  "Manipulatives, work cards, real objects",
  "Reference books, charts, calculators",
  "Audio-visual aids, textbooks, charts",
];

const REFERENCE_SETS = [
  "NCDC Book, Teacher's Guide",
  "SMS Series, MK Series",
  "Vision Series, Active Series",
  "Longman, Oxford",
  "NCDC Book, SMS Series",
  "Teacher's Guide, MK Series",
  "Oxford, Longhorn",
  "Vision Series, MK Series",
];

// Human-like outcome phrasings that rotate so no two consecutive periods read
// the same. Each entry is a (competency, topic) => sentence template.
const OUTCOME_TEMPLATES: Array<(competency: string, topic: string) => string> = [
  (c, t) =>
    `By the end of the lesson, learners should be able to: define the key terms related to ${c}; give local examples from ${t}; and answer two oral questions correctly.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: describe ${c} in their own words; identify real-life situations involving ${t}; and complete a short matching exercise.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: explain the meaning of ${c}; illustrate ${t} using a labelled diagram; and work through one guided example as a class.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: apply ${c} to solve two given problems on ${t}; check their answers with a partner; and correct any mistakes made.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: calculate and record results involving ${c}; interpret what the results show about ${t}; and present findings to the group.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: classify given items according to ${c}; justify their groupings using ideas from ${t}; and compare answers with another learner.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: analyse ${c} step by step; draw conclusions about ${t}; and write a two-sentence summary of what they discovered.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: demonstrate ${c} using the materials provided; describe each stage of ${t}; and note two things they found challenging.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: construct a simple model of ${t}; relate it to ${c}; and evaluate how well their model works.`,
  (c, t) =>
    `By the end of the lesson, learners should be able to: compare and contrast ${c} across different ${t} cases; record similarities and differences in a table; and discuss their findings.`,
];

const AOI_TEMPLATE = (competency: string, topic: string) =>
  `Learners integrate their understanding of ${topic} by completing an Activity of Integration (AoI): they apply ${competency} to a real-life task, present their solution, and self-assess against the success criteria for the topic.`;


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
      // Rotate through varied, human-like templates so each period is unique.
      const tplIdx = (topicIdx * 3 + lessonInTopic * 2) % OUTCOME_TEMPLATES.length;
      const outcomes = isLast
        ? AOI_TEMPLATE(competency, topic.name)
        : OUTCOME_TEMPLATES[tplIdx](competency, topic.name);
      rows.push({
        week: Math.min(week, totalWeeks),
        period,
        topic: topicLabel,
        competency,
        learningOutcomes: outcomes,
        resources: RESOURCE_SETS[(topicIdx + lessonInTopic) % RESOURCE_SETS.length],
        methodology: METHODOLOGIES[(topicIdx + lessonInTopic) % METHODOLOGIES.length],
        references: REFERENCE_SETS[(topicIdx + lessonInTopic + 1) % REFERENCE_SETS.length],
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
