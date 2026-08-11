import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import type { Viewer } from "@/lib/auth/viewer";
import {
  demoCourses,
  demoEvents,
  type AppCourse,
  type AppEvent,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface CalendarData {
  courses: AppCourse[];
  events: AppEvent[];
}

function safeColor(value: string): AppCourse["color"] {
  return (
    ["ocean", "orange", "gold", "navy"].includes(value) ? value : "ocean"
  ) as AppCourse["color"];
}

export async function getCalendarData(
  viewer: Viewer,
  courseId?: string,
): Promise<CalendarData> {
  if (viewer.isDemo) {
    return {
      courses: courseId
        ? demoCourses.filter((course) => course.id === courseId)
        : demoCourses,
      events: courseId
        ? demoEvents.filter((event) => event.courseId === courseId)
        : demoEvents,
    };
  }

  const supabase = await createClient();
  let eventQuery = supabase
    .from("calendar_events")
    .select(
      "id,course_id,title,event_type,start_date,starts_at,is_all_day,time_zone,location,source_item_id,courses(code,title,color_key)",
    )
    .eq("owner_id", viewer.id)
    .eq("is_hidden", false)
    .eq("status", "confirmed");
  if (courseId) eventQuery = eventQuery.eq("course_id", courseId);

  let courseQuery = supabase
    .from("courses")
    .select("id,code,title,section,term_name,time_zone,color_key,status")
    .eq("owner_id", viewer.id)
    .neq("status", "archived");
  if (courseId) courseQuery = courseQuery.eq("id", courseId);

  const [courseResult, eventResult] = await Promise.all([
    courseQuery,
    eventQuery,
  ]);
  const courses: AppCourse[] = (courseResult.data ?? []).map((course) => ({
    id: course.id,
    code: course.code ?? "Course",
    title: course.title ?? "Untitled course",
    section: course.section,
    termName: course.term_name ?? "Current term",
    timeZone: course.time_zone,
    color: safeColor(course.color_key),
    status: course.status,
    unresolvedCount: 0,
  }));

  const events: AppEvent[] = (eventResult.data ?? []).map((event) => {
    const relation = event.courses as unknown as {
      code: string | null;
      title: string | null;
      color_key: string;
    } | null;
    const date = event.is_all_day
      ? event.start_date!
      : formatInTimeZone(
          new Date(event.starts_at!),
          event.time_zone,
          "yyyy-MM-dd",
        );
    const displayDate = event.is_all_day
      ? formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEE, MMM d")
      : formatInTimeZone(
          new Date(event.starts_at!),
          event.time_zone,
          "EEE, MMM d",
        );

    return {
      id: event.id,
      courseId: event.course_id,
      courseCode: relation?.code ?? "Course",
      courseTitle: relation?.title ?? "Untitled course",
      courseColor: safeColor(relation?.color_key ?? "ocean"),
      title: event.title,
      type: event.event_type as AppEvent["type"],
      date,
      displayDate,
      time: event.is_all_day
        ? null
        : formatInTimeZone(
            new Date(event.starts_at!),
            event.time_zone,
            "h:mm a",
          ),
      isAllDay: event.is_all_day,
      location: event.location,
      sourcePage: null,
    };
  });

  return { courses, events };
}
