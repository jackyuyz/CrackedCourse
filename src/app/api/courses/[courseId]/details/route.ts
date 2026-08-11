import { revalidatePath } from "next/cache";

import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { isValidTimeZone } from "@/lib/time-zone";

const idSchema = z.uuid();
const dateSchema = z.iso.date().nullable();
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable();
const textSchema = z.string().trim().max(1_000).nullable();
const originSchema = z.enum(["syllabus", "manual", "community_import"]);
const hiddenSchema = z.boolean();

const personSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["instructor", "teaching_assistant", "other"]),
  email: z.string().email().nullable(),
  officeLocation: textSchema,
  externalProfileUrl: z.string().url().nullable(),
  origin: originSchema,
  isHidden: hiddenSchema,
});

const officeHourSchema = z
  .object({
    id: idSchema.optional(),
    personId: idSchema.nullable(),
    recurrenceText: textSchema,
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    startTime: timeSchema,
    endTime: timeSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    timeZone: z.string().trim().max(80).nullable(),
    location: textSchema,
    meetingUrl: z.string().url().nullable(),
    origin: originSchema,
    isHidden: hiddenSchema,
  })
  .refine(
    (item) =>
      !item.startTime || !item.endTime || item.endTime.localeCompare(item.startTime) > 0,
    { message: "Office hour end time must follow its start time." },
  )
  .refine(
    (item) =>
      !item.startDate || !item.endDate || item.endDate.localeCompare(item.startDate) >= 0,
    { message: "Office hour end date must not precede its start date." },
  )
  .refine(
    (item) => !item.timeZone || isValidTimeZone(item.timeZone),
    { message: "Use a valid IANA time zone for office hours." },
  );

const eventSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().trim().min(1).max(180),
    type: z.enum([
      "exam",
      "quiz",
      "assignment",
      "project",
      "office_hour",
      "class_session",
      "deadline",
      "other",
    ]),
    startDate: z.iso.date(),
    endDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    isAllDay: z.boolean(),
    location: textSchema,
    status: z.enum(["confirmed", "cancelled"]),
    origin: originSchema,
    isHidden: hiddenSchema,
  })
  .refine(
    (item) => item.isAllDay || item.startTime !== null,
    { message: "Timed events need a start time." },
  )
  .refine(
    (item) =>
      !item.endDate || item.endDate.localeCompare(item.startDate) >= 0,
    { message: "Event end date must not precede its start date." },
  );

const categorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(120),
  weightPercent: z.number().min(0).max(100),
  aggregationMode: z.enum(["points", "equal", "custom"]),
  isComplete: z.boolean(),
  origin: originSchema,
  isHidden: hiddenSchema,
});

const policySchema = z.object({
  id: idSchema.optional(),
  kind: z.enum([
    "drop_lowest",
    "replacement",
    "curve",
    "extra_credit",
    "attendance",
    "other",
  ]),
  description: z.string().trim().min(1).max(1_000),
  calculatorSupport: z.enum(["unsupported", "supported"]),
  origin: originSchema,
  isHidden: hiddenSchema,
});

const assessmentSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1).max(180),
    categoryId: idSchema,
    dueEventId: idSchema.nullable(),
    earnedPoints: z.number().min(0).nullable(),
    maxPoints: z.number().positive().nullable(),
    expectedPercent: z.number().min(0).max(100).nullable(),
    status: z.enum(["planned", "graded", "excused"]),
    origin: originSchema,
    isHidden: hiddenSchema,
  })
  .refine(
    (item) =>
      item.status !== "graded" ||
      (item.earnedPoints !== null && item.maxPoints !== null),
    { message: "A graded assessment needs earned and maximum points." },
  )
  .refine(
    (item) =>
      item.earnedPoints === null ||
      item.maxPoints === null ||
      item.earnedPoints <= item.maxPoints,
    { message: "Earned points cannot exceed the maximum points." },
  );

const detailsSchema = z.object({
  people: z.array(personSchema).max(100),
  officeHours: z.array(officeHourSchema).max(100),
  events: z.array(eventSchema).max(500),
  categories: z.array(categorySchema).max(100),
  policies: z.array(policySchema).max(100),
  assessments: z.array(assessmentSchema).max(500),
});

type RouteContext = { params: Promise<{ courseId: string }> };

function eventValues(
  item: z.infer<typeof eventSchema>,
  timeZone: string,
) {
  if (item.isAllDay) {
    return {
      starts_at: null,
      ends_at: null,
      start_date: item.startDate,
      end_date: item.endDate,
      is_all_day: true,
    };
  }

  const startsAt = fromZonedTime(
    `${item.startDate}T${item.startTime}:00`,
    timeZone,
  ).toISOString();
  const endsAt = item.endTime
    ? fromZonedTime(
        `${item.endDate ?? item.startDate}T${item.endTime}:00`,
        timeZone,
      ).toISOString()
    : null;
  return {
    starts_at: startsAt,
    ends_at: endsAt,
    start_date: null,
    end_date: null,
    is_all_day: false,
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to edit this course.", 401);
  }
  const parsed = detailsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_COURSE_DATA",
      "Check the course records, dates, and grade values.",
      400,
    );
  }

  const { courseId } = await params;
  const { data: course, error: courseError } = await session.supabase
    .from("courses")
    .select("id,time_zone")
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (courseError || !course) {
    return errorResponse("NOT_FOUND", "Course not found.", 404);
  }

  const [people, events, categories] = await Promise.all([
    session.supabase
      .from("course_people")
      .select("id")
      .eq("course_id", courseId)
      .eq("owner_id", session.userId),
    session.supabase
      .from("calendar_events")
      .select("id")
      .eq("course_id", courseId)
      .eq("owner_id", session.userId),
    session.supabase
      .from("grading_categories")
      .select("id")
      .eq("course_id", courseId)
      .eq("owner_id", session.userId),
  ]);
  if (people.error || events.error || categories.error) {
    return errorResponse(
      "COURSE_DATA_LOOKUP_FAILED",
      "We couldn’t prepare this course for editing. Try again.",
      500,
    );
  }
  const personIds = new Set((people.data ?? []).map((item) => item.id));
  const eventIds = new Set((events.data ?? []).map((item) => item.id));
  const categoryIds = new Set((categories.data ?? []).map((item) => item.id));
  const referencesAreValid =
    parsed.data.officeHours.every(
      (item) => !item.personId || personIds.has(item.personId),
    ) &&
    parsed.data.assessments.every(
      (item) =>
        categoryIds.has(item.categoryId) &&
        (!item.dueEventId || eventIds.has(item.dueEventId)),
    );
  if (!referencesAreValid) {
    return errorResponse(
      "INVALID_COURSE_REFERENCE",
      "Save the linked person, event, or grade category before referencing it.",
      400,
    );
  }

  try {
    for (const item of parsed.data.people) {
      const values = {
        name: item.name,
        role: item.role,
        email: item.email,
        office_location: item.officeLocation,
        external_profile_url: item.externalProfileUrl,
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("course_people")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("course_people").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }

    for (const item of parsed.data.officeHours) {
      const values = {
        person_id: item.personId,
        recurrence_text: item.recurrenceText,
        day_of_week: item.dayOfWeek,
        start_time: item.startTime,
        end_time: item.endTime,
        start_date: item.startDate,
        end_date: item.endDate,
        time_zone: item.timeZone ?? course.time_zone,
        location: item.location,
        meeting_url: item.meetingUrl,
        is_calendar_ready: Boolean(
          item.dayOfWeek !== null &&
            item.startTime &&
            item.startDate &&
            item.endDate,
        ),
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("office_hours")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("office_hours").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }

    for (const item of parsed.data.events) {
      const values = {
        title: item.title,
        event_type: item.type,
        ...eventValues(item, course.time_zone),
        time_zone: course.time_zone,
        location: item.location,
        status: item.status,
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("calendar_events")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("calendar_events").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }

    for (const [index, item] of parsed.data.categories.entries()) {
      const values = {
        name: item.name,
        weight_percent: item.weightPercent,
        aggregation_mode: item.aggregationMode,
        is_complete: item.isComplete,
        display_order: index,
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("grading_categories")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("grading_categories").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }

    for (const item of parsed.data.policies) {
      const values = {
        kind: item.kind,
        description: item.description,
        calculator_support: item.calculatorSupport,
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("grading_policies")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("grading_policies").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }

    for (const [index, item] of parsed.data.assessments.entries()) {
      const values = {
        name: item.name,
        category_id: item.categoryId,
        due_event_id: item.dueEventId,
        earned_points: item.earnedPoints,
        max_points: item.maxPoints,
        expected_percent: item.expectedPercent,
        status: item.status,
        display_order: index,
        is_hidden: item.isHidden,
      };
      const query = item.id
        ? session.supabase
            .from("assessments")
            .update(values)
            .eq("id", item.id)
            .eq("course_id", courseId)
            .eq("owner_id", session.userId)
        : session.supabase.from("assessments").insert({
            ...values,
            course_id: courseId,
            owner_id: session.userId,
            origin: "manual",
          });
      const { error } = await query;
      if (error) throw error;
    }
  } catch {
    return errorResponse(
      "COURSE_DATA_SAVE_FAILED",
      "We couldn’t save all course records. Refresh to see any changes that were saved.",
      500,
    );
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/calendar`);
  revalidatePath(`/courses/${courseId}/grades`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  return Response.json(
    { saved: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
