import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import type {
  CourseEditorData,
  CourseRecordOrigin,
  EditableAssessment,
  EditableCategory,
  EditableEvent,
  EditableOfficeHour,
  EditablePerson,
  EditablePolicy,
} from "@/lib/course-editor";
import { createClient } from "@/lib/supabase/server";

function origin(value: string | null): CourseRecordOrigin {
  return value === "syllabus" || value === "community_import"
    ? value
    : "manual";
}

export async function getCourseEditorData(
  viewer: Viewer,
  courseId: string,
): Promise<CourseEditorData | null> {
  if (viewer.isDemo) return null;

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id,time_zone")
    .eq("id", courseId)
    .eq("owner_id", viewer.id)
    .maybeSingle();
  if (!course) return null;

  const [peopleResult, officeHoursResult, eventsResult, categoriesResult, policiesResult, assessmentsResult, sourcesResult] =
    await Promise.all([
      supabase
        .from("course_people")
        .select("id,name,role,email,office_location,external_profile_url,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("created_at"),
      supabase
        .from("office_hours")
        .select("id,person_id,recurrence_text,day_of_week,start_time,end_time,start_date,end_date,time_zone,location,meeting_url,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("created_at"),
      supabase
        .from("calendar_events")
        .select("id,title,event_type,start_date,end_date,starts_at,ends_at,is_all_day,time_zone,location,status,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("start_date"),
      supabase
        .from("grading_categories")
        .select("id,name,weight_percent,aggregation_mode,is_complete,display_order,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("display_order"),
      supabase
        .from("grading_policies")
        .select("id,kind,description,calculator_support,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("created_at"),
      supabase
        .from("assessments")
        .select("id,name,category_id,due_event_id,earned_points,max_points,expected_percent,status,display_order,origin,is_hidden")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("display_order"),
      supabase
        .from("syllabus_sources")
        .select("id,original_name,page_count,processing_status,created_at")
        .eq("course_id", courseId)
        .eq("owner_id", viewer.id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    courseId,
    courseTimeZone: course.time_zone,
    people: (peopleResult.data ?? []).map(
      (person): EditablePerson => ({
        id: person.id,
        name: person.name,
        role: person.role,
        email: person.email,
        officeLocation: person.office_location,
        externalProfileUrl: person.external_profile_url,
        origin: origin(person.origin),
        isHidden: person.is_hidden,
      }),
    ),
    officeHours: (officeHoursResult.data ?? []).map(
      (officeHour): EditableOfficeHour => ({
        id: officeHour.id,
        personId: officeHour.person_id,
        recurrenceText: officeHour.recurrence_text,
        dayOfWeek: officeHour.day_of_week,
        startTime: officeHour.start_time,
        endTime: officeHour.end_time,
        startDate: officeHour.start_date,
        endDate: officeHour.end_date,
        timeZone: officeHour.time_zone,
        location: officeHour.location,
        meetingUrl: officeHour.meeting_url,
        origin: origin(officeHour.origin),
        isHidden: officeHour.is_hidden,
      }),
    ),
    events: (eventsResult.data ?? []).map((event): EditableEvent => {
      const start = event.starts_at ? new Date(event.starts_at) : null;
      const end = event.ends_at ? new Date(event.ends_at) : null;
      return {
        id: event.id,
        title: event.title,
        type: event.event_type,
        startDate:
          event.start_date ??
          (start
            ? new Intl.DateTimeFormat("en-CA", {
                timeZone: event.time_zone,
              }).format(start)
            : ""),
        endDate: event.end_date,
        startTime: start
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: event.time_zone,
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).format(start)
          : null,
        endTime: end
          ? new Intl.DateTimeFormat("en-GB", {
              timeZone: event.time_zone,
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).format(end)
          : null,
        isAllDay: event.is_all_day,
        location: event.location,
        status: event.status,
        origin: origin(event.origin),
        isHidden: event.is_hidden,
      };
    }),
    categories: (categoriesResult.data ?? []).map(
      (category): EditableCategory => ({
        id: category.id,
        name: category.name,
        weightPercent: Number(category.weight_percent),
        aggregationMode: category.aggregation_mode,
        isComplete: category.is_complete,
        origin: origin(category.origin),
        isHidden: category.is_hidden,
      }),
    ),
    policies: (policiesResult.data ?? []).map(
      (policy): EditablePolicy => ({
        id: policy.id,
        kind: policy.kind as EditablePolicy["kind"],
        description: policy.description,
        calculatorSupport: policy.calculator_support,
        origin: origin(policy.origin),
        isHidden: policy.is_hidden,
      }),
    ),
    assessments: (assessmentsResult.data ?? []).map(
      (assessment): EditableAssessment => ({
        id: assessment.id,
        name: assessment.name,
        categoryId: assessment.category_id,
        dueEventId: assessment.due_event_id,
        earnedPoints:
          assessment.earned_points == null ? null : Number(assessment.earned_points),
        maxPoints:
          assessment.max_points == null ? null : Number(assessment.max_points),
        expectedPercent:
          assessment.expected_percent == null
            ? null
            : Number(assessment.expected_percent),
        status: assessment.status,
        origin: origin(assessment.origin),
        isHidden: assessment.is_hidden,
      }),
    ),
    sources: (sourcesResult.data ?? []).map((source) => ({
      id: source.id,
      originalName: source.original_name,
      pageCount: source.page_count,
      processingStatus: source.processing_status,
      createdAt: source.created_at,
    })),
  };
}
