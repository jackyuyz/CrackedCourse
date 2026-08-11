import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpenCheck,
  BookOpenText,
  Download,
  FileText,
  Mail,
  School,
  ShieldCheck,
  ThumbsUp,
  Users,
} from "lucide-react";

import { CommunityActions } from "@/components/community-actions";
import { SafeMarkdown } from "@/components/safe-markdown";
import { CalendarWorkspace } from "@/components/calendar-workspace";
import {
  CommunityCourseTabs,
  type CommunityCourseTab,
} from "@/components/community-course-tabs";
import { CommunityGradeCalculator } from "@/components/community-grade-calculator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { buildCommunityCalendarData } from "@/lib/community-calendar";
import { getCommunityPublication } from "@/lib/data/community";
import { institutionLocation } from "@/lib/institutions";

export const metadata: Metadata = { title: "Community course" };

function communityTab(
  value: string | string[] | undefined,
): CommunityCourseTab {
  return value === "calendar" || value === "grades" || value === "notes"
    ? value
    : "overview";
}

export default async function CommunityPublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicationId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [viewer, { publicationId }, resolvedSearchParams] = await Promise.all([
    getViewer(),
    params,
    searchParams,
  ]);
  if (!viewer) return null;
  const activeTab = communityTab(resolvedSearchParams.tab);
  const publication = await getCommunityPublication(viewer, publicationId);
  if (!publication) notFound();
  const visibleTab =
    activeTab === "notes" && publication.learningUnits.length === 0
      ? "overview"
      : activeTab;

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-ocean/10 text-ocean border-0 font-mono shadow-none">
              {publication.courseCode}
            </Badge>
            <Badge className="bg-navy/8 text-navy border-0 shadow-none">
              <BookOpenCheck className="size-3.5" /> Community copy
            </Badge>
            <Badge variant="outline" className="bg-white">
              <School className="size-3.5" /> {publication.institution.name}
            </Badge>
            <Badge variant="outline" className="bg-white">
              <ThumbsUp className="size-3.5" /> {publication.endorsementCount}
            </Badge>
          </div>
          <h1 className="text-navy mt-4 max-w-3xl text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
            {publication.courseTitle}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {[publication.section, publication.termName]
              .filter(Boolean)
              .join(" · ") || "Term not specified"}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {institutionLocation(publication.institution)} · Shared by{" "}
            {publication.contributorName} · Snapshot v{publication.version}
          </p>
          <p className="text-ocean mt-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase">
            <ShieldCheck className="size-3.5" /> Read-only shared snapshot
          </p>
        </div>
        <CommunityActions
          publicationId={publication.id}
          isOwner={publication.ownerId === viewer.id}
          endorsed={publication.endorsedByViewer}
        />
      </div>

      <div className="mt-7">
        <CommunityCourseTabs
          publicationId={publication.id}
          activeTab={visibleTab}
          hasStudyNotes={publication.learningUnits.length > 0}
        />
      </div>

      {visibleTab === "overview" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="gap-0 py-0">
            <CardHeader className="border-border border-b px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <Users className="text-ocean size-4" /> Course staff
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              {publication.people.length > 0 ? (
                publication.people.map((person) => (
                  <div
                    key={`${person.name}-${person.role}`}
                    className="border-border rounded-xl border p-4"
                  >
                    <p className="text-navy text-sm font-bold">{person.name}</p>
                    <p className="text-ocean mt-1 text-[10px] font-semibold capitalize">
                      {person.role.replaceAll("_", " ")}
                    </p>
                    {person.email ? (
                      <a
                        href={`mailto:${person.email}`}
                        className="text-muted-foreground hover:text-ocean mt-3 flex items-center gap-1.5 text-xs transition-colors"
                      >
                        <Mail className="size-3.5" /> {person.email}
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No course staff were published.
                </p>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-5">
            <div className="border-ocean/20 bg-ocean/6 text-navy flex gap-3 rounded-xl border p-4 text-xs leading-5">
              <ShieldCheck className="text-ocean mt-0.5 size-4 shrink-0" />
              <p>
                This is a read-only community snapshot. Import it to create a
                private workspace you can edit.
              </p>
            </div>
            <Card className="gap-0 py-0">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="bg-sky/25 text-ocean grid size-10 shrink-0 place-items-center rounded-xl">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-navy truncate text-sm font-bold">
                      {publication.sourceOriginalName}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {publication.pageCount ?? "—"} pages · Original PDF
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link
                    href={`/api/community/${publication.id}/pdf`}
                    target="_blank"
                  >
                    <Download className="size-4" /> Open PDF
                  </Link>
                </Button>
                <p className="text-muted-foreground mt-3 flex gap-2 text-[10px] leading-4">
                  <ShieldCheck className="text-ocean mt-0.5 size-3.5 shrink-0" />
                  Available only to signed-in community members through a
                  short-lived private link.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : null}

      {visibleTab === "calendar" ? (
        <CalendarWorkspace
          {...buildCommunityCalendarData(publication)}
          courseId={publication.id}
          demo={false}
          allowExport={false}
        />
      ) : null}

      {visibleTab === "grades" ? (
        <CommunityGradeCalculator
          publicationId={publication.id}
          categories={publication.categories}
          policies={publication.policies}
        />
      ) : null}

      {visibleTab === "notes" && publication.learningUnits.length > 0 ? (
        <section className="mt-8 space-y-5">
          <div>
            <p className="text-ocean text-[10px] font-bold tracking-[0.13em] uppercase">
              Community study notes
            </p>
            <h2 className="text-navy mt-2 text-xl font-extrabold tracking-[-0.03em]">
              Shared learning units
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              These notes are read-only and reflect snapshot v{publication.version}.
            </p>
          </div>
          {publication.learningUnits.map((unit) => (
            <Card key={`${unit.displayOrder}-${unit.title}`} className="gap-0 py-0">
              <CardHeader className="border-border border-b px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-extrabold">
                  <BookOpenText className="text-ocean size-4" /> {unit.title}
                </CardTitle>
                {unit.description ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {unit.description}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="p-5">
                <SafeMarkdown markdown={unit.noteMarkdown} />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </main>
  );
}
