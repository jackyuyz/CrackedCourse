import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import type { ReviewItemType } from "@/lib/review/schema";
import { createClient } from "@/lib/supabase/server";

export type ItemReviewStatus = "pending" | "confirmed" | "edited" | "rejected";

export interface ReviewItemData {
  id: string;
  itemType: ReviewItemType;
  payload: Record<string, unknown>;
  originalPayload: Record<string, unknown>;
  confidenceLabel: "high" | "review" | "low";
  evidence: Array<{ pageNumber: number | null; quote: string }>;
  reviewStatus: ItemReviewStatus;
}

export interface ReviewData {
  courseId: string;
  courseLabel: string;
  sourceName: string;
  pageCount: number | null;
  items: ReviewItemData[];
  warnings: Array<{
    code: string;
    message: string;
    severity: "info" | "review" | "blocking";
  }>;
}

const demoItems: ReviewItemData[] = [
  {
    id: "review-code",
    itemType: "course_field",
    payload: { field: "code", value: "15-122" },
    originalPayload: { field: "code", value: "15-122" },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 1,
        quote: "15-122 Principles of Imperative Computation · Fall 2026",
      },
    ],
    reviewStatus: "confirmed",
  },
  {
    id: "review-title",
    itemType: "course_field",
    payload: { field: "title", value: "Principles of Imperative Computation" },
    originalPayload: {
      field: "title",
      value: "Principles of Imperative Computation",
    },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 1,
        quote: "15-122 Principles of Imperative Computation · Fall 2026",
      },
    ],
    reviewStatus: "confirmed",
  },
  {
    id: "review-term",
    itemType: "course_field",
    payload: { field: "term", value: "Fall 2026" },
    originalPayload: { field: "term", value: "Fall 2026" },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 1,
        quote: "15-122 Principles of Imperative Computation · Fall 2026",
      },
    ],
    reviewStatus: "pending",
  },
  {
    id: "review-person",
    itemType: "person",
    payload: {
      name: "Dr. Lena Ortiz",
      role: "instructor",
      email: "lortiz@example.edu",
      officeLocation: "Gates 6203",
    },
    originalPayload: {
      name: "Dr. Lena Ortiz",
      role: "instructor",
      email: "lortiz@example.edu",
      officeLocation: "Gates 6203",
    },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 1,
        quote: "Instructor: Dr. Lena Ortiz · lortiz@example.edu · Gates 6203",
      },
    ],
    reviewStatus: "pending",
  },
  {
    id: "review-hours",
    itemType: "office_hour",
    payload: {
      personName: "Dr. Lena Ortiz",
      recurrenceText: "Tuesdays, 2:00–3:30 PM",
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "15:30",
      startDate: "2026-08-31",
      endDate: "2026-12-11",
      timeZone: "America/New_York",
      location: "Gates 6203",
      meetingUrl: null,
    },
    originalPayload: {
      personName: "Dr. Lena Ortiz",
      recurrenceText: "Tuesdays, 2:00–3:30 PM",
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "15:30",
      startDate: "2026-08-31",
      endDate: "2026-12-11",
      timeZone: "America/New_York",
      location: "Gates 6203",
      meetingUrl: null,
    },
    confidenceLabel: "review",
    evidence: [
      {
        pageNumber: 1,
        quote:
          "Office hours are held Tuesdays from 2:00–3:30 PM in Gates 6203.",
      },
    ],
    reviewStatus: "pending",
  },
  {
    id: "review-event-1",
    itemType: "event",
    payload: {
      title: "Midterm 1",
      type: "exam",
      startDate: "2026-09-24",
      startTime: "19:00",
      endDate: "2026-09-24",
      endTime: "20:30",
      isAllDay: false,
      location: "DH 2210",
    },
    originalPayload: {
      title: "Midterm 1",
      type: "exam",
      startDate: "2026-09-24",
      startTime: "19:00",
      endDate: "2026-09-24",
      endTime: "20:30",
      isAllDay: false,
      location: "DH 2210",
    },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 5,
        quote:
          "Midterm 1: Thursday, September 24, 2026 · 7:00–8:30 PM · DH 2210",
      },
    ],
    reviewStatus: "confirmed",
  },
  {
    id: "review-event-2",
    itemType: "event",
    payload: {
      title: "Written Homework 2",
      type: "assignment",
      startDate: "2026-09-09",
      startTime: "23:59",
      endDate: null,
      endTime: null,
      isAllDay: false,
      location: null,
    },
    originalPayload: {
      title: "Written Homework 2",
      type: "assignment",
      startDate: "2026-09-09",
      startTime: "23:59",
      endDate: null,
      endTime: null,
      isAllDay: false,
      location: null,
    },
    confidenceLabel: "high",
    evidence: [
      {
        pageNumber: 4,
        quote: "Written Homework 2 is due September 9, 2026 at 11:59 PM.",
      },
    ],
    reviewStatus: "pending",
  },
  ...[
    ["Written homework", 20],
    ["Programming assignments", 35],
    ["Midterms", 25],
    ["Final exam", 20],
  ].map(
    ([name, weight], index) =>
      ({
        id: `review-grade-${index}`,
        itemType: "grading_category",
        payload: { name, weightPercent: weight },
        originalPayload: { name, weightPercent: weight },
        confidenceLabel: "high",
        evidence: [{ pageNumber: 6, quote: `${name}: ${weight}%` }],
        reviewStatus: index === 0 ? "confirmed" : "pending",
      }) as ReviewItemData,
  ),
  {
    id: "review-policy",
    itemType: "grading_policy",
    payload: {
      kind: "drop_lowest",
      description: "The lowest written homework score is dropped.",
      supportedByCalculator: false,
    },
    originalPayload: {
      kind: "drop_lowest",
      description: "The lowest written homework score is dropped.",
      supportedByCalculator: false,
    },
    confidenceLabel: "review",
    evidence: [
      {
        pageNumber: 6,
        quote:
          "Your lowest written homework score will be dropped before final grades are calculated.",
      },
    ],
    reviewStatus: "pending",
  },
];

export async function getReviewData(
  viewer: Viewer,
  courseId: string,
): Promise<ReviewData | null> {
  if (viewer.isDemo) {
    return {
      courseId,
      courseLabel: "15-122 · Fall 2026",
      sourceName: "15-122-fall-2026-syllabus.pdf",
      pageCount: 9,
      items: demoItems,
      warnings: [
        {
          code: "UNSUPPORTED_GRADING_POLICY",
          message:
            "A drop-lowest rule was found. The P0 calculator will show it but will not apply it.",
          severity: "review",
        },
      ],
    };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id,code,term_name,syllabus_sources(id,original_name,page_count)")
    .eq("id", courseId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!course) return null;

  const sources = (course.syllabus_sources ?? []) as Array<{
    id: string;
    original_name: string;
    page_count: number | null;
  }>;
  const source = sources.at(-1);
  if (!source) return null;

  const { data: run } = await supabase
    .from("extraction_runs")
    .select("id,validation_warnings")
    .eq("course_id", courseId)
    .eq("source_id", source.id)
    .in("status", ["succeeded", "partial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return null;

  const { data: rows } = await supabase
    .from("extraction_items")
    .select(
      "id,item_type,original_payload,current_payload,confidence_label,evidence,review_status",
    )
    .eq("run_id", run.id)
    .order("created_at", { ascending: true });

  const items = (rows ?? []).map((row) => ({
    id: row.id,
    itemType: row.item_type as ReviewItemType,
    payload: row.current_payload as Record<string, unknown>,
    originalPayload: row.original_payload as Record<string, unknown>,
    confidenceLabel: row.confidence_label as ReviewItemData["confidenceLabel"],
    evidence: row.evidence as ReviewItemData["evidence"],
    reviewStatus: row.review_status as ItemReviewStatus,
  }));

  return {
    courseId,
    courseLabel:
      [course.code, course.term_name].filter(Boolean).join(" · ") ||
      "Draft course",
    sourceName: source.original_name,
    pageCount: source.page_count,
    items,
    warnings: (run.validation_warnings ?? []) as ReviewData["warnings"],
  };
}
