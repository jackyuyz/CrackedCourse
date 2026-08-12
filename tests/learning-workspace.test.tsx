import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearningWorkspace } from "@/components/learning-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LearningWorkspace", () => {
  it("prioritizes the note editor and remounts material inputs when the mode changes", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <LearningWorkspace
        demo={false}
        initialData={{
          courseId: "course-id",
          courseCode: "99-520",
          courseTitle: "Interaction design",
          publicationVersion: null,
          publishedAt: null,
          hiddenUnits: [],
          materials: [],
          units: [
            {
              id: "unit-id",
              title: "Chapter 1 Intro",
              description: null,
              displayOrder: 0,
              isHidden: false,
              notes: {},
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "" })).toHaveClass("min-h-[30rem]");
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Private materials/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add material" }));
    expect(screen.getByLabelText("HTTPS link")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "File" }));
    expect(screen.getByLabelText("PDF or slide deck")).toHaveAttribute(
      "type",
      "file",
    );

    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.getByLabelText("HTTPS link")).toHaveValue("");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
