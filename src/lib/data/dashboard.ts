import "server-only";

import { format } from "date-fns";

import type { Viewer } from "@/lib/auth/viewer";
import {
  demoCourses,
  demoEvents,
  type AppCourse,
  type AppEvent,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  courses: AppCourse[];
  events: AppEvent[];
}

export interface NavigationCourse {
  id: string;
  code: string;
  color: AppCourse["color"];
  status: AppCourse["status"];
}

const validColors = new Set<AppCourse["color"]>([
  "ocean",
  "orange",
  "gold",
  "navy",
]);

function color(value: unknown): AppCourse["color"] {
  return typeof value === "string" &&
    validColors.has(value as AppCourse["color"])
    ? (value as AppCourse["color"])
    : "ocean";
}

export async function getNavigationCourses(
  viewer: Viewer,
): Promise<NavigationCourse[]> {
  if (viewer.isDemo) {
    return demoCourses.map(({ id, code, color, status }) => ({
      id,
      code,
      color,
      status,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id,code,color_key,status")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(12);

  return (data ?? []).map((course) => ({
    id: course.id,
    code: course.code ?? "Course",
    color: color(course.color_key),
    status: course.status as AppCourse["status"],
  }));
}

export async function getDashboardData(viewer: Viewer): Promise<DashboardData> {
  if (viewer.isDemo) {
    return { courses: demoCourses, events: demoEvents.slice(0, 5) };
  }

  const supabase = await createClient();
  const [courseResult, eventResult] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id,code,title,section,term_name,time_zone,color_key,status,calendar_events(title,start_date,starts_at,status)",
      )
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    supabase
      .from("calendar_events")
      .select(
        "id,course_id,title,event_type,start_date,starts_at,is_all_day,location,source_item_id,courses(code,title,color_key)",
      )
      .eq("status", "confirmed")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(20),
  ]);

  const now = new Date();
  const courseRows = (courseResult.data ?? []) as unknown as Array<{
    id: string;
    code: string | null;
    title: string | null;
    section: string | null;
    term_name: string | null;
    time_zone: string;
    color_key: string;
    status: "draft" | "active" | "archived";
    calendar_events: Array<{
      title: string;
      start_date: string | null;
      starts_at: string | null;
      status: string;
    }>;
  }>;

  const courses = courseRows.map((course) => {
    const next = course.calendar_events
      .filter((event) => event.status === "confirmed")
      .map((event) => ({
        ...event,
        when: new Date(event.starts_at ?? `${event.start_date}T12:00:00`),
      }))
      .filter((event) => event.when >= now)
      .sort((a, b) => a.when.getTime() - b.when.getTime())[0];

    return {
      id: course.id,
      code: course.code ?? "Course",
      title: course.title ?? "Untitled course",
      section: course.section,
      termName: course.term_name ?? "Current term",
      timeZone: course.time_zone,
      color: color(course.color_key),
      status: course.status,
      nextEvent: next?.title ?? null,
      nextEventDate: next ? format(next.when, "MMM d") : null,
      currentGrade: null,
      representedWeight: null,
      unresolvedCount: 0,
    } satisfies AppCourse;
  });

  const eventRows = (eventResult.data ?? []) as unknown as Array<{
    id: string;
    course_id: string;
    title: string;
    event_type: AppEvent["type"];
    start_date: string | null;
    starts_at: string | null;
    is_all_day: boolean;
    location: string | null;
    source_item_id: string | null;
    courses: {
      code: string | null;
      title: string | null;
      color_key: string;
    } | null;
  }>;

  const events = eventRows
    .map((event) => {
      const when = new Date(event.starts_at ?? `${event.start_date}T12:00:00`);
      return {
        id: event.id,
        courseId: event.course_id,
        courseCode: event.courses?.code ?? "Course",
        courseTitle: event.courses?.title ?? "Untitled course",
        courseColor: color(event.courses?.color_key),
        title: event.title,
        type: event.event_type,
        date: format(when, "yyyy-MM-dd"),
        displayDate: format(when, "EEE, MMM d"),
        time: event.is_all_day ? null : format(when, "h:mm a"),
        isAllDay: event.is_all_day,
        location: event.location,
        sourcePage: null,
        sortAt: when,
      };
    })
    .filter((event) => event.sortAt >= now)
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .slice(0, 5)
    .map((event): AppEvent => ({
      id: event.id,
      courseId: event.courseId,
      courseCode: event.courseCode,
      courseTitle: event.courseTitle,
      courseColor: event.courseColor,
      title: event.title,
      type: event.type,
      date: event.date,
      displayDate: event.displayDate,
      time: event.time,
      isAllDay: event.isAllDay,
      location: event.location,
      sourcePage: event.sourcePage,
    }));

  return { courses, events };
}
