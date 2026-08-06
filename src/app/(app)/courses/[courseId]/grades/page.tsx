import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseTabs } from "@/components/course-tabs";
import { GradeCalculator } from "@/components/grade-calculator";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth/viewer";
import { getGradeWorkspace } from "@/lib/data/grades";

export const metadata: Metadata = { title: "Grade calculator" };

type PageProps = { params: Promise<{ courseId: string }> };

export default async function GradesPage({ params }: PageProps) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getGradeWorkspace(viewer, courseId);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-[1260px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header>
        <Badge variant="outline" className="bg-white font-mono text-[10px]">
          {data.course.code}
        </Badge>
        <h1 className="text-navy mt-3 text-2xl font-extrabold tracking-[-0.04em]">
          {data.course.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {data.course.termName}
        </p>
        <div className="mt-6">
          <CourseTabs courseId={data.course.id} active="grades" />
        </div>
      </header>
      <GradeCalculator initialData={data} demo={viewer.isDemo} />
    </main>
  );
}
