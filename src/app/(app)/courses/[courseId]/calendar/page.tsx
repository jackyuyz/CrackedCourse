import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalendarWorkspace } from "@/components/calendar-workspace";
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
    <CalendarWorkspace {...data} courseId={course.id} demo={viewer.isDemo} />
  );
}
