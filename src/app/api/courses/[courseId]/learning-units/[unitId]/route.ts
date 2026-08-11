import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { learningUnitUpdateSchema } from "@/lib/learning-units";

type RouteContext = { params: Promise<{ courseId: string; unitId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to edit a learning unit.", 401);
  const parsed = learningUnitUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse("INVALID_REQUEST", "That learning-unit change is invalid.", 400);
  }
  const { courseId, unitId } = await params;
  const update = {
    ...(parsed.data.title ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description?.trim() || null }
      : {}),
    ...(parsed.data.isHidden !== undefined ? { is_hidden: parsed.data.isHidden } : {}),
  };
  if (!Object.keys(update).length) {
    return errorResponse("INVALID_REQUEST", "Choose a learning-unit change to save.", 400);
  }
  const { data: unit, error } = await session.supabase
    .from("learning_units")
    .update(update)
    .eq("id", unitId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .select("id,title,description,display_order,is_hidden")
    .maybeSingle();
  if (error) return errorResponse("UPDATE_FAILED", "We couldn’t save that learning unit. Try again.", 500);
  if (!unit) return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  return Response.json({ unit }, { headers: { "Cache-Control": "private, no-store" } });
}
