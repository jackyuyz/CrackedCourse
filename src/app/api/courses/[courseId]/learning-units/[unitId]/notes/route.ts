import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { learningUnitNoteInputSchema } from "@/lib/learning-units";

type RouteContext = { params: Promise<{ courseId: string; unitId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) return errorResponse("UNAUTHORIZED", "Sign in to save a note.", 401);
  const parsed = learningUnitNoteInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return errorResponse("INVALID_REQUEST", "That note is too long or invalid.", 400);
  const { courseId, unitId } = await params;
  const { data: unit } = await session.supabase
    .from("learning_units")
    .select("id")
    .eq("id", unitId)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!unit) return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  const { data: note, error } = await session.supabase
    .from("learning_unit_notes")
    .upsert(
      {
        learning_unit_id: unitId,
        owner_id: session.userId,
        visibility: parsed.data.visibility,
        body_markdown: parsed.data.bodyMarkdown,
      },
      { onConflict: "learning_unit_id,visibility" },
    )
    .select("id,visibility,body_markdown,updated_at")
    .single();
  if (error || !note) return errorResponse("SAVE_FAILED", "We couldn’t save that note. Try again.", 500);
  return Response.json({ note }, { headers: { "Cache-Control": "private, no-store" } });
}
