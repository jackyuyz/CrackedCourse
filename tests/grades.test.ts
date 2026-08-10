import { describe, expect, it } from "vitest";

import {
  calculateCurrentGrade,
  calculateTargetGrade,
  type GradeCategory,
} from "@/lib/grades/calculations";

const categories: GradeCategory[] = [
  {
    name: "Homework",
    weightPercent: 20,
    scorePercent: (130 / 150) * 100,
  },
  {
    name: "Midterm",
    weightPercent: 30,
    scorePercent: 84,
  },
  {
    name: "Final",
    weightPercent: 50,
    scorePercent: null,
  },
];

describe("grade calculations", () => {
  it("renormalizes the current grade over represented weight", () => {
    const result = calculateCurrentGrade(categories);
    expect(result.representedWeightPercent).toBe(50);
    expect(result.gradePercent).toBeCloseTo(85.07, 2);
    expect(result.coursePoints).toBeCloseTo(42.53, 2);
  });

  it("solves the average required on untouched remaining weight", () => {
    const result = calculateTargetGrade(categories, 90);
    expect(result.status).toBe("required");
    expect(result.requiredPercent).toBeCloseTo(94.93, 2);
  });

  it("reports impossible, secured, and non-computable targets", () => {
    expect(calculateTargetGrade(categories, 98).status).toBe("impossible");
    expect(calculateTargetGrade(categories, 40).status).toBe("secured");

    expect(calculateTargetGrade([], 90).status).toBe("not_computable");
  });
});
