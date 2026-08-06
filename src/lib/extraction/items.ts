import type { SyllabusExtractionV1 } from "@/lib/extraction/schema";
import { confidenceLabel, evidenceMatches } from "@/lib/extraction/validate";

type Page = { pageNumber: number; text: string };

export function extractionItems(
  extraction: SyllabusExtractionV1,
  pages: Page[],
) {
  const candidates = [
    ...Object.entries(extraction.course).flatMap(([field, item]) =>
      item.value == null
        ? []
        : [
            {
              itemType: "course_field" as const,
              item,
              payload: { field, value: item.value },
            },
          ],
    ),
    ...extraction.people.map((item) => ({
      itemType: "person" as const,
      item,
      payload: item.value,
    })),
    ...extraction.officeHours.map((item) => ({
      itemType: "office_hour" as const,
      item,
      payload: item.value,
    })),
    ...extraction.events.map((item) => ({
      itemType: "event" as const,
      item,
      payload: item.value,
    })),
    ...extraction.gradingCategories.map((item) => ({
      itemType: "grading_category" as const,
      item,
      payload: item.value,
    })),
    ...extraction.gradingPolicies.map((item) => ({
      itemType: "grading_policy" as const,
      item,
      payload: item.value,
    })),
  ];

  return candidates.map((candidate) => {
    const matched =
      candidate.item.evidence.length > 0 &&
      candidate.item.evidence.every((evidence) =>
        evidenceMatches(evidence, pages),
      );
    return {
      itemType: candidate.itemType,
      originalPayload: candidate.payload,
      currentPayload: candidate.payload,
      confidence: candidate.item.confidence,
      confidenceLabel: confidenceLabel(candidate.item.confidence, matched),
      evidence: candidate.item.evidence,
      evidenceMatched: matched,
    };
  });
}
