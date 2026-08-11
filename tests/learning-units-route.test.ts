import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApiSession: vi.fn() }));

vi.mock("@/lib/auth/api", () => ({ getApiSession: mocks.getApiSession }));

import { POST } from "@/app/api/courses/[courseId]/learning-units/route";

function maybeSingle(data: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

describe("POST /api/courses/[courseId]/learning-units", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains when the database migration has not been applied", async () => {
    const course = maybeSingle({ id: "course-id" });
    const latest = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    latest.select.mockReturnValue(latest);
    latest.eq.mockReturnValue(latest);
    latest.order.mockReturnValue(latest);
    latest.limit.mockReturnValue(latest);
    const insert = {
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42P01" },
      }),
    };
    insert.select.mockReturnValue(insert);
    let learningUnitsCall = 0;
    mocks.getApiSession.mockResolvedValue({
      userId: "owner-id",
      supabase: {
        from: vi.fn((table: string) => {
          if (table === "courses") return course;
          if (table === "learning_units") {
            learningUnitsCall += 1;
            return learningUnitsCall === 1
              ? latest
              : { insert: vi.fn().mockReturnValue(insert) };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/courses/course-id/learning-units", {
        method: "POST",
        body: JSON.stringify({ title: "Chapter 1 Intro" }),
      }),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "LEARNING_UNITS_NOT_MIGRATED",
        message:
          "Learning Units has not been set up on this database yet. Apply migration 20260811172656_learning_units_and_notes, then try again.",
      },
    });
  });
});
