import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FileText, School, Sparkles, ThumbsUp } from "lucide-react";

import { CommunityFilters } from "@/components/community-filters";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/lib/auth/viewer";
import {
  getCommunityPublications,
  getInstitutionById,
} from "@/lib/data/community";

export const metadata: Metadata = { title: "Course community" };

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; q?: string; year?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const params = await searchParams;
  const institutionId = params.school ?? viewer.defaultInstitution?.id ?? null;
  const termYear = /^\d{4}$/.test(params.year ?? "")
    ? Number(params.year)
    : null;
  const [publications, selectedInstitution] = await Promise.all([
    getCommunityPublications(viewer, {
      institutionId,
      query: params.q,
      termYear,
    }),
    institutionId
      ? institutionId === viewer.defaultInstitution?.id
        ? Promise.resolve(viewer.defaultInstitution)
        : getInstitutionById(viewer, institutionId)
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Student community"
        title="Find a course workspace"
        description="Browse structured syllabi shared by signed-in students at U.S. and Canadian schools. Import a copy without changing the original contributor’s workspace."
      />
      <div className="mt-7">
        <CommunityFilters
          institution={selectedInstitution}
          initialQuery={params.q ?? ""}
          initialYear={params.year ?? ""}
        />
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-navy text-lg font-extrabold">
            {selectedInstitution?.name ?? "Community courses"}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {publications.length} published workspace
            {publications.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge variant="outline" className="bg-white">
          <School className="size-3.5" /> Signed-in community
        </Badge>
      </div>

      {publications.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publications.map((publication) => (
            <Link key={publication.id} href={`/community/${publication.id}`}>
              <Card className="hover:border-ocean/35 h-full gap-0 py-0 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Badge className="bg-ocean/10 text-ocean border-0 font-mono text-[10px] shadow-none">
                      {publication.courseCode}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <ThumbsUp className="size-3" />
                      {publication.endorsementCount}
                    </span>
                  </div>
                  <h3 className="text-navy mt-4 text-base font-extrabold tracking-[-0.02em]">
                    {publication.courseTitle}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {publication.termName ?? "Term not specified"} · Shared by{" "}
                    {publication.contributorName}
                  </p>
                  <div className="border-border text-muted-foreground mt-5 flex items-center justify-between border-t pt-4 text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {publication.pageCount ?? "—"} page PDF
                    </span>
                    <span className="text-ocean flex items-center gap-1 font-semibold">
                      Open workspace <BookOpen className="size-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-4 gap-0 py-0 border-dashed shadow-none">
          <CardContent className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <span className="bg-sky/25 text-ocean mx-auto grid size-12 place-items-center rounded-2xl">
                <Sparkles className="size-5" />
              </span>
              <h3 className="text-navy mt-4 font-extrabold">
                No matching course yet
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-5">
                Try a broader search, another term, or publish one of your own
                reviewed courses to start this school’s collection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
