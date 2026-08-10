import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "@/components/auth-form";

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: authMocks }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            institutions: [
              {
                id: "00000000-0000-4000-8000-000000000100",
                name: "Carnegie Mellon University",
                city: "Pittsburgh",
                region: "PA",
                country: "US",
                timeZone: "America/New_York",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    authMocks.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("signs existing users in with their email and password", async () => {
    const user = userEvent.setup();
    render(<AuthForm configured demoEnabled={false} />);

    await user.type(screen.getByLabelText(/email/i), " student@example.edu ");
    await user.type(screen.getByLabelText(/^password$/i), "saved-password");
    await user.click(screen.getAllByRole("button", { name: /^sign in$/i })[1]);

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: "student@example.edu",
        password: "saved-password",
      });
    });
    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(routerMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(routerMocks.refresh).toHaveBeenCalledOnce();
  });

  it("registers new users with a reusable password", async () => {
    const user = userEvent.setup();
    render(
      <AuthForm configured demoEnabled={false} redirectTo="/courses/new" />,
    );

    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[0],
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.edu");
    await user.type(screen.getByLabelText(/^school$/i), "Carnegie");
    await user.click(
      await screen.findByRole("option", {
        name: /Carnegie Mellon University/i,
      }),
    );
    await user.type(screen.getByLabelText(/^password$/i), "strong-pass-123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "strong-pass-123",
    );
    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[1],
    );

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: "new@example.edu",
        password: "strong-pass-123",
        options: {
          emailRedirectTo:
            "http://localhost:3000/auth/callback?next=%2Fcourses%2Fnew",
          data: {
            default_institution_id: "00000000-0000-4000-8000-000000000100",
          },
        },
      });
    });
    expect(
      await screen.findByText(/We sent a one-time confirmation link/i),
    ).toBeVisible();
  });

  it("requires a directory school when creating an account", async () => {
    const user = userEvent.setup();
    render(<AuthForm configured demoEnabled={false} />);

    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[0],
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.edu");
    await user.type(screen.getByLabelText(/^password$/i), "strong-pass-123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "strong-pass-123",
    );
    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[1],
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose your school from the U.S. or Canadian directory",
    );
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("does not register when the password confirmation differs", async () => {
    const user = userEvent.setup();
    render(<AuthForm configured demoEnabled={false} />);

    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[0],
    );
    await user.type(screen.getByLabelText(/email/i), "new@example.edu");
    await user.type(screen.getByLabelText(/^password$/i), "strong-pass-123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "different-pass-123",
    );
    await user.click(
      screen.getAllByRole("button", { name: /create account/i })[1],
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("sends password recovery to the reset-password callback", async () => {
    const user = userEvent.setup();
    render(<AuthForm configured demoEnabled={false} />);

    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/email/i), "student@example.edu");
    await user.click(screen.getByRole("button", { name: /send reset email/i }));

    await waitFor(() => {
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "student@example.edu",
        {
          redirectTo:
            "http://localhost:3000/auth/callback?next=%2Freset-password",
        },
      );
    });
    expect(await screen.findByText(/password-reset link/i)).toBeVisible();
  });
});
