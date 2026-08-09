import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseSidebarList } from "@/components/course-sidebar-list";
import type { NavigationCourse } from "@/lib/data/dashboard";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/courses/active-course/grades",
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    replace: navigationMocks.replace,
    refresh: navigationMocks.refresh,
  }),
}));

const courses: NavigationCourse[] = [
  {
    id: "active-course",
    code: "36-202",
    title: "Methods for Statistics & Data Science",
    color: "ocean",
    status: "active",
  },
  {
    id: "draft-course",
    code: null,
    title: null,
    color: "gold",
    status: "draft",
  },
];

describe("CourseSidebarList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.pathname = "/courses/active-course/grades";
  });

  it("shows the real course name and highlights every tab in its workspace", () => {
    render(<CourseSidebarList courses={courses} canDelete />);

    const activeLink = screen.getByRole("link", {
      name: /Methods for Statistics & Data Science/,
    });
    expect(activeLink).toHaveAttribute("href", "/courses/active-course");
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("36-202")).toBeVisible();

    const draftLink = screen.getByRole("link", { name: /New course/ });
    expect(draftLink).toHaveAttribute("href", "/courses/draft-course/review");
    expect(draftLink).not.toHaveAttribute("aria-current");
  });

  it("deletes the selected course after confirmation and leaves its stale route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        courseId: "active-course",
        deleted: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CourseSidebarList courses={courses} canDelete />);

    await user.click(
      screen.getByRole("button", {
        name: "Delete Methods for Statistics & Data Science",
      }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Delete course$/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/courses/active-course", {
        method: "DELETE",
      });
    });
    expect(navigationMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(navigationMocks.refresh).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(
        screen.queryByRole("link", {
          name: /Methods for Statistics & Data Science/,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
