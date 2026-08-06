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
    isComplete: true,
    assessments: [
      { status: "graded", earnedPoints: 90, maxPoints: 100 },
      { status: "graded", earnedPoints: 40, maxPoints: 50 },
    ],
  },
  {
    name: "Midterm",
    weightPercent: 30,
    isComplete: true,
    assessments: [{ status: "graded", earnedPoints: 84, maxPoints: 100 }],
  },
  {
    name: "Final",
    weightPercent: 50,
    isComplete: false,
    assessments: [],
  },
];

describe("grade calculations", () => {
  it("renormalizes the current grade over represented weight", () => {
    const result = calculateCurrentGrade(categories);
    expect(result.representedWeightPercent).toBe(50);
    expect(result.gradePercent).toBeCloseTo(85.07, 2);
  });

  it("solves the average required on untouched remaining weight", () => {
    const result = calculateTargetGrade(categories, 90);
    expect(result.status).toBe("required");
    expect(result.requiredPercent).toBeCloseTo(94.93, 2);
  });

  it("reports impossible, secured, and non-computable targets", () => {
    expect(calculateTargetGrade(categories, 98).status).toBe("impossible");
    expect(calculateTargetGrade(categories, 40).status).toBe("secured");

    const partial: GradeCategory[] = [
      {
        name: "Labs",
        weightPercent: 100,
        isComplete: false,
        assessments: [
          { status: "graded", earnedPoints: 18, maxPoints: 20 },
          { status: "planned", earnedPoints: null, maxPoints: null },
        ],
      },
    ];
    expect(calculateTargetGrade(partial, 90).status).toBe("not_computable");
  });
});
