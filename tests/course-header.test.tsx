import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseHeader } from "@/components/course-header";

describe("CourseHeader", () => {
  it("keeps the shared course identity visible while the active tab changes", () => {
    render(
      <CourseHeader
        course={{
          id: "course-id",
          code: "36-202",
          title: "Methods for Statistics & Data Science",
          section: "Section A",
          termName: "Fall 2025",
          color: "ocean",
          status: "active",
        }}
        active="calendar"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Methods for Statistics & Data Science",
      }),
    ).toBeVisible();
    expect(screen.getByText("36-202")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("Section A · Fall 2025")).toBeVisible();

    const navigation = screen.getByRole("navigation", {
      name: "Course navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: /Calendar/ }),
    ).toHaveClass("text-navy");
    expect(within(navigation).getAllByRole("link")).toHaveLength(3);
  });
});
