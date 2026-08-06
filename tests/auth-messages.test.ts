import { describe, expect, it } from "vitest";

import { passwordAuthErrorMessage } from "@/lib/auth/messages";

describe("password auth messages", () => {
  it("explains that email confirmation is a one-time registration step", () => {
    expect(passwordAuthErrorMessage("email_not_confirmed", "signIn")).toBe(
      "Confirm your email once using the registration email, then sign in with your password.",
    );
  });

  it("does not reveal whether an unknown email exists", () => {
    expect(passwordAuthErrorMessage("invalid_credentials", "signIn")).toBe(
      "Incorrect email or password. Try again or reset your password.",
    );
  });

  it("returns an action-specific fallback", () => {
    expect(passwordAuthErrorMessage("unexpected", "signUp")).toContain(
      "create your account",
    );
  });
});
