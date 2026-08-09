import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseUploader } from "@/components/course-uploader";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
}));
const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: supabaseMocks.getUser },
    storage: { from: () => ({ upload: supabaseMocks.upload }) },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function syllabusFile() {
  const bytes = new TextEncoder().encode("%PDF-1.7 syllabus content");
  const file = new File([bytes], "syllabus.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: vi.fn().mockResolvedValue(bytes.buffer),
  });
  return file;
}

async function selectAndUpload() {
  const user = userEvent.setup();
  const { container } = render(<CourseUploader demo={false} />);
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing input");
  await user.upload(input, syllabusFile());
  await user.click(
    screen.getByRole("button", { name: /upload and prepare review/i }),
  );
}

describe("CourseUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "upload-id"),
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
      },
    });
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    supabaseMocks.upload.mockResolvedValue({ error: null });
  });

  it("reuses an existing draft and reruns extraction without uploading a duplicate", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          courseId: "existing-course",
          courseStatus: "draft",
          reused: true,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          runId: "new-run",
          status: "succeeded",
          provider: "heuristic",
          model: "heuristic-v2",
          reused: false,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await selectAndUpload();

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith(
        "/courses/existing-course/review",
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/courses");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/courses/existing-course/extractions",
    );
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
  });

  it("stores a new PDF source and opens its persistent course review", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          courseId: "new-course",
          courseStatus: "draft",
          reused: false,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          courseId: "new-course",
          courseStatus: "draft",
          reused: false,
          source: { id: "source-id" },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          runId: "run-id",
          status: "partial",
          provider: "heuristic",
          model: "heuristic-v2",
          reused: false,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await selectAndUpload();

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith(
        "/courses/new-course/review",
      );
    });
    expect(supabaseMocks.upload).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/courses/new-course/sources");
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
  });

  it("opens an already published course without creating another extraction", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        courseId: "active-course",
        courseStatus: "active",
        reused: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await selectAndUpload();

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith("/courses/active-course");
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });
});
