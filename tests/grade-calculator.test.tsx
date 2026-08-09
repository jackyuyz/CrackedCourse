import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GradeCalculator } from "@/components/grade-calculator";

describe("GradeCalculator policy notes", () => {
  it("groups unsupported policies in a collapsed expandable section", async () => {
    const user = userEvent.setup();
    render(
      <GradeCalculator
        demo
        initialData={{
          course: {
            id: "course-id",
            code: "36-202",
            title: "Methods for Statistics & Data Science",
            section: null,
            termName: "Fall 2025",
            color: "ocean",
            status: "active",
          },
          categories: [],
          policyWarnings: [
            "Late projects are not accepted.",
            "The lowest two homework scores are dropped.",
          ],
        }}
      />,
    );

    const title = screen.getByText("Unsupported policies");
    const details = title.closest("details");
    const summary = title.closest("summary");
    expect(details).not.toBeNull();
    expect(summary).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(within(summary as HTMLElement).getByText("2")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await user.click(summary as HTMLElement);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Late projects are not accepted.")).toBeVisible();
    expect(
      screen.getByText("The lowest two homework scores are dropped."),
    ).toBeVisible();
  });
});
