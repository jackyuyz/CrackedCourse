import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Users,
} from "lucide-react";

import { PolicyNotes } from "@/components/policy-notes";
import { InstructorExternalReference } from "@/components/instructor-external-reference";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { getCourseOverview } from "@/lib/data/course";

export const metadata: Metadata = { title: "Course overview" };

type PageProps = { params: Promise<{ courseId: string }> };

export default async function CoursePage({ params }: PageProps) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getCourseOverview(viewer, courseId);
  if (!data) notFound();
  const { course } = data;

  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-navy text-base font-extrabold tracking-[-0.025em]">
              Next important dates
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link href={`/courses/${course.id}/calendar`}>
                Full calendar <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <Card className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]">
            <CardContent className="p-0">
              {data.nextEvents.length > 0 ? (
                data.nextEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-4 p-4 sm:p-5 ${index < data.nextEvents.length - 1 ? "border-border border-b" : ""}`}
                  >
                    <span
                      className={
                        event.type === "exam" || event.type === "project"
                          ? "bg-orange/10 text-orange grid size-10 shrink-0 place-items-center rounded-xl"
                          : "bg-ocean/10 text-ocean grid size-10 shrink-0 place-items-center rounded-xl"
                      }
                    >
                      <CalendarDays className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-navy truncate text-sm font-extrabold">
                        {event.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {event.displayDate}
                        {event.time ? ` · ${event.time}` : " · All day"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="hidden bg-white text-[9px] sm:inline-flex"
                    >
                      {event.type.replace("_", " ")}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground p-8 text-center text-sm">
                  No confirmed dates yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="text-ocean size-4" />
            <h2 className="text-navy text-base font-extrabold tracking-[-0.025em]">
              People & office hours
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.people.length > 0 ? (
              data.people.map((person) => (
                <Card
                  key={`${person.name}-${person.email}`}
                  className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="bg-navy grid size-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white">
                        {person.name
                          .split(" ")
                          .slice(-2)
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-navy text-sm font-extrabold">
                          {person.name}
                        </p>
                        <p className="text-ocean mt-0.5 text-[10px] font-semibold">
                          {person.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-muted-foreground mt-4 space-y-2 text-xs">
                      {person.email ? (
                        <p className="flex items-center gap-2">
                          <Mail className="size-3.5" /> {person.email}
                        </p>
                      ) : null}
                      {person.office ? (
                        <p className="flex items-center gap-2">
                          <MapPin className="size-3.5" /> {person.office}
                        </p>
                      ) : null}
                      {person.officeHours ? (
                        <p className="flex items-center gap-2">
                          <Clock3 className="size-3.5" /> {person.officeHours}
                        </p>
                      ) : null}
                    </div>
                    {person.isInstructor ? (
                      <InstructorExternalReference
                        instructorName={person.name}
                        institutionName={data.institutionName}
                        externalProfileUrl={person.externalProfileUrl}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No course staff confirmed.
              </p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <Card className="gap-0 py-0 shadow-[0_5px_20px_rgba(2,48,71,0.04)]">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
              <GraduationCap className="text-ocean size-4" /> Grading structure
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3">
              {data.gradingCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-navy/75 font-semibold">
                      {category.name}
                    </span>
                    <span className="text-navy font-mono font-bold">
                      {category.weightPercent}%
                    </span>
                  </div>
                  <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-ocean h-full rounded-full"
                      style={{ width: `${category.weightPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-5 h-9 w-full">
              <Link href={`/courses/${course.id}/grades`}>
                Open grade calculator <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {data.source ? (
          <Card className="gap-0 py-0 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="bg-sky/22 text-ocean grid size-9 place-items-center rounded-xl">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-navy truncate text-xs font-bold">
                    {data.source.originalName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {data.source.pageCount ?? "—"} pages · Imported{" "}
                    {data.source.importedAt}
                  </p>
                </div>
              </div>
              <div className="bg-ocean/8 text-ocean mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold">
                <CircleCheck className="size-3.5" /> {data.source.status}
              </div>
              {viewer.isDemo ? (
                <Button disabled variant="outline" className="mt-3 w-full">
                  <ExternalLink className="size-4" /> Preview unavailable in demo
                </Button>
              ) : (
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link
                    href={`/api/courses/${course.id}/pdf?sourceId=${data.source.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" /> Preview PDF
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        <PolicyNotes policies={data.policyWarnings} />
      </aside>
    </div>
  );
}
