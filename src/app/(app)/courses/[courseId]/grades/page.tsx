import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseHeader } from "@/components/course-header";
import { GradeCalculator } from "@/components/grade-calculator";
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
      <CourseHeader course={data.course} active="grades" />
      <GradeCalculator initialData={data} demo={viewer.isDemo} />
    </main>
  );
}
