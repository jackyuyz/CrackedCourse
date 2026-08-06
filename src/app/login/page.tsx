import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, KeyRound, LockKeyhole } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authErrorMessage, safeAuthRedirect } from "@/lib/auth/callback";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your private CrackedCourse workspace.",
};

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string;
    notice?: string;
    next?: string;
  }>;
};

const assurances = [
  "Create one password for repeat sign-ins",
  "Confirm your email only once when required",
  "Your courses stay private to your account",
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const redirectTo = safeAuthRedirect(query.next ?? null);

  return (
    <main className="editorial-grid min-h-screen overflow-hidden">
      <header className="mx-auto flex h-20 max-w-[1080px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:outline-ocean rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label="CrackedCourse home"
        >
          <BrandMark />
        </Link>
        <Button asChild variant="ghost" className="text-navy/70">
          <Link href="/">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
            Back home
          </Link>
        </Button>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1080px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_430px] lg:gap-20 lg:py-16">
        <div className="max-w-[560px]">
          <Badge className="border-ocean/20 bg-sky/25 text-ocean mb-6 px-3 py-1.5 shadow-none">
            <LockKeyhole className="mr-1.5 size-3.5" aria-hidden="true" />
            Secure sign in
          </Badge>
          <h1 className="text-navy text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.98] font-extrabold tracking-[-0.06em] text-balance">
            Sign in to your
            <span className="text-ocean mt-2 block">course workspace.</span>
          </h1>
          <p className="text-navy/68 mt-6 max-w-lg text-lg leading-8">
            Sign in with your email and password, or create an account in a few
            seconds. No new email link is needed for routine sign-ins.
          </p>

          <div className="mt-8 space-y-3">
            {assurances.map((assurance) => (
              <p
                key={assurance}
                className="text-navy/72 flex items-center gap-3 text-sm font-semibold"
              >
                <span className="bg-ocean/12 text-ocean grid size-6 shrink-0 place-items-center rounded-full">
                  <Check
                    className="size-3.5"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                {assurance}
              </p>
            ))}
          </div>

          <div className="border-navy/10 mt-10 hidden max-w-md items-start gap-3 rounded-2xl border bg-white/75 p-4 sm:flex">
            <KeyRound
              className="text-ocean mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-xs leading-5">
              Already used the previous email-link login? Choose “Forgot
              password?” to set a reusable password for that account.
            </p>
          </div>
        </div>

        <div id="sign-in" className="w-full scroll-mt-6">
          <AuthForm
            configured={hasSupabaseEnv()}
            demoEnabled={isDemoMode()}
            redirectTo={redirectTo}
            autoFocus
            notice={
              query.notice === "required"
                ? "Sign in to open your private workspace."
                : undefined
            }
            error={
              query.authError ? authErrorMessage(query.authError) : undefined
            }
          />
        </div>
      </section>
    </main>
  );
}
