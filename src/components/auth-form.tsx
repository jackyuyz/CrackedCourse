"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setStatus("sending");
    setFormError(null);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectTo);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (authError) {
      setStatus("idle");
      setFormError(
        "We couldn’t send the link. Check the address and try again.",
      );
      return;
    }

    setStatus("sent");
  }

  return (
    <Card className="border-navy/10 bg-white shadow-[0_18px_55px_rgba(2,48,71,0.1)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-navy text-xl font-extrabold tracking-[-0.03em]">
          {status === "sent" ? "Check your inbox" : "Open your workspace"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notice ? (
          <Alert className="border-sky/60 bg-sky/15 text-navy mb-4">
            <ShieldCheck className="text-ocean size-4" />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error || formError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error ?? formError}</AlertDescription>
          </Alert>
        ) : null}

        {status === "sent" ? (
          <div className="py-4">
            <span className="bg-ocean/10 text-ocean grid size-12 place-items-center rounded-full">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="text-muted-foreground mt-5 text-sm leading-6">
              We sent a secure, one-time link to{" "}
              <strong className="text-navy font-semibold">{email}</strong>.
            </p>
            <Button
              variant="outline"
              className="mt-5 h-10"
              onClick={() => setStatus("idle")}
            >
              Use a different email
            </Button>
          </div>
        ) : (
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
                  disabled={!configured || status === "sending"}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={!configured || status === "sending"}
            >
              {status === "sending"
                ? "Sending secure link…"
                : "Email me a sign-in link"}
              {status !== "sending" ? (
                <ArrowRight className="ml-1 size-4" />
              ) : null}
            </Button>
          </form>
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
          No password. The link expires shortly and can be used once.
        </p>
      </CardContent>
    </Card>
  );
}
