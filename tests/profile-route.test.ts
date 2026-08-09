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

import { PATCH } from "@/app/api/profile/route";

function request(displayName: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
}

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockReturnThis();
    mocks.select.mockReturnThis();
    mocks.maybeSingle.mockResolvedValue({
      data: { display_name: "Jacky Zheng" },
      error: null,
    });
    mocks.update.mockReturnValue({
      eq: mocks.eq,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    });
    mocks.getApiSession.mockResolvedValue({
      userId: "user-id",
      supabase: {
        from: vi.fn(() => ({ update: mocks.update })),
      },
    });
  });

  it("updates only the authenticated user's profile and revalidates the app", async () => {
    const response = await PATCH(request("  Jacky Zheng  "));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "Jacky Zheng" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "user-id");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/(app)", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects blank names before querying", async () => {
    const response = await PATCH(request("   "));

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
