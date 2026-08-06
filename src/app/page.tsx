import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/callback";
import { hasSupabaseEnv, isDemoMode } from "@/lib/env";

export const metadata: Metadata = {
  title: "Crack the syllabus. Control the semester.",
};

type HomePageProps = {
  searchParams: Promise<{ signIn?: string; authError?: string }>;
};

const principles = [
  {
    icon: FileCheck2,
    title: "Evidence, not guesses",
    body: "Every extracted date and grade weight stays tied to the page it came from.",
  },
  {
    icon: CalendarDays,
    title: "A calendar you can use",
    body: "Confirmed deadlines become a clear semester view and a portable .ics file.",
  },
  {
    icon: GraduationCap,
    title: "Your actual grade math",
    body: "Track the weighted categories in this course—not a generic GPA formula.",
  },
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const query = await searchParams;
  const configured = hasSupabaseEnv();
  const demoEnabled = isDemoMode();

  return (
    <main className="editorial-grid min-h-screen overflow-hidden">
      <header className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:outline-ocean rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandMark />
        </Link>
        <nav
          className="flex items-center gap-2"
          aria-label="Primary navigation"
        >
          <a
            href="#how-it-works"
            className="text-navy/70 hover:text-navy hidden rounded-lg px-3 py-2 text-sm font-semibold sm:block"
          >
            How it works
          </a>
          {demoEnabled ? (
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/dashboard">View demo</Link>
            </Button>
          ) : null}
          <Button asChild className="h-10 px-4 shadow-sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pt-14 pb-24 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:pt-20 lg:pb-28">
        <div className="max-w-[650px]">
          <Badge className="border-ocean/20 bg-sky/25 text-ocean mb-6 px-3 py-1.5 shadow-none">
            <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
            Syllabus in. Semester sorted.
          </Badge>
          <h1 className="text-navy text-[clamp(2.8rem,6vw,4.9rem)] leading-[0.96] font-extrabold tracking-[-0.065em] text-balance">
            Crack the syllabus.
            <span className="text-ocean mt-2 block">Control the semester.</span>
          </h1>
          <p className="text-navy/68 mt-7 max-w-[580px] text-lg leading-8 sm:text-xl">
            Turn a static course PDF into a verified calendar, a clear course
            workspace, and grade math you can actually trust.
          </p>
          <div className="text-navy/70 mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            {[
              "Source-backed review",
              "Private by default",
              "No silent guesses",
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="bg-ocean/12 text-ocean grid size-5 place-items-center rounded-full">
                  <Check
                    className="size-3"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                {item}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 px-5 text-[15px] shadow-[0_8px_24px_rgba(33,158,188,0.22)]"
            >
              <Link href="/login">
                Sign in to add a syllabus
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            {demoEnabled ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-5 text-[15px]"
              >
                <Link href="/dashboard">Explore fictional workspace</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
          <div
            className="bg-gold/15 absolute -top-6 -right-4 h-32 w-32 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div
            className="bg-sky/25 absolute -bottom-8 -left-6 h-40 w-40 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div className="border-navy/10 relative overflow-hidden rounded-[22px] border bg-white shadow-[0_30px_90px_rgba(2,48,71,0.14)]">
            <div className="border-border flex items-center justify-between border-b bg-[#f8fbfa] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange/12 text-orange grid size-9 place-items-center rounded-lg">
                  <FileCheck2 className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-navy text-sm font-bold">
                    CHEM 101 · Syllabus review
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    12 of 16 items reviewed
                  </p>
                </div>
              </div>
              <span className="bg-gold/15 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#8a5a00]">
                3 need review
              </span>
            </div>
            <div className="grid sm:grid-cols-[1.12fr_0.88fr]">
              <div className="border-border space-y-3 border-b p-4 sm:border-r sm:border-b-0">
                <p className="text-muted-foreground px-1 text-[11px] font-bold tracking-[0.11em] uppercase">
                  Important dates
                </p>
                <ReviewItem
                  icon={<CheckCircle2 className="size-4" />}
                  title="Midterm exam"
                  detail="Oct 14 · 6:30 PM"
                  state="Confirmed"
                  tone="confirmed"
                />
                <ReviewItem
                  icon={<CircleAlert className="size-4" />}
                  title="Final project due"
                  detail="Dec 8 · time not specified"
                  state="Needs review"
                  tone="review"
                />
                <ReviewItem
                  icon={<CheckCircle2 className="size-4" />}
                  title="Weekly quiz"
                  detail="Fridays · 10:00 AM"
                  state="Confirmed"
                  tone="confirmed"
                />
                <div className="border-border flex items-center justify-between rounded-xl border bg-[#f8fbfa] px-4 py-3.5">
                  <span className="text-navy/75 text-xs font-semibold">
                    Review progress
                  </span>
                  <span className="text-ocean font-mono text-xs font-bold">
                    75%
                  </span>
                </div>
              </div>
              <div className="bg-[#f5f8f7] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px] font-bold tracking-[0.11em] uppercase">
                    Source · page 4
                  </span>
                  <Badge variant="outline" className="bg-white text-[10px]">
                    PDF
                  </Badge>
                </div>
                <div className="border-border rounded-xl border bg-white p-4 shadow-sm">
                  <div className="bg-navy/10 mb-4 h-2 w-2/3 rounded" />
                  <div className="space-y-2">
                    <div className="bg-navy/8 h-1.5 rounded" />
                    <div className="bg-navy/8 h-1.5 w-[92%] rounded" />
                    <div className="border-gold bg-gold/14 text-navy/78 rounded-md border-l-2 px-2.5 py-2 text-[11px] leading-4.5">
                      “The final project is due December 8. Submission details
                      will be announced in class.”
                    </div>
                    <div className="bg-navy/8 h-1.5 w-[84%] rounded" />
                    <div className="bg-navy/8 h-1.5 rounded" />
                  </div>
                </div>
                <div className="text-navy/65 mt-4 flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck
                    className="text-ocean size-4"
                    aria-hidden="true"
                  />
                  Evidence matched in source
                </div>
              </div>
            </div>
          </div>
          <div className="border-navy/10 absolute -right-3 -bottom-5 hidden items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl sm:flex">
            <span className="bg-sky/25 text-ocean grid size-8 place-items-center rounded-lg">
              <Clock3 className="size-4" />
            </span>
            <span>
              <span className="text-navy block text-xs font-bold">Next up</span>
              <span className="text-muted-foreground block text-[11px]">
                Lab report · Tomorrow
              </span>
            </span>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-border border-y bg-white/75">
        <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-ocean text-xs font-bold tracking-[0.14em] uppercase">
              From document to decisions
            </p>
            <h2 className="text-navy mt-3 text-3xl font-extrabold tracking-[-0.04em] text-balance sm:text-4xl">
              The useful parts of your syllabus, with the receipts.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {principles.map((principle, index) => (
              <article
                key={principle.title}
                className="border-border rounded-2xl border bg-white p-6 shadow-[0_6px_22px_rgba(2,48,71,0.05)]"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-sky/22 text-ocean grid size-11 place-items-center rounded-xl">
                    <principle.icon className="size-5" strokeWidth={2.1} />
                  </span>
                  <span className="text-navy/28 font-mono text-xs font-bold">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-navy mt-8 text-lg font-bold tracking-[-0.025em]">
                  {principle.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {principle.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sign-in"
        className="mx-auto grid max-w-[1000px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_430px] lg:items-center"
      >
        <div>
          <Badge variant="outline" className="mb-5 bg-white">
            Private workspace
          </Badge>
          <h2 className="text-navy text-3xl font-extrabold tracking-[-0.045em] text-balance sm:text-4xl">
            Your semester plan starts with one PDF.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-base leading-7">
            We’ll email you a secure sign-in link. Your syllabus stays private,
            and nothing reaches your calendar until you confirm it.
          </p>
        </div>
        <AuthForm
          configured={configured}
          demoEnabled={demoEnabled}
          notice={
            query.signIn === "required"
              ? "Sign in to open your private workspace."
              : undefined
          }
          error={
            query.authError ? authErrorMessage(query.authError) : undefined
          }
        />
      </section>

      <footer className="border-border border-t bg-[#f1f6f5] px-5 py-8 sm:px-8">
        <div className="text-muted-foreground mx-auto flex max-w-[1180px] flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <BrandMark compact />
          <p>Built for clarity. Extraction always requires your review.</p>
        </div>
      </footer>
    </main>
  );
}

function ReviewItem({
  icon,
  title,
  detail,
  state,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  state: string;
  tone: "confirmed" | "review";
}) {
  return (
    <div className="border-border rounded-xl border bg-white p-3.5 shadow-[0_2px_10px_rgba(2,48,71,0.035)]">
      <div className="flex items-start gap-3">
        <span
          className={
            tone === "confirmed" ? "text-ocean mt-0.5" : "text-orange mt-0.5"
          }
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-navy truncate text-[13px] font-bold">{title}</p>
          <p className="text-muted-foreground mt-1 text-[11px]">{detail}</p>
        </div>
        <span
          className={
            tone === "confirmed"
              ? "bg-ocean/10 text-ocean rounded-full px-2 py-1 text-[9px] font-bold"
              : "bg-gold/16 rounded-full px-2 py-1 text-[9px] font-bold text-[#8a5a00]"
          }
        >
          {state}
        </span>
      </div>
    </div>
  );
}
