import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const patchScoreSchema = z.object({
  scorePercent: z.number().min(0).max(999.99).nullable(),
});

type RouteContext = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to update grades.", 401);
  }

  const parsed = patchScoreSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "INVALID_GRADE_ENTRY",
      "Enter a percentage from 0 to 999.99.",
      400,
    );
  }

  const { categoryId } = await params;
  const { data, error } = await session.supabase
    .from("grading_categories")
    .update({ student_score_percent: parsed.data.scorePercent })
    .eq("id", categoryId)
    .eq("owner_id", session.userId)
    .eq("is_hidden", false)
    .select("id,student_score_percent")
    .maybeSingle();

  if (error) {
    return errorResponse(
      "GRADE_SAVE_FAILED",
      "That grade wasn’t saved. Try again.",
      500,
    );
  }
  if (!data) {
    return errorResponse("NOT_FOUND", "Grade category not found.", 404);
  }

  return Response.json(
    {
      category: {
        id: data.id,
        scorePercent:
          data.student_score_percent == null
            ? null
            : Number(data.student_score_percent),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
