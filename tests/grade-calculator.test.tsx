import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommunityGradeCalculator } from "@/components/community-grade-calculator";
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

describe("percentage grade entry", () => {
  it("turns a category percentage into weighted course points", async () => {
    const user = userEvent.setup();
    render(
      <GradeCalculator
        demo
        initialData={{
          course: {
            id: "course-id",
            code: "99-520",
            title: "Bridging Eyes and Minds",
            section: null,
            termName: "Summer 2026",
            color: "ocean",
            status: "active",
          },
          categories: [
            {
              id: "homework-id",
              name: "Homework",
              weightPercent: 20,
              scorePercent: null,
            },
            {
              id: "exam-id",
              name: "Exam 1",
              weightPercent: 30,
              scorePercent: null,
            },
          ],
          policyWarnings: [],
        }}
      />,
    );

    await user.type(screen.getByLabelText("Homework score percent"), "85");

    expect(screen.getByText("+17.0")).toBeVisible();
    expect(screen.getByText("17.0 / 100")).toBeVisible();
    expect(screen.getByText("85.0%")).toBeVisible();
  });

  it("accepts extra credit without showing a score stepper", async () => {
    const user = userEvent.setup();
    render(
      <GradeCalculator
        demo
        initialData={{
          course: {
            id: "course-id",
            code: "99-520",
            title: "Bridging Eyes and Minds",
            section: null,
            termName: "Summer 2026",
            color: "ocean",
            status: "active",
          },
          categories: [
            {
              id: "exam-id",
              name: "Exam 1",
              weightPercent: 25,
              scorePercent: null,
            },
          ],
          policyWarnings: [],
        }}
      />,
    );

    const score = screen.getByLabelText("Exam 1 score percent");
    await user.type(score, "110");

    expect(score).toHaveAttribute("type", "text");
    expect(score).toHaveAttribute("inputmode", "decimal");
    expect(score).not.toHaveAttribute("max");
    expect(screen.getByText("Extra credit entered")).toBeVisible();
    expect(screen.getByText("+27.5")).toBeVisible();
    expect(screen.getByText("110.0%")).toBeVisible();
  });

  it("keeps Community score experiments local and unsaved", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <CommunityGradeCalculator
        publicationId="publication-id"
        categories={[{ name: "Participation", weight_percent: 10 }]}
        policies={[]}
      />,
    );

    await user.type(
      screen.getByLabelText("Participation score percent"),
      "100",
    );

    expect(screen.getByText("+10.0")).toBeVisible();
    expect(screen.getByText("Private preview · not saved")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
