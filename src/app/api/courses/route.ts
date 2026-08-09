import { revalidatePath } from "next/cache";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { PRIMARY_TIME_ZONE } from "@/lib/time-zone";

const createCourseSchema = z.object({
  code: z.string().trim().max(40).nullable().optional(),
  title: z.string().trim().max(180).nullable().optional(),
  termName: z.string().trim().max(80).nullable().optional(),
  timeZone: z.literal(PRIMARY_TIME_ZONE).default(PRIMARY_TIME_ZONE),
  colorKey: z.enum(["ocean", "orange", "gold", "navy"]).default("ocean"),
  syllabusSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to create a course.", 401);
  }

  const parsed = createCourseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_REQUEST",
      "Check the course details and try again.",
      400,
    );
  }

  if (parsed.data.syllabusSha256) {
    const { data: existingSource, error: sourceLookupError } =
      await session.supabase
        .from("syllabus_sources")
        .select("id,course_id,original_name,processing_status")
        .eq("owner_id", session.userId)
        .eq("sha256", parsed.data.syllabusSha256)
        .maybeSingle();

    if (sourceLookupError) {
      return errorResponse(
        "SOURCE_LOOKUP_FAILED",
        "We couldn’t check your existing syllabi. Try again.",
        500,
      );
    }

    if (existingSource) {
      const { data: existingCourse, error: courseLookupError } =
        await session.supabase
          .from("courses")
          .select("id,status")
          .eq("id", existingSource.course_id)
          .eq("owner_id", session.userId)
          .maybeSingle();

      if (courseLookupError || !existingCourse) {
        return errorResponse(
          "COURSE_LOOKUP_FAILED",
          "We found the syllabus but couldn’t open its course. Try again.",
          500,
        );
      }

      return Response.json(
        {
          courseId: existingCourse.id,
          courseStatus: existingCourse.status,
          reused: true,
          source: existingSource,
        },
        {
          status: 200,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
  }

  const { data, error } = await session.supabase
    .from("courses")
    .insert({
      owner_id: session.userId,
      code: parsed.data.code ?? null,
      title: parsed.data.title ?? null,
      term_name: parsed.data.termName ?? null,
      time_zone: parsed.data.timeZone,
      color_key: parsed.data.colorKey,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return errorResponse(
      "COURSE_CREATE_FAILED",
      "We couldn’t create the course draft. Try again.",
      500,
    );
  }

  revalidatePath("/(app)", "layout");

  return Response.json(
    { courseId: data.id, courseStatus: "draft", reused: false },
    { status: 201 },
  );
}
