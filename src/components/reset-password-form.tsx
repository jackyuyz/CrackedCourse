"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordAuthErrorMessage } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setSubmitting(false);
        setFormError(passwordAuthErrorMessage(error.code, "updatePassword"));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setSubmitting(false);
      setFormError(
        "We couldn’t reach the authentication service. Check your connection and try again.",
      );
    }
  }

  return (
    <Card className="border-navy/10 bg-white shadow-[0_18px_55px_rgba(2,48,71,0.1)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-navy text-xl font-extrabold tracking-[-0.03em]">
          Choose a new password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 pl-10"
                autoFocus
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password-confirmation">
              Confirm new password
            </Label>
            <div className="relative">
              <ShieldCheck className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="new-password-confirmation"
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
                disabled={submitting}
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting ? "Updating password…" : "Save new password"}
            {!submitting ? <ArrowRight className="ml-1 size-4" /> : null}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
