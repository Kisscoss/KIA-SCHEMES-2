import { type GeneratedScheme, type SchemeFormData, type SchemeRow } from "@/types/scheme";

/** Subjects where numeric calculation / problem-solving is a natural part of
 *  lessons. Everything else is treated as descriptive (humanities, languages,
 *  arts and the descriptive sciences), where calculation verbs would be wrong. */
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

export function isQuantitativeSubject(subject: string): boolean {
  const s = (subject || "").toLowerCase();
  return QUANTITATIVE_KEYWORDS.some((k) => s.includes(k));
}

const METHODOLOGIES_QUANT = [
  "DRLA, Group Discussions, Problem Solving",
  "Target Questioning, Think-Pair-Share, Worked Examples",
  "Modeling, Guided Practice, Problem Solving",
  "Demonstration, Practical Work, Problem Solving",
  "Group Discussions, Problem Solving, Peer Marking",
  "Think-Pair-Share, Demonstration, Worked Examples",
  "Problem Solving, Practical Work, Group Work",
  "Modeling, Group Discussions, Guided Practice",
  "DRLA, Practical Work, Peer Marking",
  "Target Questioning, Problem Solving, Demonstration",
];

const METHODOLOGIES_DESCRIPTIVE = [
  "DRLA, Group Discussions, Role Play",
  "Target Questioning, Think-Pair-Share, Storytelling",
  "Discussion, Debate, Guided Reading",
  "Demonstration, Practical Work, Field Observation",
  "Group Discussions, Role Play, Peer Feedback",
  "Think-Pair-Share, Demonstration, Storytelling",
  "Debate, Group Discussions, Case Studies",
  "Discussion, Guided Reading, Role Play",
  "DRLA, Field Observation, Peer Feedback",
  "Target Questioning, Debate, Case Studies",
];

const RESOURCE_SETS_QUANT = [
  "Chalkboard, charts, textbooks, worked examples",
  "Calculators, rulers, graph books, past papers",
  "Geometrical instruments, graph papers, textbooks",
  "ICT projector, laptops, textbooks",
  "Manipulatives, work cards, real objects",
  "Reference books, charts, calculators",
  "Microscope, specimens, charts, textbooks",
  "Audio-visual aids, textbooks, worked examples",
];

const RESOURCE_SETS_DESCRIPTIVE = [
  "Textbooks, wall charts, story books",
  "Maps, atlases, photographs, charts",
  "Newspapers, reference books, timelines",
  "ICT projector, laptops, textbooks",
  "Manipulatives, work cards, real objects",
  "Chalkboard, charts, story books",
  "Audio-visual aids, textbooks, primary sources",
  "Reference books, charts, discussion cards",
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
// the same. Two banks are kept: one for quantitative subjects (calculation /
// problem-solving is natural) and one for descriptive subjects (humanities,
// languages, arts) where numeric verbs would be inappropriate.
const OUTCOME_TEMPLATES_QUANT: Array<(competency: string, topic: string) => string> = [
  (c, t) =>
    `Define the key terms related to ${c}; give local examples from ${t}; and answer two oral questions correctly.`,
  (c, t) =>
    `Explain ${c} in their own words; identify real-life situations involving ${t}; and complete a short matching exercise.`,
  (c, t) =>
    `Apply ${c} to solve two given problems on ${t}; check their answers with a partner; and correct any mistakes made.`,
  (c, t) =>
    `Calculate and record results involving ${c}; interpret what the results show about ${t}; and present findings to the group.`,
  (c, t) =>
    `Use the formula for ${c} to work through a step-by-step example; show each stage of ${t}; and verify the answer with a neighbour.`,
  (c, t) =>
    `Classify given items according to ${c}; justify their groupings using ideas from ${t}; and compare answers with another learner.`,
  (c, t) =>
    `Construct a labelled diagram of ${t}; explain how it shows ${c}; and note two things they found challenging.`,
  (c, t) =>
    `Demonstrate ${c} using the materials provided; describe each stage of ${t}; and record the results in a table.`,
  (c, t) =>
    `Measure and record data about ${t}; use ${c} to analyse the figures; and write a two-sentence summary of what the data shows.`,
  (c, t) =>
    `Compare two methods for ${c} across different ${t} cases; record which works best and why; and discuss their findings with the class.`,
];

const OUTCOME_TEMPLATES_DESCRIPTIVE: Array<(competency: string, topic: string) => string> = [
  (c, t) =>
    `Define the key terms related to ${c}; give local examples from ${t}; and use each term in a sentence of their own.`,
  (c, t) =>
    `Describe ${c} in their own words; identify real-life situations involving ${t}; and complete a short matching exercise.`,
  (c, t) =>
    `Explain the meaning of ${c}; illustrate ${t} using a labelled diagram or poster; and present their ideas to a partner.`,
  (c, t) =>
    `Narrate a real-life story that shows ${c} in action; connect it to ${t}; and share the lesson they learn from it.`,
  (c, t) =>
    `Interpret a given passage, map or image about ${t}; explain how it relates to ${c}; and answer two comprehension questions.`,
  (c, t) =>
    `Classify given examples according to ${c}; justify their groupings using ideas from ${t}; and compare answers with another learner.`,
  (c, t) =>
    `Debate a statement about ${t} with a partner; support their view using ${c}; and summarise both sides of the argument.`,
  (c, t) =>
    `Demonstrate ${c} through a short role play about ${t}; describe each stage; and note two things they found challenging.`,
  (c, t) =>
    `Analyse ${c} step by step; draw conclusions about ${t}; and write a two-sentence summary of what they discovered.`,
  (c, t) =>
    `Compare and contrast ${c} across different ${t} cases; record similarities and differences in a table; and discuss their findings.`,
];

function outcomeTemplatesFor(subject: string) {
  return isQuantitativeSubject(subject)
    ? OUTCOME_TEMPLATES_QUANT
    : OUTCOME_TEMPLATES_DESCRIPTIVE;
}

const AOI_TEMPLATE_QUANT = (competency: string, topic: string) =>
  `Learners integrate their understanding of ${topic} by completing an Activity of Integration (AoI): they apply ${competency} to solve a real-life problem step by step, present their solution, and self-assess against the success criteria for the topic.`;

const AOI_TEMPLATE_DESCRIPTIVE = (competency: string, topic: string) =>
  `Learners integrate their understanding of ${topic} by completing an Activity of Integration (AoI): they apply ${competency} to a real-life task, present their ideas, and self-assess against the success criteria for the topic.`;


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

/** Remove any leading "By the end of the lesson, learners should be able to"
 *  phrasing from a learning-outcome string and capitalise the first action
 *  verb, so outcomes start directly (e.g. "Define ...", "Calculate ...").
 *  Applied when normalising cached/saved schemes so legacy data displays
 *  cleanly. */
export function stripOutcomeLeadIn(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text.trim();
  out = out.replace(
    /^\s*(by the end of (the )?(lesson|period|topic)[,:]?\s*)?(learners?\s+(will\s+)?(be able to|should be able to)\s*:?\s*)?/i,
    ""
  );
  if (out.length > 0) out = out[0].toUpperCase() + out.slice(1);
  return out.trim();
}

export function normalizeScheme<T extends { rows?: Array<{ period?: unknown; learningOutcomes?: unknown }> }>(scheme: T): T {
  if (!scheme || !Array.isArray(scheme.rows)) return scheme;
  return {
    ...scheme,
    rows: scheme.rows.map((r) => ({
      ...r,
      period: normalizePeriodValue(r.period),
      learningOutcomes: stripOutcomeLeadIn(r.learningOutcomes),
    })),
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

  // Choose subject-appropriate outcome / methodology / resource banks so, for
  // example, a History lesson never gets "calculate the area" or a Maths lesson
  // never loses its problem-solving verbs.
  const quantitative = isQuantitativeSubject(formData.subject);
  const outcomeTemplates = outcomeTemplatesFor(formData.subject);
  const methodologies = quantitative ? METHODOLOGIES_QUANT : METHODOLOGIES_DESCRIPTIVE;
  const resourceSets = quantitative ? RESOURCE_SETS_QUANT : RESOURCE_SETS_DESCRIPTIVE;
  const aoiTemplate = quantitative ? AOI_TEMPLATE_QUANT : AOI_TEMPLATE_DESCRIPTIVE;

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
      const tplIdx = (topicIdx * 3 + lessonInTopic * 2) % outcomeTemplates.length;
      const outcomes = isLast
        ? aoiTemplate(competency, topic.name)
        : outcomeTemplates[tplIdx](competency, topic.name);
      rows.push({
        week: Math.min(week, totalWeeks),
        period,
        topic: topicLabel,
        competency,
        learningOutcomes: outcomes,
        resources: resourceSets[(topicIdx + lessonInTopic) % resourceSets.length],
        methodology: methodologies[(topicIdx + lessonInTopic) % methodologies.length],
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
