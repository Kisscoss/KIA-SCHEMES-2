import { describe, it, expect } from "vitest";
import {
  buildLocalScheme,
  isValidScheme,
  normalizePeriodValue,
  normalizeScheme,
} from "@/lib/localScheme";
import type { SchemeFormData } from "@/types/scheme";

const baseForm: SchemeFormData = {
  school: "Test School",
  subject: "Mathematics",
  term: "Term 1",
  class: "S1",
  year: "2026",
  numberOfWeeks: 4,
  singlePeriodsPerWeek: 2,
  doublePeriodsPerWeek: 1,
  topics: [
    { id: "1", name: "Algebra", numberOfPeriods: 4, competencies: ["Solve equations"] },
    { id: "2", name: "Geometry", numberOfPeriods: 2, competencies: ["Identify shapes"] },
  ],
};

describe("localScheme", () => {
  it("uses only 1 for single and 2 for double lessons", () => {
    const scheme = buildLocalScheme(baseForm);
    expect(scheme.rows.length).toBeGreaterThan(0);
    expect(scheme.rows.every((r) => r.period === "1" || r.period === "2")).toBe(true);
    expect(scheme.rows.some((r) => r.period === "2")).toBe(true);
    expect(isValidScheme(scheme)).toBe(true);
  });

  it("accounts a double lesson as 2 periods of the topic total", () => {
    const scheme = buildLocalScheme({
      ...baseForm,
      topics: [
        { id: "1", name: "Algebra", numberOfPeriods: 3, competencies: ["Solve equations"] },
      ],
    });
    const total = scheme.rows.reduce((sum, r) => sum + (r.period === "2" ? 2 : 1), 0);
    expect(total).toBe(3);
  });

  it("normalizes legacy period labels to 1 or 2", () => {
    expect(normalizePeriodValue("2-3")).toBe("2");
    expect(normalizePeriodValue("double")).toBe("2");
    expect(normalizePeriodValue("3")).toBe("1");
    const scheme = normalizeScheme({
      formData: baseForm,
      rows: [{ ...buildLocalScheme(baseForm).rows[0], period: "2-3" }],
    });
    expect(scheme.rows[0].period).toBe("2");
  });

  it("marks the last period of each topic as AoI", () => {
    const scheme = buildLocalScheme(baseForm);
    const topics = scheme.rows.map((r) => r.topic);
    expect(topics).toContain("Algebra - Activity of Integration (AoI)");
    expect(topics).toContain("Geometry - Activity of Integration (AoI)");
  });

  it("rejects malformed scheme payloads", () => {
    expect(isValidScheme(null)).toBe(false);
    expect(isValidScheme({ rows: [{ week: "one" }] })).toBe(false);
  });

  it("produces unique, non-static learning outcomes and fills all fields", () => {
    const scheme = buildLocalScheme({
      ...baseForm,
      topics: [
        {
          id: "1",
          name: "Algebra",
          numberOfPeriods: 6,
          competencies: ["Solve equations", "Factorise", "Plot graphs"],
        },
      ],
    });
    const outcomes = scheme.rows.map((r) => r.learningOutcomes);
    // Every row has a learning outcome.
    expect(outcomes.every((o) => typeof o === "string" && o.length > 20)).toBe(true);
    // Outcomes are unique across periods (not one repeated template).
    expect(new Set(outcomes).size).toBe(outcomes.length);
    // AI-style columns are all populated for every row.
    expect(
      scheme.rows.every(
        (r) =>
          r.resources.trim().length > 0 &&
          r.methodology.trim().length > 0 &&
          r.references.trim().length > 0
      )
    ).toBe(true);
    // Methodologies vary across periods (no single method repeated for all).
    expect(new Set(scheme.rows.map((r) => r.methodology)).size).toBeGreaterThan(1);
  });
});
