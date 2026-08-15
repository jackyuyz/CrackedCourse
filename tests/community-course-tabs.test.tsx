import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommunityCourseTabs } from "@/components/community-course-tabs";

describe("CommunityCourseTabs", () => {
  it("provides independent shareable views and marks the active tab", () => {
    render(
      <CommunityCourseTabs
        publicationId="publication-id"
        activeTab="calendar"
      />,
    );

    expect(screen.getByRole("navigation")).toHaveAccessibleName(
      "Shared course navigation",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/community/publication-id",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/community/publication-id?tab=calendar",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Grades" })).toHaveAttribute(
      "href",
      "/community/publication-id?tab=grades",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows learning units when the published snapshot has them", () => {
    const { rerender } = render(
      <CommunityCourseTabs
        publicationId="publication-id"
        activeTab="learning"
        hasLearningUnits
      />,
    );
    expect(screen.getByRole("link", { name: "Learning units" })).toHaveAttribute(
      "href",
      "/community/publication-id?tab=learning",
    );
    expect(screen.getByRole("link", { name: "Learning units" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    rerender(
      <CommunityCourseTabs
        publicationId="publication-id"
        activeTab="overview"
        hasLearningUnits={false}
      />,
    );
    expect(screen.queryByRole("link", { name: "Learning units" })).toBeNull();
  });
});
