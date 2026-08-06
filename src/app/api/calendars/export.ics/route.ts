import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { createIcsCalendar } from "@/lib/calendar/ics";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session)
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to export your calendar.",
      401,
    );

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  const eventTypes = url.searchParams
    .get("eventTypes")
    ?.split(",")
    .filter(Boolean);

  let query = session.supabase
    .from("calendar_events")
    .select(
      "id,title,event_type,starts_at,ends_at,start_date,end_date,is_all_day,time_zone,location,notes,rrule,ical_uid,updated_at,courses(code,title)",
    )
    .eq("owner_id", session.userId)
    .eq("status", "confirmed");
  if (courseId) query = query.eq("course_id", courseId);
  if (eventTypes?.length) query = query.in("event_type", eventTypes);

  const { data, error } = await query;
  if (error)
    return errorResponse(
      "CALENDAR_EXPORT_FAILED",
      "We couldn’t export this calendar.",
      500,
    );

  const rows = data ?? [];
  const firstCourse = rows[0]?.courses as unknown as {
    code: string | null;
    title: string | null;
  } | null;
  const name = courseId
    ? [firstCourse?.code, firstCourse?.title].filter(Boolean).join(" · ") ||
      "Course calendar"
    : "CrackedCourse · All courses";
  const calendar = createIcsCalendar(
    rows.map((event) => ({
      uid: event.ical_uid,
      title: event.title,
      description: event.notes,
      location: event.location,
      isAllDay: event.is_all_day,
      startDate: event.start_date,
      endDate: event.end_date,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      timeZone: event.time_zone,
      rrule: event.rrule,
      updatedAt: event.updated_at,
    })),
    { name },
  );

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cracked-course.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
