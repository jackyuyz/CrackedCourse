import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearningWorkspace } from "@/components/learning-workspace";
import { getViewer } from "@/lib/auth/viewer";
import { getLearningWorkspace } from "@/lib/data/learning-units";

export const metadata: Metadata = { title: "Learning units" };

export default async function LearningUnitsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getLearningWorkspace(viewer, courseId);
  if (!data) notFound();
  return <LearningWorkspace initialData={data} demo={viewer.isDemo} />;
}
