"use client";

import { PercentageGradeCalculator } from "@/components/percentage-grade-calculator";
import type { GradeWorkspaceData } from "@/lib/data/grades";

export function GradeCalculator({
  initialData,
  demo,
}: {
  initialData: GradeWorkspaceData;
  demo: boolean;
}) {
  return (
    <PercentageGradeCalculator
      initialCategories={initialData.categories}
      persistence={demo ? { kind: "none" } : { kind: "account" }}
      policyWarnings={initialData.policyWarnings}
    />
  );
}
