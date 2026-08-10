import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceNavigation } from "@/components/workspace-navigation";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("WorkspaceNavigation", () => {
  beforeEach(() => {
    navigation.pathname = "/dashboard";
  });

  it("marks Dashboard as the current page on the dashboard", () => {
    render(<WorkspaceNavigation />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("moves the current-page state to the workspace calendar", () => {
    navigation.pathname = "/calendar";
    render(<WorkspaceNavigation />);

    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not select a workspace link inside a course", () => {
    navigation.pathname = "/courses/course-id/calendar";
    render(<WorkspaceNavigation />);

    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps Community selected on publication detail pages", () => {
    navigation.pathname = "/community/publication-id";
    render(<WorkspaceNavigation />);

    expect(screen.getByRole("link", { name: "Community" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
