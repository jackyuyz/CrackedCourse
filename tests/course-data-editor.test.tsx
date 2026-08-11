import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseDataEditor } from "@/components/course-data-editor";
import type { CourseEditorData } from "@/lib/course-editor";

const navigationMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

const initialData: CourseEditorData = {
  courseId: "course-id",
  courseTimeZone: "America/New_York",
  people: [
    {
      id: "person-id",
      name: "Dr. Lee",
      role: "instructor",
      email: "lee@example.edu",
      officeLocation: null,
      externalProfileUrl: null,
      origin: "syllabus",
      isHidden: false,
    },
  ],
  officeHours: [],
  events: [],
  categories: [],
  policies: [],
  assessments: [],
  sources: [],
};

describe("CourseDataEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("labels source-backed values and lets an owner add a manual calendar item", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ saved: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseDataEditor initialData={initialData} />);

    expect(screen.getByText("From syllabus")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Calendar" }));
    await user.click(screen.getByRole("button", { name: "Add event" }));
    await user.type(screen.getByPlaceholderText("Midterm 1"), "Final exam");
    await user.type(
      screen.getAllByPlaceholderText("YYYY-MM-DD")[0],
      "2026-12-18",
    );
    await user.click(screen.getByRole("button", { name: "Save course data" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/courses/course-id/details",
        expect.objectContaining({ method: "PUT" }),
      );
    });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(request.body as string) as CourseEditorData;
    expect(payload.events).toEqual([
      expect.objectContaining({
        title: "Final exam",
        startDate: "2026-12-18",
        origin: "manual",
      }),
    ]);
    expect(navigationMocks.refresh).toHaveBeenCalledOnce();
  });

  it("hides a source-backed item without removing its provenance from the draft", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ saved: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseDataEditor initialData={initialData} />);

    await user.click(screen.getByRole("button", { name: "Hide" }));
    await user.click(screen.getByRole("button", { name: "Save course data" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(request.body as string) as CourseEditorData;
    expect(payload.people[0]).toEqual(
      expect.objectContaining({ origin: "syllabus", isHidden: true }),
    );
  });
});
