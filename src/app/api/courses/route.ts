import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const createCourseSchema = z.object({
  code: z.string().trim().max(40).nullable().optional(),
  title: z.string().trim().max(180).nullable().optional(),
  termName: z.string().trim().max(80).nullable().optional(),
  timeZone: z.string().trim().min(1).max(80).default("UTC"),
  colorKey: z.enum(["ocean", "orange", "gold", "navy"]).default("ocean"),
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

  return Response.json({ courseId: data.id }, { status: 201 });
}
