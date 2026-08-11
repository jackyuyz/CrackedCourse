import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { learningUnitInputSchema } from "@/lib/learning-units";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to add a learning unit.", 401);
  }
  const parsed = learningUnitInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse("INVALID_REQUEST", "Enter a learning-unit title.", 400);
  }
  const { courseId } = await params;
  const { data: course } = await session.supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!course) return errorResponse("NOT_FOUND", "Course not found.", 404);

  const { data: latest } = await session.supabase
    .from("learning_units")
    .select("display_order")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: unit, error } = await session.supabase
    .from("learning_units")
    .insert({
      course_id: courseId,
      owner_id: session.userId,
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      display_order: (latest?.display_order ?? -1) + 1,
    })
    .select("id,title,description,display_order,is_hidden")
    .single();
  if (error || !unit) {
    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return errorResponse(
        "LEARNING_UNITS_NOT_MIGRATED",
        "Learning Units has not been set up on this database yet. Apply migration 20260811172656_learning_units_and_notes, then try again.",
        503,
      );
    }
    return errorResponse("CREATE_FAILED", "We couldn’t add that learning unit. Try again.", 500);
  }
  return Response.json({ unit }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
