import { describe, expect, it } from "vitest";

import { parsePublishedLearningUnits } from "@/lib/learning-units";

describe("parsePublishedLearningUnits", () => {
  it("accepts the UTC-offset timestamps returned by Postgres snapshots", () => {
    expect(
      parsePublishedLearningUnits([
        {
          title: "Chapter 1",
          description: "An introduction.",
          displayOrder: 0,
          noteMarkdown: "Shared guidance.",
          noteUpdatedAt: "2026-08-11T21:05:33.128207+00:00",
        },
      ]),
    ).toHaveLength(1);
  });

  it("keeps a published learning unit when it has no public note", () => {
    expect(
      parsePublishedLearningUnits([
        {
          title: "Chapter 2",
          description: null,
          displayOrder: 1,
        },
      ]),
    ).toEqual([
      { title: "Chapter 2", description: null, displayOrder: 1 },
    ]);
  });
});
