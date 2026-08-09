import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download } from "lucide-react";

import { CourseActionsMenu } from "@/components/course-actions-menu";
import { CourseHeader } from "@/components/course-header";
import { CourseWorkspaceFrame } from "@/components/course-workspace-frame";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { getCourseIdentity } from "@/lib/data/course";

export default async function CourseWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const course = await getCourseIdentity(viewer, courseId);
  if (!course) notFound();

  return (
    <CourseWorkspaceFrame
      header={
        <CourseHeader
          course={course}
          actions={
            <>
              <Button asChild variant="outline" className="h-9">
                <Link
                  href={
                    viewer.isDemo
                      ? `/courses/${course.id}/calendar`
                      : `/api/calendars/export.ics?courseId=${course.id}`
                  }
                >
                  {viewer.isDemo ? (
                    <CalendarDays className="size-4" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {viewer.isDemo ? "Open calendar" : "Export .ics"}
                </Link>
              </Button>
              <CourseActionsMenu course={course} readOnly={viewer.isDemo} />
            </>
          }
        />
      }
    >
      {children}
    </CourseWorkspaceFrame>
  );
}
