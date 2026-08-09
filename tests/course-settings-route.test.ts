import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  getApiSession: mocks.getApiSession,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { PATCH } from "@/app/api/courses/[courseId]/route";

const validSettings = {
  code: "36-202",
  title: "Methods for Statistics & Data Science",
  section: "Lecture 1",
  termName: "Fall 2026",
  termStart: "2026-08-31",
  termEnd: "2026-12-18",
  timeZone: "America/New_York",
  colorKey: "ocean",
  status: "active",
};

function request(body: unknown) {
  return new Request("http://localhost/api/courses/course-id", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/courses/[courseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockReturnThis();
    mocks.select.mockReturnThis();
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "course-id", ...validSettings },
      error: null,
    });
    mocks.update.mockReturnValue({
      eq: mocks.eq,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    });
    mocks.getApiSession.mockResolvedValue({
      userId: "owner-id",
      supabase: {
        from: vi.fn(() => ({ update: mocks.update })),
      },
    });
  });

  it("updates every editable course field with an explicit owner filter", async () => {
    const response = await PATCH(request(validSettings), {
      params: Promise.resolve({ courseId: "course-id" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      code: validSettings.code,
      title: validSettings.title,
      section: validSettings.section,
      term_name: validSettings.termName,
      term_start: validSettings.termStart,
      term_end: validSettings.termEnd,
      time_zone: validSettings.timeZone,
      color_key: validSettings.colorKey,
      status: validSettings.status,
    });
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "course-id");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "owner_id", "owner-id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/(app)", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses/course-id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects invalid time zones and reversed term dates before querying", async () => {
    const invalidTimeZone = await PATCH(
      request({ ...validSettings, timeZone: "Moon/Sea_of_Tranquility" }),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );
    const invalidDates = await PATCH(
      request({
        ...validSettings,
        termStart: "2026-12-18",
        termEnd: "2026-08-31",
      }),
      { params: Promise.resolve({ courseId: "course-id" }) },
    );

    expect(invalidTimeZone.status).toBe(400);
    expect(invalidDates.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns not found when the owner-scoped update matches no course", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(request(validSettings), {
      params: Promise.resolve({ courseId: "another-course" }),
    });

    expect(response.status).toBe(404);
  });
});
