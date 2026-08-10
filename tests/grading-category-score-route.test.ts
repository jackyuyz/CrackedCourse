import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  getApiSession: mocks.getApiSession,
}));

import { PATCH } from "@/app/api/grading-categories/[categoryId]/score/route";

function request(scorePercent: number | null) {
  return new Request(
    "http://localhost/api/grading-categories/category-id/score",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scorePercent }),
    },
  );
}

describe("PATCH /api/grading-categories/[categoryId]/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      update: mocks.update,
      eq: mocks.eq,
      select: mocks.select,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.update.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "category-id", student_score_percent: 92.5 },
      error: null,
    });
    mocks.getApiSession.mockResolvedValue({
      userId: "owner-id",
      supabase: { from: vi.fn(() => builder) },
    });
  });

  it("saves a category percentage with an explicit owner filter", async () => {
    const response = await PATCH(request(92.5), {
      params: Promise.resolve({ categoryId: "category-id" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      student_score_percent: 92.5,
    });
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "category-id");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "owner_id", "owner-id");
    await expect(response.json()).resolves.toEqual({
      category: { id: "category-id", scorePercent: 92.5 },
    });
  });

  it("accepts clearing and extra-credit scores while rejecting extreme values", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "category-id", student_score_percent: null },
      error: null,
    });
    const cleared = await PATCH(request(null), {
      params: Promise.resolve({ categoryId: "category-id" }),
    });
    const extraCredit = await PATCH(request(110), {
      params: Promise.resolve({ categoryId: "category-id" }),
    });
    const invalid = await PATCH(request(1000), {
      params: Promise.resolve({ categoryId: "category-id" }),
    });

    expect(cleared.status).toBe(200);
    expect(extraCredit.status).toBe(200);
    expect(invalid.status).toBe(400);
  });

  it("does not reveal whether another owner has that category", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(request(80), {
      params: Promise.resolve({ categoryId: "another-category" }),
    });

    expect(response.status).toBe(404);
  });
});
