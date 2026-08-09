import type { Evidence, SyllabusExtractionV1 } from "./schema";

export type ConfidenceLabel = "high" | "review" | "low";

export function normalizeEvidenceText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[●•◦▪]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function evidenceMatches(
  evidence: Evidence,
  pages: Array<{ pageNumber: number; text: string }>,
) {
  const quote = normalizeEvidenceText(evidence.quote);
  if (!quote) return false;

  const candidates =
    evidence.pageNumber == null
      ? pages
      : pages.filter((page) => page.pageNumber === evidence.pageNumber);

  return candidates.some((page) =>
    normalizeEvidenceText(page.text).includes(quote),
  );
}

export function confidenceLabel(
  confidence: number | null | undefined,
  allEvidenceMatched = true,
): ConfidenceLabel {
  if (!allEvidenceMatched) return "review";
  if (confidence == null || confidence < 0.5) return "low";
  if (confidence < 0.8) return "review";
  return "high";
}

export function validateGradingWeightTotal(weights: Array<number | null>) {
  const knownWeights = weights.filter(
    (weight): weight is number => weight != null,
  );
  const total = knownWeights.reduce((sum, weight) => sum + weight, 0);

  return {
    total,
    isComplete: knownWeights.length === weights.length,
    isValid:
      knownWeights.length === weights.length && total >= 99.5 && total <= 100.5,
  };
}

export function validateExtractionEvidence(
  extraction: SyllabusExtractionV1,
  pages: Array<{ pageNumber: number; text: string }>,
) {
  const items = [
    ...Object.values(extraction.course),
    ...extraction.people,
    ...extraction.officeHours,
    ...extraction.events,
    ...extraction.gradingCategories,
    ...extraction.gradingPolicies,
  ].filter((item) => item.value != null);

  return items.map((item) => {
    const matched =
      item.evidence.length > 0 &&
      item.evidence.every((evidence) => evidenceMatches(evidence, pages));

    return {
      item,
      evidenceMatched: matched,
      confidenceLabel: confidenceLabel(item.confidence, matched),
    };
  });
}
