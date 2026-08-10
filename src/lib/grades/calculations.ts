export interface GradeCategory {
  name: string;
  weightPercent: number;
  scorePercent: number | null;
}

export interface CurrentGradeResult {
  gradePercent: number | null;
  coursePoints: number;
  representedWeightPercent: number;
  totalWeightPercent: number;
  categories: Array<{
    name: string;
    scorePercent: number;
    weightPercent: number;
    coursePoints: number;
  }>;
}

export function calculateCurrentGrade(
  categories: GradeCategory[],
): CurrentGradeResult {
  const entered = categories.flatMap((category) => {
    if (category.scorePercent == null || category.weightPercent <= 0) return [];
    return [
      {
        name: category.name,
        scorePercent: category.scorePercent,
        weightPercent: category.weightPercent,
        coursePoints: (category.scorePercent * category.weightPercent) / 100,
      },
    ];
  });

  const representedWeightPercent = entered.reduce(
    (sum, category) => sum + category.weightPercent,
    0,
  );
  const coursePoints = entered.reduce(
    (sum, category) => sum + category.coursePoints,
    0,
  );
  const totalWeightPercent = categories.reduce(
    (sum, category) => sum + Math.max(0, category.weightPercent),
    0,
  );
  const gradePercent =
    representedWeightPercent === 0
      ? null
      : (coursePoints / representedWeightPercent) * 100;

  return {
    gradePercent,
    coursePoints,
    representedWeightPercent,
    totalWeightPercent,
    categories: entered,
  };
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
  if (categories.length === 0) {
    return {
      status: "not_computable",
      requiredPercent: null,
      fixedContribution: 0,
      remainingWeight: 0,
      reason: "No grading weights were found in this syllabus.",
    };
  }

  const current = calculateCurrentGrade(categories);
  const remainingWeight = categories.reduce(
    (sum, category) =>
      category.scorePercent == null
        ? sum + Math.max(0, category.weightPercent)
        : sum,
    0,
  );

  if (remainingWeight === 0) {
    return {
      status: current.coursePoints >= targetPercent ? "secured" : "impossible",
      requiredPercent: null,
      fixedContribution: current.coursePoints,
      remainingWeight,
    };
  }

  const requiredPercent =
    ((targetPercent - current.coursePoints) / remainingWeight) * 100;

  if (requiredPercent <= 0) {
    return {
      status: "secured",
      requiredPercent,
      fixedContribution: current.coursePoints,
      remainingWeight,
    };
  }
  if (requiredPercent > 100) {
    return {
      status: "impossible",
      requiredPercent,
      fixedContribution: current.coursePoints,
      remainingWeight,
    };
  }

  return {
    status: "required",
    requiredPercent,
    fixedContribution: current.coursePoints,
    remainingWeight,
  };
}
