import type { EmailOtpType } from "@supabase/supabase-js";

const supportedOtpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function safeAuthRedirect(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return value && supportedOtpTypes.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

export function authErrorMessage(code?: string) {
  switch (code) {
    case "otp_expired":
      return "That sign-in link has expired or was already used. Request a new one below.";
    case "access_denied":
      return "That sign-in link could not be verified. Request a new one below.";
    case "session_missing":
      return "Your email was verified, but the browser session could not be saved. Request a new link in this browser.";
    default:
      return "That sign-in link is invalid or expired. Request a new one below.";
  }
}
