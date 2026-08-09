import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  Clock3,
  MoreHorizontal,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import type { AppCourse, AppEvent } from "@/lib/demo-data";
import { getDashboardData } from "@/lib/data/dashboard";

const colorStyles = {
  ocean: {
    bar: "bg-ocean",
    soft: "bg-ocean/10 text-[#07556a]",
    dot: "bg-ocean",
  },
  orange: {
    bar: "bg-orange",
    soft: "bg-orange/10 text-[#804100]",
    dot: "bg-orange",
  },
  gold: {
    bar: "bg-gold",
    soft: "bg-gold/15 text-[#805b00]",
    dot: "bg-gold",
  },
  navy: {
    bar: "bg-navy",
    soft: "bg-navy/8 text-navy",
    dot: "bg-navy",
  },
} as const;

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courses, events } = await getDashboardData(viewer);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Fall 2026"
        title={`Good morning, ${viewer.displayName}.`}
        description="Here’s what deserves your attention across the semester."
        actions={
          <Button asChild className="h-10 px-4 shadow-sm">
            <Link href="/courses/new">
              <CirclePlus className="size-4" /> Add course
            </Link>
          </Button>
        }
      />

      {courses.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          <section
            className="mt-8 grid gap-3 sm:grid-cols-3"
            aria-label="Semester summary"
          >
            <SummaryCard
              icon={<BookOpen />}
              label="Active courses"
              value={String(courses.length)}
              detail="All synced to this workspace"
            />
            <SummaryCard
              icon={<CalendarClock />}
              label="Next deadline"
              value={events[0]?.displayDate ?? "Nothing due"}
              detail={events[0]?.title ?? "Your calendar is clear"}
            />
            <SummaryCard
              icon={<CircleAlert />}
              label="Needs review"
              value={String(
                courses.reduce(
                  (sum, course) => sum + course.unresolvedCount,
                  0,
                ),
              )}
              detail="Resolve before trusting the plan"
              tone="warning"
            />
          </section>

          <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-navy text-lg font-extrabold tracking-[-0.025em]">
                    Your courses
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Progress, next dates, and open questions at a glance.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground"
                >
                  <Link href="/calendar">
                    Semester calendar <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-navy text-lg font-extrabold tracking-[-0.025em]">
                    Coming up
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Next five confirmed items.
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open calendar"
                >
                  <Link href="/calendar">
                    <CalendarDays className="size-4" />
                  </Link>
                </Button>
              </div>
              <Card className="gap-0 overflow-hidden py-0 shadow-[0_6px_22px_rgba(2,48,71,0.045)]">
                <CardContent className="p-0">
                  {events.length > 0 ? (
                    events.map((event, index) => (
                      <UpcomingEvent
                        key={event.id}
                        event={event}
                        last={index === events.length - 1}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <CircleCheck className="text-ocean mx-auto size-6" />
                      <p className="text-navy mt-3 text-sm font-bold">
                        Nothing confirmed yet
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Reviewed dates will show up here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="border-sky/45 bg-sky/12 mt-4 rounded-xl border p-4">
                <div className="flex gap-3">
                  <span className="text-ocean grid size-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
                    <Clock3 className="size-4" />
                  </span>
                  <div>
                    <p className="text-navy text-xs font-bold">
                      Week looks manageable
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#48616d]">
                      Two deadlines and one studio critique across your active
                      courses.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="gap-0 py-0 shadow-[0_4px_18px_rgba(2,48,71,0.035)]">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <span
          className={
            tone === "warning"
              ? "bg-gold/15 grid size-10 shrink-0 place-items-center rounded-xl text-[#8a5a00] [&_svg]:size-4.5"
              : "bg-sky/20 text-ocean grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-4.5"
          }
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-bold tracking-[0.09em] uppercase">
            {label}
          </p>
          <p className="text-navy mt-0.5 truncate text-lg font-extrabold tracking-[-0.025em]">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
            {detail}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseCard({ course }: { course: AppCourse }) {
  const style = colorStyles[course.color];
  return (
    <Card className="group relative gap-0 overflow-hidden py-0 shadow-[0_6px_22px_rgba(2,48,71,0.045)] transition-transform hover:-translate-y-0.5">
      <div className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${style.soft} border-transparent font-mono text-[10px]`}
              >
                {course.code}
              </Badge>
              {course.unresolvedCount > 0 ? (
                <Badge className="bg-gold/15 border-0 text-[9px] text-[#805b00] shadow-none">
                  <CircleAlert className="mr-1 size-3" />{" "}
                  {course.unresolvedCount} review
                </Badge>
              ) : null}
            </div>
            <Link
              href={
                course.status === "draft"
                  ? `/courses/${course.id}/review`
                  : `/courses/${course.id}`
              }
              className="focus-visible:outline-ocean mt-3 block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <h3 className="text-navy group-hover:text-ocean line-clamp-2 min-h-11 text-base leading-[1.35] font-extrabold tracking-[-0.025em]">
                {course.title}
              </h3>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground -mt-1 -mr-1"
            aria-label={`More options for ${course.code}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
        <div className="border-border mt-5 grid grid-cols-2 gap-3 border-t pt-4">
          <div>
            <p className="text-muted-foreground text-[9px] font-bold tracking-[0.09em] uppercase">
              Next up
            </p>
            <p className="text-navy mt-1 truncate text-xs font-bold">
              {course.nextEvent ?? "No confirmed dates"}
            </p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {course.nextEventDate ?? "—"}
            </p>
          </div>
          <div className="border-border border-l pl-3">
            <p className="text-muted-foreground text-[9px] font-bold tracking-[0.09em] uppercase">
              Current grade
            </p>
            {course.currentGrade != null ? (
              <>
                <p className="text-navy mt-0.5 font-mono text-lg font-extrabold">
                  {course.currentGrade.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Based on {course.representedWeight}%
                </p>
              </>
            ) : (
              <>
                <p className="text-navy mt-1 text-xs font-bold">
                  No grades yet
                </p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Ready when you are
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingEvent({ event, last }: { event: AppEvent; last: boolean }) {
  const style = colorStyles[event.courseColor];
  const highPriority =
    event.type === "exam" ||
    event.type === "deadline" ||
    event.type === "project";
  return (
    <Link
      href={`/courses/${event.courseId}/calendar`}
      className={`hover:bg-muted/55 flex gap-3 p-4 transition-colors ${last ? "" : "border-border border-b"}`}
    >
      <span className="w-11 shrink-0 text-center">
        <span className="text-muted-foreground block text-[9px] font-bold tracking-[0.08em] uppercase">
          {event.displayDate.split(",")[0]}
        </span>
        <span className="text-navy mt-0.5 block font-mono text-lg font-extrabold">
          {event.date.slice(-2).replace(/^0/, "")}
        </span>
      </span>
      <span
        className={`mt-1 h-8 w-1 shrink-0 rounded-full ${highPriority ? "bg-orange" : style.dot}`}
      />
      <span className="min-w-0 flex-1">
        <span className="text-navy block truncate text-xs font-bold">
          {event.title}
        </span>
        <span className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[10px]">
          <span className={`size-1.5 rounded-full ${style.dot}`} />{" "}
          {event.courseCode}
          {event.time ? <> · {event.time}</> : <> · All day</>}
        </span>
      </span>
    </Link>
  );
}

function EmptyDashboard() {
  return (
    <div className="border-ocean/35 mt-10 grid min-h-[430px] place-items-center rounded-2xl border border-dashed bg-white/70 p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-sky/20 text-ocean mx-auto grid size-14 place-items-center rounded-2xl">
          <BookOpen className="size-6" />
        </span>
        <h2 className="text-navy mt-5 text-xl font-extrabold tracking-[-0.03em]">
          Start with a syllabus
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Upload one course PDF. You’ll verify the important details before we
          build the workspace.
        </p>
        <Button asChild className="mt-6 h-10">
          <Link href="/courses/new">
            <CirclePlus className="size-4" /> Add your first course
          </Link>
        </Button>
      </div>
    </div>
  );
}
