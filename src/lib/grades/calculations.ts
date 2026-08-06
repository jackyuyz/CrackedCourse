export interface GradeAssessment {
  earnedPoints: number | null;
  maxPoints: number | null;
  expectedPercent?: number | null;
  status: "planned" | "graded" | "excused";
}

export interface GradeCategory {
  name: string;
  weightPercent: number;
  isComplete: boolean;
  assessments: GradeAssessment[];
}

export interface CurrentGradeResult {
  gradePercent: number | null;
  representedWeightPercent: number;
  categories: Array<{
    name: string;
    scorePercent: number;
    weightPercent: number;
  }>;
}

function gradedAssessments(category: GradeCategory) {
  return category.assessments.filter(
    (assessment) =>
      assessment.status === "graded" &&
      assessment.earnedPoints != null &&
      assessment.maxPoints != null &&
      assessment.maxPoints > 0,
  );
}

export function calculateCurrentGrade(
  categories: GradeCategory[],
): CurrentGradeResult {
  const represented = categories.flatMap((category) => {
    const graded = gradedAssessments(category);
    if (graded.length === 0) return [];

    const earned = graded.reduce(
      (sum, assessment) => sum + (assessment.earnedPoints ?? 0),
      0,
    );
    const possible = graded.reduce(
      (sum, assessment) => sum + (assessment.maxPoints ?? 0),
      0,
    );

    return [
      {
        name: category.name,
        scorePercent: (earned / possible) * 100,
        weightPercent: category.weightPercent,
      },
    ];
  });

  const representedWeightPercent = represented.reduce(
    (sum, category) => sum + category.weightPercent,
    0,
  );

  const gradePercent =
    representedWeightPercent === 0
      ? null
      : represented.reduce(
          (sum, category) =>
            sum + category.scorePercent * category.weightPercent,
          0,
        ) / representedWeightPercent;

  return { gradePercent, representedWeightPercent, categories: represented };
}

export type TargetGradeResult =
  | {
      status: "required";
      requiredPercent: number;
      fixedContribution: number;
      remainingWeight: number;
    }
  | {
      status: "secured" | "impossible";
      requiredPercent: number | null;
      fixedContribution: number;
      remainingWeight: number;
    }
  | {
      status: "not_computable";
      requiredPercent: null;
      fixedContribution: number;
      remainingWeight: number;
      reason: string;
    };

export function calculateTargetGrade(
  categories: GradeCategory[],
  targetPercent: number,
): TargetGradeResult {
  let fixedContribution = 0;
  let remainingWeight = 0;

  for (const category of categories) {
    const active = category.assessments.filter(
      (assessment) => assessment.status !== "excused",
    );

    if (active.length === 0) {
      if (!category.isComplete) remainingWeight += category.weightPercent;
      continue;
    }

    const graded = gradedAssessments(category);
    const planned = active.filter(
      (assessment) => assessment.status === "planned",
    );

    if (category.isComplete) {
      const earned = graded.reduce(
        (sum, assessment) => sum + (assessment.earnedPoints ?? 0),
        0,
      );
      const possible = graded.reduce(
        (sum, assessment) => sum + (assessment.maxPoints ?? 0),
        0,
      );

      if (possible > 0) {
        fixedContribution += category.weightPercent * (earned / possible);
      }
      continue;
    }

    if (planned.some((assessment) => assessment.maxPoints == null)) {
      return {
        status: "not_computable",
        requiredPercent: null,
        fixedContribution,
        remainingWeight,
        reason: `Add maximum points for the remaining ${category.name} work.`,
      };
    }

    const totalPlannedPoints = active.reduce(
      (sum, assessment) => sum + (assessment.maxPoints ?? 0),
      0,
    );

    if (totalPlannedPoints <= 0) {
      remainingWeight += category.weightPercent;
      continue;
    }

    const earnedPoints = graded.reduce(
      (sum, assessment) => sum + (assessment.earnedPoints ?? 0),
      0,
    );
    const remainingPoints = planned.reduce(
      (sum, assessment) => sum + (assessment.maxPoints ?? 0),
      0,
    );

    fixedContribution +=
      category.weightPercent * (earnedPoints / totalPlannedPoints);
    remainingWeight +=
      category.weightPercent * (remainingPoints / totalPlannedPoints);
  }

  if (remainingWeight === 0) {
    return {
      status: fixedContribution >= targetPercent ? "secured" : "impossible",
      requiredPercent: null,
      fixedContribution,
      remainingWeight,
    };
  }

  const requiredPercent =
    ((targetPercent - fixedContribution) / remainingWeight) * 100;

  if (requiredPercent <= 0) {
    return {
      status: "secured",
      requiredPercent,
      fixedContribution,
      remainingWeight,
    };
  }

  if (requiredPercent > 100) {
    return {
      status: "impossible",
      requiredPercent,
      fixedContribution,
      remainingWeight,
    };
  }

  return {
    status: "required",
    requiredPercent,
    fixedContribution,
    remainingWeight,
  };
}
