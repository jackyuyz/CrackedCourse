import { formatInTimeZone } from "date-fns-tz";

import type { AppCourse, AppEvent } from "@/lib/demo-data";

const eventTypes = new Set<AppEvent["type"]>([
  "exam",
  "quiz",
  "assignment",
  "project",
  "office_hour",
  "class_session",
  "deadline",
  "other",
]);

interface CommunityCalendarPublication {
  id: string;
  courseCode: string;
  courseTitle: string;
  section: string | null;
  termName: string | null;
  timeZone: string;
  events: Array<{
    title: string;
    event_type: string;
    starts_at: string | null;
    start_date: string | null;
    is_all_day: boolean;
    time_zone: string | null;
    location: string | null;
    status: string | null;
  }>;
}

function eventType(value: string): AppEvent["type"] {
  return eventTypes.has(value as AppEvent["type"])
    ? (value as AppEvent["type"])
    : "other";
}

export function buildCommunityCalendarData(
  publication: CommunityCalendarPublication,
): { courses: AppCourse[]; events: AppEvent[] } {
  const course: AppCourse = {
    id: publication.id,
    code: publication.courseCode,
    title: publication.courseTitle,
    section: publication.section,
    termName: publication.termName ?? "Term not specified",
    timeZone: publication.timeZone,
    color: "ocean",
    status: "active",
    unresolvedCount: 0,
  };

  const events = publication.events.flatMap<AppEvent>((event, index) => {
    if (event.status && event.status !== "confirmed") return [];

    const timeZone = event.time_zone || publication.timeZone;
    const date = event.is_all_day
      ? event.start_date
      : event.starts_at
        ? formatInTimeZone(new Date(event.starts_at), timeZone, "yyyy-MM-dd")
        : null;
    if (!date) return [];

    return [
      {
        id: `community-${publication.id}-${index}`,
        courseId: publication.id,
        courseCode: publication.courseCode,
        courseTitle: publication.courseTitle,
        courseColor: "ocean",
        title: event.title,
        type: eventType(event.event_type),
        date,
        displayDate: event.is_all_day
          ? formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEE, MMM d")
          : formatInTimeZone(
              new Date(event.starts_at!),
              timeZone,
              "EEE, MMM d",
            ),
        time: event.is_all_day
          ? null
          : formatInTimeZone(new Date(event.starts_at!), timeZone, "h:mm a"),
        isAllDay: event.is_all_day,
        location: event.location,
        sourcePage: null,
      },
    ];
  });

  return { courses: [course], events };
}
