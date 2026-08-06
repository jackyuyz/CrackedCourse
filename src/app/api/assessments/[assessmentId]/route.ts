import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const patchAssessmentSchema = z
  .object({
    earnedPoints: z.number().nonnegative().nullable(),
    maxPoints: z.number().positive().nullable(),
    status: z.enum(["planned", "graded", "excused"]),
  })
  .refine(
    (value) =>
      value.earnedPoints == null ||
      value.maxPoints == null ||
      value.earnedPoints <= value.maxPoints,
    { message: "Extra credit is not supported." },
  )
  .refine(
    (value) =>
      value.status !== "graded" ||
      (value.earnedPoints != null && value.maxPoints != null),
    { message: "A graded assessment needs earned and maximum points." },
  );

type RouteContext = { params: Promise<{ assessmentId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session)
    return errorResponse("UNAUTHORIZED", "Sign in to update grades.", 401);

  const parsed = patchAssessmentSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_GRADE_ENTRY",
      "Check the earned and maximum points.",
      400,
    );
  }
  const { assessmentId } = await params;
  const { data, error } = await session.supabase
    .from("assessments")
    .update({
      earned_points: parsed.data.earnedPoints,
      max_points: parsed.data.maxPoints,
      status: parsed.data.status,
    })
    .eq("id", assessmentId)
    .eq("owner_id", session.userId)
    .select("id,earned_points,max_points,status")
    .single();

  if (error || !data) {
    return errorResponse(
      "GRADE_SAVE_FAILED",
      "That grade wasn’t saved. Try again.",
      500,
    );
  }
  return Response.json({ assessment: data });
}
