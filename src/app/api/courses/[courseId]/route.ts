import { revalidatePath } from "next/cache";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { isValidTimeZone } from "@/lib/time-zone";

const dateSchema = z.iso.date().nullable();

const updateCourseSchema = z
  .object({
    code: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(180),
    section: z.string().trim().max(80).nullable(),
    termName: z.string().trim().max(80).nullable(),
    termStart: dateSchema,
    termEnd: dateSchema,
    timeZone: z.string().trim().min(1).max(80).refine(isValidTimeZone),
    colorKey: z.enum(["ocean", "orange", "gold", "navy"]),
    status: z.enum(["active", "archived"]),
  })
  .refine(
    (value) =>
      !value.termStart ||
      !value.termEnd ||
      value.termEnd.localeCompare(value.termStart) >= 0,
    { message: "The term end date must not be before its start date." },
  );

type RouteContext = { params: Promise<{ courseId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to update a course.", 401);
  }

  const parsed = updateCourseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_COURSE_SETTINGS",
      "Check the course details, dates, and time zone.",
      400,
    );
  }

  const { courseId } = await params;
  const { data: course, error } = await session.supabase
    .from("courses")
    .update({
      code: parsed.data.code,
      title: parsed.data.title,
      section: parsed.data.section || null,
      term_name: parsed.data.termName || null,
      term_start: parsed.data.termStart,
      term_end: parsed.data.termEnd,
      time_zone: parsed.data.timeZone,
      color_key: parsed.data.colorKey,
      status: parsed.data.status,
    })
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .select(
      "id,code,title,section,term_name,term_start,term_end,time_zone,color_key,status,updated_at",
    )
    .maybeSingle();

  if (error) {
    return errorResponse(
      "COURSE_UPDATE_FAILED",
      "We couldn’t save this course. Try again.",
      500,
    );
  }
  if (!course) {
    return errorResponse("NOT_FOUND", "Course not found.", 404);
  }

  revalidatePath("/(app)", "layout");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/dashboard");

  return Response.json(
    { course },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to delete a course.", 401);
  }

  const { courseId } = await params;
  const { data: sources, error: sourceError } = await session.supabase
    .from("syllabus_sources")
    .select("storage_path")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId);

  if (sourceError) {
    return errorResponse(
      "COURSE_DELETE_FAILED",
      "We couldn’t prepare this course for deletion. Try again.",
      500,
    );
  }

  const { data: deletedCourse, error: deleteError } = await session.supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return errorResponse(
      "COURSE_DELETE_FAILED",
      "We couldn’t delete this course. Try again.",
      500,
    );
  }

  revalidatePath("/(app)", "layout");

  if (!deletedCourse) {
    return Response.json(
      { courseId, deleted: false, alreadyMissing: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const storagePaths = (sources ?? [])
    .map((source) => source.storage_path)
    .filter((path): path is string => Boolean(path));
  let storageCleanupPending = false;

  for (const storagePath of storagePaths) {
    const { error } = await session.supabase.storage
      .from("syllabi")
      .remove([storagePath]);
    if (error) storageCleanupPending = true;
  }

  return Response.json(
    {
      courseId,
      deleted: true,
      storageCleanupPending,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
