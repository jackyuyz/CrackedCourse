import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  hasSupabaseEnv: () => true,
  isDemoMode: () => false,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getViewer, getViewerState } from "@/lib/auth/viewer";

describe("getViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "user-id",
          email: "jacky2@andrew.cmu.edu",
          user_metadata: { display_name: "Old token name" },
        },
      },
      error: null,
    });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({
      data: { display_name: "Saved profile name" },
      error: null,
    });
    mocks.createClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      from: mocks.from,
    });
  });

  it("uses the saved profile name instead of stale JWT metadata", async () => {
    const viewer = await getViewer();

    expect(viewer?.displayName).toBe("Saved profile name");
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.eq).toHaveBeenCalledWith("id", "user-id");
  });

  it("keeps Auth rate limits distinct from a missing session", async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: null },
      error: { status: 429, code: "over_request_rate_limit" },
    });

    await expect(getViewerState()).resolves.toEqual({ kind: "rate_limited" });
  });
});
