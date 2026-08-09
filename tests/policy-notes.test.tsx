import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PolicyNotes } from "@/components/policy-notes";

describe("PolicyNotes", () => {
  it("keeps syllabus policies collapsed until the user opens them", async () => {
    const user = userEvent.setup();
    render(
      <PolicyNotes
        policies={[
          "Lecture attendance is not graded.",
          "The lowest two homework scores are dropped.",
        ]}
      />,
    );

    const title = screen.getByText("Unsupported policies");
    const details = title.closest("details");
    const summary = title.closest("summary");

    expect(details).not.toHaveAttribute("open");
    expect(within(summary as HTMLElement).getByText("2")).toBeVisible();

    await user.click(summary as HTMLElement);

    expect(details).toHaveAttribute("open");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByText("The lowest two homework scores are dropped."),
    ).toBeVisible();
  });

  it("renders nothing when there are no policies", () => {
    const { container } = render(<PolicyNotes policies={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
