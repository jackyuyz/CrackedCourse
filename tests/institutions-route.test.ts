import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({ getApiSession: mocks.getApiSession }));

import { GET } from "@/app/api/institutions/route";

describe("GET /api/institutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      ilike: mocks.ilike,
      order: mocks.order,
      limit: mocks.limit,
    };
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.ilike.mockReturnValue(builder);
    mocks.order.mockReturnValue(builder);
    mocks.limit.mockResolvedValue({
      data: [
        {
          id: "school-id",
          canonical_name: "University of Toronto",
          city: "Toronto",
          region_code: "ON",
          country_code: "CA",
          default_time_zone: "America/Toronto",
        },
      ],
      error: null,
    });
    mocks.getApiSession.mockResolvedValue({
      userId: "user-id",
      supabase: {
        from: vi.fn(() => builder),
      },
    });
  });

  it("requires authentication", async () => {
    mocks.getApiSession.mockResolvedValue(null);
    const response = await GET(
      new Request("http://localhost/api/institutions?q=Toronto"),
    );
    expect(response.status).toBe(401);
  });

  it("returns only mapped North American directory fields", async () => {
    const response = await GET(
      new Request("http://localhost/api/institutions?q=Toronto"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("is_active", true);
    expect(mocks.limit).toHaveBeenCalledWith(12);
    expect(body.institutions).toEqual([
      {
        id: "school-id",
        name: "University of Toronto",
        city: "Toronto",
        region: "ON",
        country: "CA",
        timeZone: "America/Toronto",
      },
    ]);
  });
});
