import { describe, it } from "vitest";
import { buildLocalScheme } from "@/lib/localScheme";
import type { SchemeFormData } from "@/types/scheme";

const make = (
  numberOfWeeks: number,
  singlePeriodsPerWeek: number,
  doublePeriodsPerWeek: number,
  topicPeriods: number[]
): SchemeFormData => ({
  school: "S",
  subject: "Mathematics",
  term: "Term 1",
  class: "S1",
  year: "2026",
  numberOfWeeks,
  singlePeriodsPerWeek,
  doublePeriodsPerWeek,
  topics: topicPeriods.map((n, i) => ({
    id: String(i),
    name: `Topic${i + 1}`,
    numberOfPeriods: n,
    competencies: ["C"],
  })),
});

const report = (label: string, form: SchemeFormData) => {
  const { rows } = buildLocalScheme(form);
  const byWeek = new Map<number, { singles: number; doubles: number }>();
  for (const r of rows) {
    const e = byWeek.get(r.week) ?? { singles: 0, doubles: 0 };
    if (r.period === "2") e.doubles += 1;
    else e.singles += 1;
    byWeek.set(r.week, e);
  }
  const lines = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(
      ([w, e]) =>
        `  week ${w}: singles=${e.singles} doubles=${e.doubles} lessons=${e.singles + e.doubles} periods=${e.singles + 2 * e.doubles}`
    );
  console.log(
    `\n=== ${label} (input: weeks=${form.numberOfWeeks} singles/wk=${form.singlePeriodsPerWeek} doubles/wk=${form.doublePeriodsPerWeek} totalTopicPeriods=${form.topics.reduce((s, t) => s + t.numberOfPeriods, 0)}) ===\n${lines.join("\n")}\n  TOTAL rows=${rows.length}`
  );
};

describe("distribution probe", () => {
  it("prints distributions", () => {
    // Defaults from SchemeForm: 12 weeks, 3 singles, 1 double.
    report("defaults 12w 3+1, topics 5,5,5,5,5,5,5,5,5,5,5,5 (60)", make(12, 3, 1, Array(12).fill(5)));
    // Aligned: 4 weeks x (2 singles + 1 double = 4 periods) = 16 periods.
    report("aligned 4w 2+1, topics 4,4,4,4 (16)", make(4, 2, 1, [4, 4, 4, 4]));
    // Topic ends on the double slot with 1 period left -> substitution.
    report("misaligned 4w 3+1, topics 4,4,4 (12)", make(4, 3, 1, [4, 4, 4]));
    // Overflow: 2 weeks capacity (2*(1+2)=6) but 10 periods.
    report("overflow 2w 1+1, topics 5,5 (10)", make(2, 1, 1, [5, 5]));
    // Underflow: 4 weeks capacity (4*4=16) but 6 periods.
    report("underflow 4w 2+1, topics 4,2 (6)", make(4, 2, 1, [4, 2]));
    // Odd totals across many weeks.
    report("many weeks 6w 2+1, topics 3,3,3,3,3,3 (18)", make(6, 2, 1, [3, 3, 3, 3, 3, 3]));
    // single topic spanning weeks.
    report("single topic 5w 2+1, topic 20", make(5, 2, 1, [20]));
  });
});
