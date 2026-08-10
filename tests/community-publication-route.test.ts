import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  revalidatePath: vi.fn(),
  courseSelect: vi.fn(),
  publicationInsert: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ getApiSession: mocks.getApiSession }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { POST } from "@/app/api/courses/[courseId]/community-publication/route";

function chainMaybeSingle(data: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

describe("POST /api/courses/[courseId]/community-publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const course = {
      id: "course-id",
      code: "36-202",
      title: "Methods for Statistics & Data Science",
      section: null,
      term_name: "Fall 2026",
      term_start: "2026-08-31",
      term_end: "2026-12-18",
      time_zone: "America/New_York",
      status: "active",
      institution_id: "institution-id",
      calendar_events: [],
      grading_categories: [],
      grading_policies: [],
      course_people: [{ name: "Gordon Weinberg", role: "instructor" }],
      syllabus_sources: [
        {
          storage_path: "owner/course/syllabus.pdf",
          original_name: "syllabus.pdf",
          mime_type: "application/pdf",
          sha256: "a".repeat(64),
          size_bytes: 100,
          page_count: 14,
          processing_status: "parsed",
          created_at: "2026-08-09T00:00:00.000Z",
        },
      ],
    };
    const courseBuilder = chainMaybeSingle(course);
    courseBuilder.select.mockImplementation((selection: string) => {
      mocks.courseSelect(selection);
      return courseBuilder;
    });
    const profileBuilder = chainMaybeSingle({ display_name: "Jack" });
    const publicationLookupBuilder = chainMaybeSingle(null);
    const publicationWriteBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "publication-id",
          publication_status: "published",
          snapshot_version: 1,
          published_at: "2026-08-09T00:00:00.000Z",
        },
        error: null,
      }),
    };
    mocks.publicationInsert.mockReturnValue(publicationWriteBuilder);

    mocks.getApiSession.mockResolvedValue({
      userId: "owner-id",
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "courses") return courseBuilder;
          if (table === "profiles") return profileBuilder;
          if (table === "community_publications") {
            return {
              ...publicationLookupBuilder,
              insert: mocks.publicationInsert,
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      },
    });
  });

  it("requires explicit sharing rights confirmation", async () => {
    const response = await POST(
      new Request("http://localhost/api/courses/course-id/community-publication", {
        method: "POST",
        body: JSON.stringify({ rightsConfirmed: false }),
      }),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.publicationInsert).not.toHaveBeenCalled();
  });

  it("selects only public-safe source fields and creates a versioned snapshot", async () => {
    const response = await POST(
      new Request("http://localhost/api/courses/course-id/community-publication", {
        method: "POST",
        body: JSON.stringify({ rightsConfirmed: true }),
      }),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(response.status).toBe(201);
    const selection = mocks.courseSelect.mock.calls[0][0] as string;
    expect(selection).not.toContain("notes");
    expect(selection).not.toContain("meeting_url");
    expect(selection).not.toContain("email");
    expect(selection).not.toContain("assessments");
    expect(mocks.publicationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_course_id: "course-id",
        owner_id: "owner-id",
        institution_id: "institution-id",
        normalized_course_code: "36202",
        snapshot_version: 1,
        course_people: [{ name: "Gordon Weinberg", role: "instructor" }],
        publication_status: "published",
      }),
    );
  });
});
