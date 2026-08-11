import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CalendarWorkspace } from "@/components/calendar-workspace";
import type { AppCourse, AppEvent } from "@/lib/demo-data";

const course: AppCourse = {
  id: "course-id",
  code: "36-202",
  title: "Methods for Statistics & Data Science",
  section: null,
  termName: "Fall 2026",
  timeZone: "America/New_York",
  color: "ocean",
  status: "active",
  unresolvedCount: 0,
};

const events: AppEvent[] = [
  {
    id: "event-id",
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    courseColor: course.color,
    title: "Midterm exam",
    type: "exam",
    date: "2026-09-09",
    displayDate: "Wed, Sep 9",
    time: "11:00 AM",
    isAllDay: false,
    location: "Baker Hall",
  },
];

describe("CalendarWorkspace weekly view", () => {
  it("shows a seven-day week and moves the cursor one week at a time", async () => {
    const user = userEvent.setup();
    render(
      <CalendarWorkspace
        courses={[course]}
        events={events}
        demo
        allowExport={false}
      />,
    );

    const weekButton = screen.getByRole("button", { name: "Week" });
    await user.click(weekButton);

    expect(weekButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "Sep 6–12, 2026" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /Midterm exam/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous week" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next week" }));

    expect(
      screen.getByRole("heading", { name: "Sep 13–19, 2026" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Midterm exam/ }),
    ).not.toBeInTheDocument();
  });
});
