import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewWorkspace } from "@/components/review-workspace";
import { getViewer } from "@/lib/auth/viewer";
import { getReviewData } from "@/lib/data/review";

export const metadata: Metadata = { title: "Review syllabus" };

type PageProps = { params: Promise<{ courseId: string }> };

export default async function ReviewPage({ params }: PageProps) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getReviewData(viewer, courseId);
  if (!data) notFound();

  return <ReviewWorkspace initialData={data} demo={viewer.isDemo} />;
}
