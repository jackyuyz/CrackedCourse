import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return <GradeCalculator initialData={data} demo={viewer.isDemo} />;
}
