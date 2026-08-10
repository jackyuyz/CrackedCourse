"use client";

import { PercentageGradeCalculator } from "@/components/percentage-grade-calculator";

export function CommunityGradeCalculator({
  publicationId,
  categories,
  policies,
}: {
  publicationId: string;
  categories: Array<{ name: string; weight_percent: number | string }>;
  policies: Array<{ description: string; calculator_support: string }>;
}) {
  return (
    <PercentageGradeCalculator
      title="Try the grade calculator"
      description="Use the published weights to privately estimate your own grade."
      persistence={{ kind: "session" }}
      initialCategories={categories.map((category, index) => ({
        id: `community-${publicationId}-${index}`,
        name: category.name,
        weightPercent: Number(category.weight_percent),
        scorePercent: null,
      }))}
      policyWarnings={policies.map((policy) => policy.description)}
    />
  );
}
