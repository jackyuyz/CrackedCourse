import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getViewer: vi.fn(),
}));

vi.mock("@/lib/auth/viewer", () => ({
  getViewer: mocks.getViewer,
}));

import SettingsPage from "@/app/(app)/settings/page";

describe("SettingsPage", () => {
  it("shows New York as the fixed primary time zone", async () => {
    mocks.getViewer.mockResolvedValue({
      id: "user-id",
      email: "student@example.edu",
      displayName: "Student",
      isDemo: false,
    });

    render(await SettingsPage());

    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Primary time zone")).toBeDisabled();
    expect(screen.getByLabelText("Primary time zone")).toHaveValue(
      "America/New_York",
    );
    expect(screen.getByText(/Fixed to New York time/)).toBeVisible();
  });
});
