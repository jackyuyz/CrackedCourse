import type { Metadata } from "next";

import { CourseUploader } from "@/components/course-uploader";
import { PageHeader } from "@/components/page-header";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Add a course" };

export default async function NewCoursePage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  return (
    <main className="mx-auto max-w-[1040px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="New workspace"
        title="Add a course"
        description="Upload one text-based syllabus PDF. You’ll verify every useful detail before anything is published."
      />
      <CourseUploader demo={viewer.isDemo} />
    </main>
  );
}
