import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getApiSession: vi.fn() }));
const nextCacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/api", () => authMocks);
vi.mock("next/cache", () => nextCacheMocks);

import { POST } from "@/app/api/courses/[courseId]/publish/route";

describe("POST /api/courses/[courseId]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an actionable error for an invalid reviewed event range", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMocks.getApiSession.mockResolvedValue({
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          error: {
            code: "23514",
            message:
              'new row for relation "calendar_events" violates check constraint "calendar_events_timed_range_check"',
            details: null,
            hint: null,
          },
        }),
      },
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "course-id" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVALID_EVENT_RANGE",
        message:
          "One reviewed event ends before it starts. Correct its time and try again.",
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Course publish failed",
      expect.objectContaining({ courseId: "course-id", code: "23514" }),
    );
  });
});
