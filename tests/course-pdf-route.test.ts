import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  sourceEq: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ getApiSession: mocks.getApiSession }));

import { GET } from "@/app/api/courses/[courseId]/pdf/route";

describe("GET /api/courses/[courseId]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sourceBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: mocks.sourceEq,
      maybeSingle: vi.fn().mockResolvedValue({
        data: { storage_path: "user-id/course-id/syllabus.pdf" },
        error: null,
      }),
    };
    mocks.sourceEq.mockReturnValue(sourceBuilder);
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed-syllabus" },
      error: null,
    });
    mocks.getApiSession.mockResolvedValue({
      userId: "user-id",
      supabase: {
        from: vi.fn(() => sourceBuilder),
        storage: {
          from: vi.fn(() => ({ createSignedUrl: mocks.createSignedUrl })),
        },
      },
    });
  });

  it("redirects an owner to a short-lived signed URL for the requested PDF", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/courses/course-id/pdf?sourceId=source-id",
      ),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://storage.example/signed-syllabus",
    );
    expect(mocks.sourceEq).toHaveBeenCalledWith("id", "source-id");
    expect(mocks.sourceEq).toHaveBeenCalledWith("course_id", "course-id");
    expect(mocks.sourceEq).toHaveBeenCalledWith("owner_id", "user-id");
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      "user-id/course-id/syllabus.pdf",
      60,
    );
  });

  it("requires an authenticated owner", async () => {
    mocks.getApiSession.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/courses/course-id/pdf?sourceId=source-id",
      ),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
