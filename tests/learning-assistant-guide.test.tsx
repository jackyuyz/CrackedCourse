import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LearningAssistant } from "@/components/learning-assistant";
import type { LearningUnit } from "@/lib/learning-units";

const unit: LearningUnit = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Confidence intervals",
  description: null,
  displayOrder: 0,
  isHidden: false,
  notes: {
    private: {
      id: "note-id",
      visibility: "private",
      bodyMarkdown: "A confidence interval estimates an unknown parameter.",
      updatedAt: "2026-08-20T20:00:00.000Z",
    },
  },
};

const guide = {
  id: "guide-id",
  action: "summary" as const,
  answerMarkdown:
    "## What this unit is about\n\nConfidence intervals quantify uncertainty.",
  practiceItems: [],
  citations: [],
  insufficiency: null,
  model: "gpt-5.5",
  sourceCount: 1,
  completedAt: "2026-08-20T20:05:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI Study Guide", () => {
  it("shows a saved guide immediately without regenerating it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          guide,
          state: "current",
          defaultSources: [{ kind: "note", visibility: "private" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <LearningAssistant
        courseId="course-id"
        unit={unit}
        materials={[]}
        demo={false}
        enabled
        onCopyToNote={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(
      await screen.findByText("Confidence intervals quantify uncertainty."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
    expect(screen.queryByText("Sources for follow-up questions")).toBeNull();
  });

  it("collapses and restores the study guide without regenerating it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          guide,
          state: "current",
          defaultSources: [{ kind: "note", visibility: "private" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <LearningAssistant
        courseId="course-id"
        unit={unit}
        materials={[]}
        demo={false}
        enabled
        onCopyToNote={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(
      await screen.findByText("Confidence intervals quantify uncertainty."),
    ).toBeInTheDocument();

    const collapseButton = screen.getByRole("button", {
      name: "Collapse AI Study Guide",
    });
    await user.click(collapseButton);

    expect(
      screen.queryByText("Confidence intervals quantify uncertainty."),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Expand AI Study Guide" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("AI Study Guide")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Expand AI Study Guide" }),
    );

    expect(
      screen.getByText("Confidence intervals quantify uncertainty."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("generates once when no saved guide exists", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            guide: null,
            state: "missing",
            defaultSources: [{ kind: "note", visibility: "private" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ output: guide }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <LearningAssistant
        courseId="course-id"
        unit={unit}
        materials={[]}
        demo={false}
        enabled
        onCopyToNote={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(
      await screen.findByText("Confidence intervals quantify uncertainty."),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
    expect(
      JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
    ).toMatchObject({ action: "summary", intent: "unit-guide" });
  });
});
