import { describe, expect, it } from "vitest";

import { HeuristicSyllabusExtractor } from "@/lib/extraction/providers/fixture";
import {
  confidenceLabel,
  evidenceMatches,
  normalizeEvidenceText,
  validateExtractionEvidence,
  validateGradingWeightTotal,
} from "@/lib/extraction/validate";
import { reconstructPdfPageText } from "@/lib/pdf/text";

describe("PDF text reconstruction", () => {
  it("restores visual reading order and keeps wide table columns separate", () => {
    expect(
      reconstructPdfPageText([
        {
          str: "Footer",
          transform: [1, 0, 0, 1, 40, 30],
          width: 35,
          height: 10,
        },
        {
          str: "Ada Lovelace",
          transform: [1, 0, 0, 1, 180, 650],
          width: 75,
          height: 10,
        },
        {
          str: "Instructor:",
          transform: [1, 0, 0, 1, 40, 650],
          width: 55,
          height: 10,
        },
        {
          str: "36-202 Methods",
          transform: [1, 0, 0, 1, 40, 710],
          width: 95,
          height: 12,
        },
      ]),
    ).toBe("36-202 Methods\nInstructor: | Ada Lovelace\nFooter");
  });
});

describe("heuristic syllabus extraction", () => {
  it("extracts staff, point-based grading, wrapped dates, and policies", async () => {
    const pages = [
      {
        pageNumber: 1,
        text: [
          "99-520 Summer 2026",
          "99-520: Bridging Eyes and Minds: Collaborative Eye-Tracking",
          "Research",
          "Instructor: | Seth Wiener, Ph.D. | sethw1@cmu.edu",
          "TA: | Adam Bramlett | abramlet@andrew.cmu.edu",
          "Meeting times: Mondays 8-10pm EST",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        text: [
          "Grading structure",
          "Individual tasks",
          "Canvas written assignments [14 points]",
          "Gorilla assignments [10 points]",
          "presentation [10 points]",
          "Pop quizzes [10 points]",
          "Self assessment [6 points]",
          "CITI completion [4 points]",
          "Team tasks",
          "Gorilla assignments [20 points]",
          "presentation [20 points]",
          "Team member assessment [6 points]",
          "No late work is accepted in this class.",
        ].join("\n"),
      },
      {
        pageNumber: 5,
        text: [
          "Summaries (due 5/18)",
          "Individual Gorilla task 1 (due",
          "5/25)",
        ].join("\n"),
      },
    ];
    const result = await new HeuristicSyllabusExtractor().extract({
      sourceId: "point-syllabus",
      pages,
      assumedTerm: { timeZone: "America/New_York" },
    });

    expect(result.course.code.value).toBe("99-520");
    expect(result.course.title.value).toBe(
      "Bridging Eyes and Minds: Collaborative Eye-Tracking Research",
    );
    expect(result.course.timeZone.value).toBe("America/New_York");
    expect(result.people.map((person) => person.value.email)).toEqual([
      "sethw1@cmu.edu",
      "abramlet@andrew.cmu.edu",
    ]);
    expect(result.gradingCategories).toHaveLength(9);
    expect(
      result.gradingCategories.reduce(
        (sum, category) => sum + (category.value.weightPercent ?? 0),
        0,
      ),
    ).toBe(100);
    expect(
      result.events.map((event) => [event.value.title, event.value.startDate]),
    ).toEqual(
      expect.arrayContaining([
        ["Summaries", "2026-05-18"],
        ["Individual Gorilla task 1", "2026-05-25"],
      ]),
    );
    expect(
      result.gradingPolicies.some((policy) => policy.value.kind === "other"),
    ).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "POINTS_CONVERTED_TO_WEIGHTS",
        "INFERRED_EVENT_YEARS",
      ]),
    );
    expect(
      validateExtractionEvidence(result, pages).filter(
        (item) => !item.evidenceMatched,
      ),
    ).toEqual([]);
  });

  it("extracts office hours, percentage grading, inherited exam details, and policies", async () => {
    const pages = [
      {
        pageNumber: 1,
        text: "Syllabus\n36-202 – Methods for Statistics & Data Science\nFall 2025",
      },
      {
        pageNumber: 2,
        text: [
          "Instructor: Gordon Weinberg",
          "Office: 129-C Baker",
          "Email: gordonw@andrew.cmu.edu",
          "Office Hours: Tuesdays, 1:30PM–3:00PM, 129-C Baker.",
        ].join("\n"),
      },
      {
        pageNumber: 3,
        text: [
          "Your semester grade consists of:",
          "Labs | 10% of grade",
          "Homework | 15% of grade",
          "Projects | 20% of grade",
          "exams | 30% of grade",
          "Final Exam | 25% of grade",
          "Your lowest two homework scores will be dropped.",
        ].join("\n"),
      },
      {
        pageNumber: 5,
        text: "Lecture: M/W/F, 11:00AM–11:50AM, CUC McConomy Auditorium",
      },
      {
        pageNumber: 9,
        text: [
          "Project 1: Due Wednesday, October 22, by 11:59PM, on Gradescope",
          "Project 2: Due Monday, November 24, by 11:59PM, on Gradescope",
        ].join("\n"),
      },
      {
        pageNumber: 10,
        text: [
          "Exam 1: | Monday, October 6 (during regular lecture time in regular lecture room).",
          "Exam 2: | Monday, November 10 (during regular lecture time in regular lecture room).",
          "If the absence is excused, the missing Midterm Exam grade will be replaced with the final exam grade.",
          "Final Exam: TBD",
        ].join("\n"),
      },
    ];
    const result = await new HeuristicSyllabusExtractor().extract({
      sourceId: "percentage-syllabus",
      pages,
      assumedTerm: { timeZone: "America/New_York" },
    });

    expect(result.course.code.value).toBe("36-202");
    expect(result.people[0].value).toMatchObject({
      name: "Gordon Weinberg",
      email: "gordonw@andrew.cmu.edu",
      officeLocation: "129-C Baker",
    });
    expect(result.officeHours[0].value).toMatchObject({
      dayOfWeek: 2,
      startTime: "13:30",
      endTime: "15:00",
      location: "129-C Baker",
    });
    expect(
      result.gradingCategories.map((category) => category.value.weightPercent),
    ).toEqual([10, 15, 20, 30, 25]);
    expect(
      result.events.find((event) => event.value.title === "Exam 1")?.value,
    ).toMatchObject({
      startDate: "2025-10-06",
      startTime: "11:00",
      endTime: "11:50",
      location: "CUC McConomy Auditorium",
    });
    expect(result.gradingPolicies.map((policy) => policy.value.kind)).toEqual(
      expect.arrayContaining(["drop_lowest", "replacement"]),
    );
    expect(
      result.warnings.some(
        (warning) => warning.code === "UNSCHEDULED_FINAL_EXAM",
      ),
    ).toBe(true);
    expect(
      validateExtractionEvidence(result, pages).filter(
        (item) => !item.evidenceMatched,
      ),
    ).toEqual([]);
  });
});

describe("extraction validation", () => {
  it("normalizes PDF whitespace and punctuation for evidence matching", () => {
    expect(
      evidenceMatches({ pageNumber: 2, quote: "Final exam — December 12" }, [
        { pageNumber: 1, text: "Overview" },
        { pageNumber: 2, text: "Final   exam - December 12" },
      ]),
    ).toBe(true);
    expect(normalizeEvidenceText("  “Office\nHours”  ")).toBe('"office hours"');
    expect(normalizeEvidenceText("Task | ● 6/1")).toBe("task | 6/1");
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
