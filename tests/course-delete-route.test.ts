import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiSession: vi.fn(),
  revalidatePath: vi.fn(),
  sourceEq: vi.fn(),
  courseEq: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/auth/api", () => ({
  getApiSession: mocks.getApiSession,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { DELETE } from "@/app/api/courses/[courseId]/route";

function session({ courseExists = true }: { courseExists?: boolean } = {}) {
  const sourceBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: mocks.sourceEq,
  };
  mocks.sourceEq.mockReturnValueOnce(sourceBuilder).mockResolvedValueOnce({
    data: [{ storage_path: "user-id/source-id/syllabus.pdf" }],
    error: null,
  });

  const courseBuilder = {
    delete: vi.fn().mockReturnThis(),
    eq: mocks.courseEq,
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: courseExists ? { id: "course-id" } : null,
      error: null,
    }),
  };
  mocks.courseEq.mockReturnValue(courseBuilder);

  return {
    userId: "user-id",
    supabase: {
      from: vi.fn((table: string) =>
        table === "syllabus_sources" ? sourceBuilder : courseBuilder,
      ),
      storage: {
        from: vi.fn(() => ({ remove: mocks.remove })),
      },
    },
  };
}

describe("DELETE /api/courses/[courseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.remove.mockResolvedValue({ error: null });
  });

  it("deletes only the owned course and then removes its exact private PDF", async () => {
    mocks.getApiSession.mockResolvedValue(session());

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "course-id" }),
    });
    const body = (await response.json()) as {
      deleted: boolean;
      storageCleanupPending: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      courseId: "course-id",
      deleted: true,
      storageCleanupPending: false,
    });
    expect(mocks.courseEq).toHaveBeenCalledWith("id", "course-id");
    expect(mocks.courseEq).toHaveBeenCalledWith("owner_id", "user-id");
    expect(mocks.remove).toHaveBeenCalledWith([
      "user-id/source-id/syllabus.pdf",
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/(app)", "layout");
  });

  it("treats a stale already-missing sidebar item as successfully cleared", async () => {
    mocks.getApiSession.mockResolvedValue(session({ courseExists: false }));

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "missing-course" }),
    });
    const body = (await response.json()) as {
      deleted: boolean;
      alreadyMissing: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ deleted: false, alreadyMissing: true });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
