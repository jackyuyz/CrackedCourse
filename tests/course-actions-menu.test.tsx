import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseActionsMenu } from "@/components/course-actions-menu";
import type { CourseIdentity } from "@/lib/data/course";

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

const course: CourseIdentity = {
  id: "course-id",
  code: "36-202",
  title: "Methods for Statistics & Data Science",
  section: null,
  termName: "Fall 2026",
  termStart: null,
  termEnd: null,
  timeZone: "America/New_York",
  color: "ocean",
  status: "active",
  institution: null,
  publication: null,
};

describe("CourseActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens course settings and saves identity, term, time zone, color, and status", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ course: { id: course.id } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseActionsMenu course={course} />);

    await user.click(screen.getByRole("button", { name: "Course options" }));
    await user.click(screen.getByRole("menuitem", { name: "Course settings" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    const code = screen.getByLabelText("Course number");
    const title = screen.getByLabelText("Course name");
    const section = screen.getByLabelText("Section");
    const startDate = screen.getByLabelText("Start date");
    const endDate = screen.getByLabelText("End date");
    expect(startDate).toHaveAttribute("type", "text");
    expect(startDate).toHaveAttribute("placeholder", "MM/DD/YYYY");
    expect(endDate).toHaveAttribute("type", "text");
    expect(endDate).toHaveAttribute("placeholder", "MM/DD/YYYY");
    await user.clear(code);
    await user.type(code, "36-303");
    await user.clear(title);
    await user.type(title, "Advanced Data Analysis");
    await user.type(section, "Lecture 2");
    await user.type(startDate, "08/31/2026");
    await user.type(endDate, "12/18/2026");
    await user.click(screen.getByRole("button", { name: "Gold" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/courses/course-id",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(requestOptions.body as string)).toEqual({
      code: "36-303",
      title: "Advanced Data Analysis",
      section: "Lecture 2",
      termName: "Fall 2026",
      termStart: "2026-08-31",
      termEnd: "2026-12-18",
      timeZone: "America/New_York",
      colorKey: "gold",
      status: "active",
      institutionId: null,
    });
    expect(navigationMocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows its own English validation instead of native date messages", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseActionsMenu course={course} />);

    await user.click(screen.getByRole("button", { name: "Course options" }));
    await user.click(screen.getByRole("menuitem", { name: "Course settings" }));
    await user.type(screen.getByLabelText("End date"), "13/40/2026");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter dates in MM/DD/YYYY format.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens the English calendar and fills the selected date", async () => {
    const user = userEvent.setup();
    render(
      <CourseActionsMenu course={{ ...course, termStart: "2026-08-31" }} />,
    );

    await user.click(screen.getByRole("button", { name: "Course options" }));
    await user.click(screen.getByRole("menuitem", { name: "Course settings" }));
    await user.click(screen.getByRole("button", { name: "Choose Start date" }));

    expect(screen.getByText("August 2026")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "August 20, 2026" }));
    expect(screen.getByLabelText("Start date")).toHaveValue("08/20/2026");
    expect(screen.queryByText("August 2026")).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting and returns to the dashboard", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ deleted: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseActionsMenu course={course} />);

    await user.click(screen.getByRole("button", { name: "Course options" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete course" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Delete course" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/courses/course-id", {
        method: "DELETE",
      });
    });
    expect(navigationMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(navigationMocks.refresh).toHaveBeenCalledOnce();
  });
});
