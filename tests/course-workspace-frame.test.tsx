import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseWorkspaceFrame } from "@/components/course-workspace-frame";

const navigation = vi.hoisted(() => ({
  pathname: "/courses/course-id/calendar",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("CourseWorkspaceFrame", () => {
  beforeEach(() => {
    navigation.pathname = "/courses/course-id/calendar";
  });

  it("keeps the shared header around workspace tab content", () => {
    render(
      <CourseWorkspaceFrame header={<div>Persistent course header</div>}>
        <div>Calendar content</div>
      </CourseWorkspaceFrame>,
    );

    expect(screen.getByText("Persistent course header")).toBeVisible();
    expect(screen.getByText("Calendar content")).toBeVisible();
  });

  it("leaves the full-screen review flow unwrapped", () => {
    navigation.pathname = "/courses/course-id/review";
    render(
      <CourseWorkspaceFrame header={<div>Persistent course header</div>}>
        <div>Review flow</div>
      </CourseWorkspaceFrame>,
    );

    expect(screen.queryByText("Persistent course header")).toBeNull();
    expect(screen.getByText("Review flow")).toBeVisible();
  });
});
