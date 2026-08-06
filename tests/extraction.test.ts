import { describe, expect, it } from "vitest";

import {
  confidenceLabel,
  evidenceMatches,
  normalizeEvidenceText,
  validateGradingWeightTotal,
} from "@/lib/extraction/validate";

describe("extraction validation", () => {
  it("normalizes PDF whitespace and punctuation for evidence matching", () => {
    expect(
      evidenceMatches({ pageNumber: 2, quote: "Final exam — December 12" }, [
        { pageNumber: 1, text: "Overview" },
        { pageNumber: 2, text: "Final   exam - December 12" },
      ]),
    ).toBe(true);
    expect(normalizeEvidenceText("  “Office\nHours”  ")).toBe('"office hours"');
  });

  it("downgrades unmatched evidence regardless of model confidence", () => {
    expect(confidenceLabel(0.99, false)).toBe("review");
    expect(confidenceLabel(0.9, true)).toBe("high");
    expect(confidenceLabel(0.6, true)).toBe("review");
    expect(confidenceLabel(0.2, true)).toBe("low");
  });

  it("uses the required grading-weight tolerance", () => {
    expect(validateGradingWeightTotal([30, 30, 39.5]).isValid).toBe(true);
    expect(validateGradingWeightTotal([30, 30, 40.5]).isValid).toBe(true);
    expect(validateGradingWeightTotal([30, 30, 39]).isValid).toBe(false);
    expect(validateGradingWeightTotal([50, null]).isComplete).toBe(false);
  });
});
