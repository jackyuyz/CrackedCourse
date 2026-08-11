import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseDataEditor } from "@/components/course-data-editor";
import { getViewer } from "@/lib/auth/viewer";
import { getCourseEditorData } from "@/lib/data/course-editor";

export const metadata: Metadata = { title: "Edit course data" };

type PageProps = { params: Promise<{ courseId: string }> };

export default async function EditCourseDataPage({ params }: PageProps) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getCourseEditorData(viewer, courseId);
  if (!data) notFound();

  return <CourseDataEditor initialData={data} />;
}
