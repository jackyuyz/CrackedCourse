import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import {
  demoCourses,
  demoEvents,
  demoPeople,
  type AppCourse,
  type AppEvent,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export interface CoursePerson {
  name: string;
  role: string;
  email: string | null;
  office: string | null;
  officeHours: string | null;
}

export interface CourseOverviewData {
  course: AppCourse;
  nextEvents: AppEvent[];
  people: CoursePerson[];
  gradingCategories: Array<{ name: string; weightPercent: number }>;
  policyWarnings: string[];
  source: {
    originalName: string;
    importedAt: string;
    status: string;
    pageCount: number | null;
  } | null;
}

export async function getCourseOverview(
  viewer: Viewer,
  courseId: string,
): Promise<CourseOverviewData | null> {
  if (viewer.isDemo) {
    const course =
      demoCourses.find((item) => item.id === courseId) ?? demoCourses[0];
    return {
      course,
      nextEvents: demoEvents
        .filter((event) => event.courseId === course.id)
        .slice(0, 3),
      people: demoPeople,
      gradingCategories: [
        { name: "Written homework", weightPercent: 20 },
        { name: "Programming assignments", weightPercent: 35 },
        { name: "Midterms", weightPercent: 25 },
        { name: "Final exam", weightPercent: 20 },
      ],
      policyWarnings: [
        "The lowest written homework score is dropped. This rule is shown but not applied by the P0 calculator.",
      ],
      source: {
        originalName: "15-122-fall-2026-syllabus.pdf",
        importedAt: "Aug 28, 2026",
        status: "Reviewed and published",
        pageCount: 9,
      },
    };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("courses")
    .select(
      "id,code,title,section,term_name,time_zone,color_key,status,course_people(name,role,email,office_location,office_hours(recurrence_text)),calendar_events(id,title,event_type,start_date,starts_at,is_all_day,location,source_item_id),grading_categories(name,weight_percent,display_order),grading_policies(description,calculator_support),syllabus_sources(original_name,created_at,processing_status,page_count)",
    )
    .eq("id", courseId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!row) return null;

  const course: AppCourse = {
    id: row.id,
    code: row.code ?? "Course",
    title: row.title ?? "Untitled course",
    section: row.section,
    termName: row.term_name ?? "Current term",
    timeZone: row.time_zone,
    color: (["ocean", "orange", "gold", "navy"].includes(row.color_key)
      ? row.color_key
      : "ocean") as AppCourse["color"],
    status: row.status,
    unresolvedCount: 0,
    currentGrade: null,
    representedWeight: null,
  };

  const now = new Date();
  const nextEvents = (row.calendar_events ?? [])
    .map((event) => {
      const date = new Date(event.starts_at ?? `${event.start_date}T12:00:00`);
      return {
        id: event.id,
        courseId: row.id,
        courseCode: course.code,
        courseTitle: course.title,
        courseColor: course.color,
        title: event.title,
        type: event.event_type as AppEvent["type"],
        date: event.start_date ?? date.toISOString().slice(0, 10),
        displayDate: new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(date),
        time: event.is_all_day
          ? null
          : new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(date),
        isAllDay: event.is_all_day,
        location: event.location,
        sourcePage: null,
        sortAt: date,
      };
    })
    .filter((event) => event.sortAt >= now)
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .slice(0, 3)
    .map(
      (event): AppEvent => ({
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
      }),
    );

  const people: CoursePerson[] = (row.course_people ?? []).map((person) => ({
    name: person.name,
    role:
      person.role === "teaching_assistant"
        ? "Teaching assistant"
        : person.role === "instructor"
          ? "Instructor"
          : "Course staff",
    email: person.email,
    office: person.office_location,
    officeHours: person.office_hours?.[0]?.recurrence_text ?? null,
  }));

  const source = row.syllabus_sources?.at(-1);
  return {
    course,
    nextEvents,
    people,
    gradingCategories: (row.grading_categories ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((category) => ({
        name: category.name,
        weightPercent: Number(category.weight_percent),
      })),
    policyWarnings: (row.grading_policies ?? [])
      .filter((policy) => policy.calculator_support === "unsupported")
      .map((policy) => policy.description),
    source: source
      ? {
          originalName: source.original_name,
          importedAt: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(source.created_at)),
          status: source.processing_status,
          pageCount: source.page_count,
        }
      : null,
  };
}
