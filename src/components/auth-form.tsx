"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InstitutionCombobox } from "@/components/institution-combobox";
import { Label } from "@/components/ui/label";
import { passwordAuthErrorMessage } from "@/lib/auth/messages";
import type { InstitutionOption } from "@/lib/institutions";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signIn" | "signUp" | "recovery";
type AuthStatus = "idle" | "submitting" | "emailSent";

export function AuthForm({
  configured,
  demoEnabled,
  notice,
  error,
  redirectTo = "/dashboard",
  autoFocus = false,
}: {
  configured: boolean;
  demoEnabled: boolean;
  notice?: string;
  error?: string;
  redirectTo?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState<InstitutionOption | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [showProvidedError, setShowProvidedError] = useState(Boolean(error));

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStatus("idle");
    setFormError(null);
    setShowProvidedError(false);
    setPassword("");
    setPasswordConfirmation("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    const signupInstitutionId = institution?.id;
    if (mode === "signUp" && password !== passwordConfirmation) {
      setFormError("Passwords do not match.");
      return;
    }
    if (mode === "signUp" && !signupInstitutionId) {
      setFormError("Choose your school from the U.S. or Canadian directory.");
      return;
    }

    setStatus("submitting");
    setFormError(null);
    setShowProvidedError(false);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim();

      if (mode === "recovery") {
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", "/reset-password");
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo: callbackUrl.toString() },
        );

        if (authError) {
          setStatus("idle");
          setFormError(passwordAuthErrorMessage(authError.code, "recovery"));
          return;
        }

        setStatus("emailSent");
        return;
      }

      if (mode === "signUp") {
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", redirectTo);
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: callbackUrl.toString(),
            data: { default_institution_id: signupInstitutionId },
          },
        });

        if (authError) {
          setStatus("idle");
          setFormError(passwordAuthErrorMessage(authError.code, "signUp"));
          return;
        }

        if (data.session) {
          router.replace(redirectTo);
          router.refresh();
          return;
        }

        setStatus("emailSent");
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: normalizedEmail,
          password,
        },
      );

      if (authError || !data.session) {
        setStatus("idle");
        setFormError(passwordAuthErrorMessage(authError?.code, "signIn"));
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setStatus("idle");
      setFormError(
        "We couldn’t reach the authentication service. Check your connection and try again.",
      );
    }
  }

  const title =
    status === "emailSent"
      ? "Check your inbox"
      : mode === "signUp"
        ? "Create your account"
        : mode === "recovery"
          ? "Reset your password"
          : "Sign in to your workspace";

  return (
    <Card className="border-navy/10 overflow-visible bg-white shadow-[0_18px_55px_rgba(2,48,71,0.1)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-navy text-xl font-extrabold tracking-[-0.03em]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notice ? (
          <Alert className="border-sky/60 bg-sky/15 text-navy mb-4">
            <ShieldCheck className="text-ocean size-4" />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {(showProvidedError ? error : null) || formError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {(showProvidedError ? error : null) ?? formError}
            </AlertDescription>
          </Alert>
        ) : null}

        {status === "emailSent" ? (
          <div className="py-4">
            <span className="bg-ocean/10 text-ocean grid size-12 place-items-center rounded-full">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="text-muted-foreground mt-5 text-sm leading-6">
              {mode === "recovery"
                ? "We sent a password-reset link to "
                : "We sent a one-time confirmation link to "}
              <strong className="text-navy font-semibold">{email}</strong>
              {mode === "recovery"
                ? ". Open it in this browser to choose a new password."
                : ". Confirm your email once in this browser, then use your password for future sign-ins. If you already have an account, sign in or reset its password."}
            </p>
            <Button
              variant="outline"
              className="mt-5 h-10"
              onClick={() => changeMode("signIn")}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            {mode !== "recovery" ? (
              <div
                className="bg-muted mb-5 grid grid-cols-2 rounded-xl p-1"
                aria-label="Authentication mode"
              >
                <Button
                  type="button"
                  aria-pressed={mode === "signIn"}
                  variant={mode === "signIn" ? "outline" : "ghost"}
                  className={
                    mode === "signIn"
                      ? "bg-white shadow-sm hover:bg-white"
                      : "text-muted-foreground"
                  }
                  onClick={() => changeMode("signIn")}
                >
                  Sign in
                </Button>
                <Button
                  type="button"
                  aria-pressed={mode === "signUp"}
                  variant={mode === "signUp" ? "outline" : "ghost"}
                  className={
                    mode === "signUp"
                      ? "bg-white shadow-sm hover:bg-white"
                      : "text-muted-foreground"
                  }
                  onClick={() => changeMode("signUp")}
                >
                  Create account
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground mb-3 -ml-3 h-8"
                onClick={() => changeMode("signIn")}
              >
                <ArrowLeft className="size-4" />
                Back to sign in
              </Button>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">School or personal email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.edu"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 pl-10"
                    autoFocus={autoFocus}
                    disabled={!configured || status === "submitting"}
                  />
                </div>
              </div>

              {mode === "signUp" ? (
                <div className="space-y-2">
                  <Label htmlFor="signup-institution">School</Label>
                  <InstitutionCombobox
                    inputId="signup-institution"
                    value={institution}
                    onChange={(nextInstitution) => {
                      setInstitution(nextInstitution);
                      setFormError(null);
                    }}
                    disabled={!configured || status === "submitting"}
                    required
                    inputClassName="h-11"
                  />
                  <p className="text-muted-foreground text-[11px] leading-5">
                    Used as the default for new courses. You can change it later
                    in Settings.
                  </p>
                </div>
              ) : null}

              {mode !== "recovery" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signIn" ? (
                      <button
                        type="button"
                        className="text-ocean text-xs font-semibold hover:underline"
                        onClick={() => changeMode("recovery")}
                      >
                        Forgot password?
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete={
                        mode === "signUp" ? "new-password" : "current-password"
                      }
                      required
                      minLength={mode === "signUp" ? 8 : undefined}
                      placeholder={
                        mode === "signUp"
                          ? "At least 8 characters"
                          : "Your password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 pl-10"
                      disabled={!configured || status === "submitting"}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs leading-5">
                  We’ll email you a one-time link to choose a new password.
                </p>
              )}

              {mode === "signUp" ? (
                <div className="space-y-2">
                  <Label htmlFor="password-confirmation">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="password-confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="Enter the same password again"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      className="h-11 pl-10"
                      disabled={!configured || status === "submitting"}
                    />
                  </div>
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!configured || status === "submitting"}
              >
                {status === "submitting"
                  ? mode === "signIn"
                    ? "Signing in…"
                    : mode === "signUp"
                      ? "Creating account…"
                      : "Sending reset email…"
                  : mode === "signIn"
                    ? "Sign in"
                    : mode === "signUp"
                      ? "Create account"
                      : "Send reset email"}
                {status !== "submitting" ? (
                  <ArrowRight className="ml-1 size-4" />
                ) : null}
              </Button>
            </form>
          </>
        )}

        {!configured ? (
          <div className="border-gold/35 bg-gold/10 mt-4 rounded-xl border p-3 text-xs leading-5 text-[#725200]">
            Supabase isn’t linked to this local environment yet.
            {demoEnabled ? (
              <Link
                href="/dashboard"
                className="ml-1 font-bold underline underline-offset-2"
              >
                Open the fictional demo instead.
              </Link>
            ) : null}
          </div>
        ) : null}
        <p className="text-muted-foreground mt-4 text-center text-[11px] leading-5">
          {mode === "signUp"
            ? "You may need to confirm your email once after registration."
            : mode === "recovery"
              ? "Reset links expire and can only be used once."
              : "Use the password you created when you registered."}
        </p>
      </CardContent>
    </Card>
  );
}
