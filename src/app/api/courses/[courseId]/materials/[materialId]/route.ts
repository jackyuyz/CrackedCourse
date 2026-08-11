import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { materialUpdateSchema } from "@/lib/learning-units";

type RouteContext = { params: Promise<{ courseId: string; materialId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to edit course material.", 401);
  const parsed = materialUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || !Object.keys(parsed.data).length) {
    return errorResponse("INVALID_REQUEST", "That material change is invalid.", 400);
  }
  const { courseId, materialId } = await params;
  if (parsed.data.learningUnitId) {
    const { data: unit } = await session.supabase
      .from("learning_units")
      .select("id")
      .eq("id", parsed.data.learningUnitId)
      .eq("course_id", courseId)
      .eq("owner_id", session.userId)
      .maybeSingle();
    if (!unit) return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  }
  const update = {
    ...(parsed.data.title ? { title: parsed.data.title } : {}),
    ...(parsed.data.learningUnitId !== undefined
      ? { learning_unit_id: parsed.data.learningUnitId }
      : {}),
    ...(parsed.data.isHidden !== undefined ? { is_hidden: parsed.data.isHidden } : {}),
  };
  const { data: material, error } = await session.supabase
    .from("course_materials")
    .update(update)
    .eq("id", materialId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .select("id,title,kind,material_type,learning_unit_id,external_url,original_name,size_bytes,is_hidden")
    .maybeSingle();
  if (error) return errorResponse("UPDATE_FAILED", "We couldn’t save that material. Try again.", 500);
  if (!material) return errorResponse("NOT_FOUND", "Course material not found.", 404);
  return Response.json({ material }, { headers: { "Cache-Control": "private, no-store" } });
}
