import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalendarWorkspace } from "@/components/calendar-workspace";
import { CourseTabs } from "@/components/course-tabs";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth/viewer";
import { getCalendarData } from "@/lib/data/calendar";

export const metadata: Metadata = { title: "Course calendar" };

type PageProps = { params: Promise<{ courseId: string }> };

export default async function CourseCalendarPage({ params }: PageProps) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const { courseId } = await params;
  const data = await getCalendarData(viewer, courseId);
  const course = data.courses[0];
  if (!course) notFound();

  return (
    <main className="mx-auto max-w-[1260px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <header>
        <Badge variant="outline" className="bg-white font-mono text-[10px]">
          {course.code}
        </Badge>
        <h1 className="text-navy mt-3 text-2xl font-extrabold tracking-[-0.04em]">
          {course.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{course.termName}</p>
        <div className="mt-6">
          <CourseTabs courseId={course.id} active="calendar" />
        </div>
      </header>
      <CalendarWorkspace {...data} courseId={course.id} demo={viewer.isDemo} />
    </main>
  );
}
