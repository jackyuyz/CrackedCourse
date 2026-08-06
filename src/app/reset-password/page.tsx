import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your CrackedCourse account.",
};

export default async function ResetPasswordPage() {
  if (!hasSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    redirect("/login?authError=session_missing");
  }

  return (
    <main className="editorial-grid min-h-screen overflow-hidden">
      <header className="mx-auto flex h-20 max-w-[960px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:outline-ocean rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label="CrackedCourse home"
        >
          <BrandMark />
        </Link>
        <Button asChild variant="ghost" className="text-navy/70">
          <Link href="/login">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[960px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_430px] lg:gap-20 lg:py-16">
        <div className="max-w-[470px]">
          <span className="bg-ocean/12 text-ocean grid size-12 place-items-center rounded-2xl">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-navy mt-6 text-[clamp(2.4rem,5vw,4rem)] leading-[1] font-extrabold tracking-[-0.055em] text-balance">
            Secure your account with a new password.
          </h1>
          <p className="text-navy/68 mt-5 text-base leading-7">
            After saving, you’ll go straight to your workspace. Use this new
            password for every future sign-in.
          </p>
        </div>

        <ResetPasswordForm />
      </section>
    </main>
  );
}
