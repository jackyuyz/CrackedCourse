import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileSettingsForm } from "@/components/profile-settings-form";

const navigationMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

describe("ProfileSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the display name and refreshes the workspace", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        profile: { displayName: "Jacky Zheng" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <ProfileSettingsForm
        displayName="jacky2"
        email="jacky2@andrew.cmu.edu"
        primaryTimeZone="America/New_York"
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeDisabled();
    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jacky Zheng");
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Jacky Zheng",
          defaultInstitutionId: null,
        }),
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Profile defaults saved everywhere.",
    );
    expect(navigationMocks.refresh).toHaveBeenCalledOnce();
    expect(saveButton).toBeDisabled();
  });
});
