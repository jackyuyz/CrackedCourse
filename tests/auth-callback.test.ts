import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  parseEmailOtpType,
  safeAuthRedirect,
} from "@/lib/auth/callback";

describe("auth callback safety", () => {
  it("allows only local redirect paths", () => {
    expect(safeAuthRedirect("/courses/new")).toBe("/courses/new");
    expect(safeAuthRedirect("//attacker.example/path")).toBe("/dashboard");
    expect(safeAuthRedirect("https://attacker.example")).toBe("/dashboard");
    expect(safeAuthRedirect(null)).toBe("/dashboard");
  });

  it("accepts documented email OTP types only", () => {
    expect(parseEmailOtpType("magiclink")).toBe("magiclink");
    expect(parseEmailOtpType("email")).toBe("email");
    expect(parseEmailOtpType("unknown")).toBeNull();
    expect(parseEmailOtpType(null)).toBeNull();
  });

  it("provides a visible recovery message for failed sessions", () => {
    expect(authErrorMessage("session_missing")).toContain(
      "browser session could not be saved",
    );
    expect(authErrorMessage("otp_expired")).toContain("already used");
  });
});
