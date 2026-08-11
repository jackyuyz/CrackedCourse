import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { learningUnitReorderSchema } from "@/lib/learning-units";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to reorder learning units.", 401);
  const parsed = learningUnitReorderSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || new Set(parsed.data.unitIds).size !== parsed.data.unitIds.length) {
    return errorResponse("INVALID_REQUEST", "That learning-unit order is invalid.", 400);
  }
  const { courseId } = await params;
  const { data: units, error: lookupError } = await session.supabase
    .from("learning_units")
    .select("id")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .eq("is_hidden", false)
    .order("display_order");
  if (lookupError) return errorResponse("LOOKUP_FAILED", "We couldn’t load your learning units. Try again.", 500);
  const currentIds = (units ?? []).map((unit) => unit.id);
  if (
    currentIds.length !== parsed.data.unitIds.length ||
    currentIds.some((id) => !parsed.data.unitIds.includes(id))
  ) {
    return errorResponse("INVALID_REQUEST", "Refresh the page before reordering learning units.", 409);
  }
  const results = await Promise.all(
    parsed.data.unitIds.map((id, displayOrder) =>
      session.supabase
        .from("learning_units")
        .update({ display_order: displayOrder })
        .eq("id", id)
        .eq("course_id", courseId)
        .eq("owner_id", session.userId),
    ),
  );
  if (results.some((result) => result.error)) {
    return errorResponse("REORDER_FAILED", "We couldn’t reorder learning units. Try again.", 500);
  }
  return Response.json({ unitIds: parsed.data.unitIds }, { headers: { "Cache-Control": "private, no-store" } });
}
