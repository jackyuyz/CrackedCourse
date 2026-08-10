import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  getApiSession: mocks.getApiSession,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { POST } from "@/app/api/courses/route";

describe("POST /api/courses primary time zone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const courseBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "course-id" },
        error: null,
      }),
    };
    mocks.insert.mockReturnValue(courseBuilder);
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { default_institution_id: "institution-id" },
        error: null,
      }),
    };
    mocks.getApiSession.mockResolvedValue({
      userId: "user-id",
      supabase: {
        from: vi.fn((table: string) =>
          table === "profiles"
            ? profileBuilder
            : { insert: mocks.insert },
        ),
      },
    });
  });

  it("uses New York when the client omits the primary time zone", async () => {
    const response = await POST(
      new Request("http://localhost/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorKey: "ocean" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        time_zone: "America/New_York",
        institution_id: "institution-id",
      }),
    );
  });

  it("rejects attempts to select another primary time zone", async () => {
    const response = await POST(
      new Request("http://localhost/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone: "UTC" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
