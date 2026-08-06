export type PasswordAuthAction =
  "signIn" | "signUp" | "recovery" | "updatePassword";

export function passwordAuthErrorMessage(
  code: string | undefined,
  action: PasswordAuthAction,
) {
  switch (code) {
    case "invalid_credentials":
      return "Incorrect email or password. Try again or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email once using the registration email, then sign in with your password.";
    case "user_already_exists":
    case "email_exists":
    case "user_already_registered":
      return "An account already exists for this email. Sign in or reset your password.";
    case "weak_password":
      return "Choose a stronger password with at least 8 characters.";
    case "same_password":
      return "Choose a password you have not used for this account.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    case "session_not_found":
      return "This password-reset session has expired. Request a new reset email.";
  }

  switch (action) {
    case "signIn":
      return "We couldn’t sign you in. Check your details and try again.";
    case "signUp":
      return "We couldn’t create your account. Check your details and try again.";
    case "recovery":
      return "We couldn’t send the reset email. Check the address and try again.";
    case "updatePassword":
      return "We couldn’t update your password. Request a new reset email and try again.";
  }
}
