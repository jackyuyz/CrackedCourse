import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  School,
  ShieldCheck,
  ThumbsUp,
  Users,
} from "lucide-react";

import { CommunityActions } from "@/components/community-actions";
import { PolicyNotes } from "@/components/policy-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import { getCommunityPublication } from "@/lib/data/community";
import { institutionLocation } from "@/lib/institutions";

export const metadata: Metadata = { title: "Community course" };

function eventDate(event: {
  starts_at: string | null;
  start_date: string | null;
}) {
  const value = event.starts_at ?? event.start_date;
  if (!value) return "Date not specified";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(event.starts_at
      ? { hour: "numeric" as const, minute: "2-digit" as const }
      : {}),
  }).format(new Date(event.start_date ? `${event.start_date}T12:00:00Z` : value));
}

export default async function CommunityPublicationPage({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { publicationId } = await params;
  const publication = await getCommunityPublication(viewer, publicationId);
  if (!publication) notFound();

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-ocean/10 text-ocean border-0 font-mono shadow-none">
              {publication.courseCode}
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
        </div>
        <CommunityActions
          publicationId={publication.id}
          isOwner={publication.ownerId === viewer.id}
          endorsed={publication.endorsedByViewer}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-border border-b px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <CalendarDays className="text-ocean size-4" /> Confirmed dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {publication.events.length > 0 ? (
                publication.events.map((event, index) => (
                  <div
                    key={`${event.title}-${event.starts_at ?? event.start_date}-${index}`}
                    className="border-border flex items-start justify-between gap-4 border-b px-5 py-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-navy text-sm font-bold">{event.title}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {eventDate(event)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white text-[9px]">
                      {event.event_type.replaceAll("_", " ")}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground p-8 text-center text-sm">
                  No confirmed dates were published.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-border border-b px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <Users className="text-ocean size-4" /> Course staff
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              {publication.people.length > 0 ? (
                publication.people.map((person) => (
                  <div key={`${person.name}-${person.role}`} className="border-border rounded-xl border p-4">
                    <p className="text-navy text-sm font-bold">{person.name}</p>
                    <p className="text-ocean mt-1 text-[10px] font-semibold capitalize">
                      {person.role.replaceAll("_", " ")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No course staff were published.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <GraduationCap className="text-ocean size-4" /> Grading structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {publication.categories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{category.name}</span>
                    <span className="font-mono font-bold">
                      {Number(category.weight_percent)}%
                    </span>
                  </div>
                  <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-ocean h-full rounded-full"
                      style={{ width: `${Number(category.weight_percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

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

          <PolicyNotes
            policies={publication.policies.map((policy) => policy.description)}
          />
        </aside>
      </div>
    </main>
  );
}
